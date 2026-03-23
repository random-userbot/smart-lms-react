"""
Smart LMS - Quizzes Router
Quiz CRUD, AI generation, attempts, anti-cheating, grading
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.database import get_db
from app.models.models import (
    User, UserRole, Quiz, QuizAttempt, Lecture, Course, Enrollment, Notification, NotificationType
)
from app.middleware.auth import get_current_user, require_teacher_or_admin
from app.services.debug_logger import debug_logger
from app.services.youtube_service import get_video_transcript
from app.services.quiz_generator_service import generate_quiz_questions

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])


# ─── Schemas ─────────────────────────────────────────────

class QuizQuestion(BaseModel):
    type: str = "mcq"  # mcq, short_answer, true_false, fill_blank
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    points: int = 1
    icap_level: str = "active"  # passive, active, constructive, interactive
    explanation: Optional[str] = None


class QuizCreate(BaseModel):
    lecture_id: str
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    questions: List[QuizQuestion]
    time_limit: int = 600
    is_published: bool = True
    anti_cheat_enabled: bool = True
    webcam_required: bool = True


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[List[QuizQuestion]] = None
    time_limit: Optional[int] = None
    is_published: Optional[bool] = None
    anti_cheat_enabled: Optional[bool] = None


class QuizResponse(BaseModel):
    id: str
    lecture_id: str
    title: str
    description: Optional[str]
    questions: List[Dict]
    time_limit: int
    is_published: bool
    anti_cheat_enabled: bool
    webcam_required: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QuizAttemptSubmit(BaseModel):
    quiz_id: str
    answers: Dict[str, str]  # {question_index: answer}
    violations: List[Dict[str, Any]] = []
    engagement_data: Optional[Dict] = None
    started_at: str
    time_spent: int = 0  # seconds


class QuizAttemptResponse(BaseModel):
    id: str
    quiz_id: str
    score: float
    max_score: float
    percentage: float
    violations: List[Dict]
    integrity_score: float
    answers: Dict
    correct_answers: Dict
    completed_at: datetime

    class Config:
        from_attributes = True


class AIQuizGenerateRequest(BaseModel):
    lecture_id: str
    num_questions: int = 10
    difficulty: str = "medium"  # easy, medium, hard
    include_icap: bool = True


class AIQuizRefineRequest(BaseModel):
    lecture_id: str
    current_questions: List[Dict]
    feedback: str


# ─── Routes ──────────────────────────────────────────────

@router.get("/lecture/{lecture_id}", response_model=List[QuizResponse])
async def get_lecture_quizzes(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all quizzes for a lecture"""
    query = select(Quiz).where(Quiz.lecture_id == lecture_id)
    if current_user.role == UserRole.STUDENT:
        query = query.where(Quiz.is_published == True)

    result = await db.execute(query)
    quizzes = result.scalars().all()

    responses = []
    for q in quizzes:
        quiz_dict = QuizResponse.model_validate(q)
        # Strip correct answers for students
        if current_user.role == UserRole.STUDENT:
            for question in quiz_dict.questions:
                question.pop("correct_answer", None)
                question.pop("explanation", None)
        responses.append(quiz_dict)

    return responses


@router.get("/mine")
async def get_my_quizzes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all quizzes visible to the current user.

    Students receive quizzes from their enrolled courses only.
    Teachers/Admin receive all quizzes.
    """
    query = (
        select(Quiz, Lecture.title, Course.title)
        .join(Lecture, Lecture.id == Quiz.lecture_id)
        .join(Course, Course.id == Lecture.course_id)
        .order_by(desc(Quiz.created_at))
    )

    if current_user.role == UserRole.STUDENT:
        query = (
            query.join(Enrollment, Enrollment.course_id == Course.id)
            .where(
                Enrollment.student_id == current_user.id,
                Quiz.is_published == True,
            )
        )

    rows = (await db.execute(query)).all()
    if not rows:
        return []

    quiz_ids = [q.id for q, _, _ in rows]
    attempts_by_quiz: Dict[str, List[QuizAttempt]] = {}

    if current_user.role == UserRole.STUDENT:
        attempts = (
            await db.execute(
                select(QuizAttempt)
                .where(QuizAttempt.student_id == current_user.id, QuizAttempt.quiz_id.in_(quiz_ids))
                .order_by(desc(QuizAttempt.completed_at))
            )
        ).scalars().all()
        for a in attempts:
            attempts_by_quiz.setdefault(a.quiz_id, []).append(a)

    response = []
    for quiz, lecture_title, course_title in rows:
        q_dict = QuizResponse.model_validate(quiz).model_dump()
        if current_user.role == UserRole.STUDENT:
            for question in q_dict.get("questions", []):
                question.pop("correct_answer", None)
                question.pop("explanation", None)

        attempts = attempts_by_quiz.get(quiz.id, [])
        latest_percentage = None
        best_percentage = None
        if attempts:
            latest = attempts[0]
            latest_percentage = round((latest.score / latest.max_score * 100) if latest.max_score else 0, 1)
            best_percentage = round(
                max((a.score / a.max_score * 100) if a.max_score else 0 for a in attempts),
                1,
            )

        response.append(
            {
                **q_dict,
                "lecture_title": lecture_title,
                "course_title": course_title,
                "attempt_count": len(attempts),
                "latest_percentage": latest_percentage,
                "best_percentage": best_percentage,
            }
        )

    return response


@router.post("", response_model=QuizResponse, status_code=201)
async def create_quiz(
    request: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Create a new quiz"""
    quiz = Quiz(
        lecture_id=request.lecture_id,
        title=request.title,
        description=request.description,
        questions=[q.model_dump() for q in request.questions],
        time_limit=request.time_limit,
        is_published=request.is_published,
        anti_cheat_enabled=request.anti_cheat_enabled,
        webcam_required=request.webcam_required,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)

    debug_logger.log("activity", f"Quiz created: {quiz.title}",
                     user_id=current_user.id)

    return QuizResponse.model_validate(quiz)


@router.put("/{quiz_id}", response_model=QuizResponse)
async def update_quiz(
    quiz_id: str,
    request: QuizUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Update a quiz"""
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    update_data = request.model_dump(exclude_unset=True)
    if "questions" in update_data and update_data["questions"] is not None:
        update_data["questions"] = [q.model_dump() if hasattr(q, 'model_dump') else q for q in update_data["questions"]]

    for field, value in update_data.items():
        setattr(quiz, field, value)

    await db.commit()
    await db.refresh(quiz)

    return QuizResponse.model_validate(quiz)


@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Delete a quiz"""
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    await db.delete(quiz)
    await db.commit()
    return {"message": "Quiz deleted"}


@router.post("/attempt", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    request: QuizAttemptSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a quiz attempt for grading"""
    # Get quiz
    result = await db.execute(select(Quiz).where(Quiz.id == request.quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Auto-grade
    score = 0
    max_score = 0
    correct_answers = {}

    for i, question in enumerate(quiz.questions):
        idx = str(i)
        max_score += question.get("points", 1)
        correct = question.get("correct_answer", "")
        correct_answers[idx] = correct

        student_answer = request.answers.get(idx, "").strip().lower()
        if student_answer == correct.strip().lower():
            score += question.get("points", 1)

    # Calculate integrity score (penalize violations)
    integrity_score = 100.0
    for v in request.violations:
        v_type = v.get("type", "")
        if v_type == "tab_switch":
            integrity_score -= 5
        elif v_type == "copy_paste":
            integrity_score -= 10
        elif v_type == "focus_loss":
            integrity_score -= 2
        elif v_type == "multiple_faces":
            integrity_score -= 15
    integrity_score = max(0, integrity_score)

    # Save attempt
    attempt = QuizAttempt(
        student_id=current_user.id,
        quiz_id=request.quiz_id,
        answers=request.answers,
        score=score,
        max_score=max_score,
        violations=request.violations,
        engagement_data=request.engagement_data,
        integrity_score=integrity_score,
        completed_at=datetime.utcnow(),
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    percentage = (score / max_score * 100) if max_score > 0 else 0

    debug_logger.log("activity",
                     f"Quiz submitted: {quiz.title} | Score: {score}/{max_score} ({percentage:.0f}%) | Integrity: {integrity_score}",
                     user_id=current_user.id)

    return QuizAttemptResponse(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        score=score,
        max_score=max_score,
        percentage=round(percentage, 1),
        violations=attempt.violations,
        integrity_score=integrity_score,
        answers=request.answers,
        correct_answers=correct_answers,
        completed_at=attempt.completed_at,
    )


@router.get("/attempts/{quiz_id}")
async def get_quiz_attempts(
    quiz_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get quiz attempts (student sees own, teacher sees all)"""
    query = select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id)

    if current_user.role == UserRole.STUDENT:
        query = query.where(QuizAttempt.student_id == current_user.id)

    result = await db.execute(query.order_by(QuizAttempt.completed_at.desc()))
    attempts = result.scalars().all()

    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "score": a.score,
            "max_score": a.max_score,
            "percentage": round((a.score / a.max_score * 100) if a.max_score else 0, 1),
            "violations": a.violations,
            "integrity_score": a.integrity_score,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        }
        for a in attempts
    ]


@router.post("/generate-ai")
async def generate_ai_quiz(
    request: AIQuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Generate quiz questions using AI from lecture transcript and materials"""
    # Get lecture
    result = await db.execute(select(Lecture).where(Lecture.id == request.lecture_id))
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    transcript = lecture.transcript or ""
    if not transcript:
        if lecture.youtube_url:
            transcript = await get_video_transcript(lecture.youtube_url, prefer_local=True)
            if transcript:
                lecture.transcript = transcript
                await db.commit()
                await db.refresh(lecture)
        if not transcript:
            raise HTTPException(status_code=400, detail="Transcript is not ready yet. It is being generated in the background. Please retry in a minute.")

    try:
        questions = await generate_quiz_questions(
            transcript=transcript,
            num_questions=request.num_questions,
            difficulty=request.difficulty,
            include_icap=request.include_icap,
        )
        return {"questions": questions, "count": len(questions)}
    except Exception as e:
        debug_logger.log("error", f"AI quiz generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@router.post("/generate-ai-refine")
async def refine_ai_quiz(
    request: AIQuizRefineRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Refine generated quiz questions using AI from lecture transcript and feedback"""
    # Get lecture
    result = await db.execute(select(Lecture).where(Lecture.id == request.lecture_id))
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    transcript = lecture.transcript or ""
    if not transcript:
        if lecture.youtube_url:
            transcript = await get_video_transcript(lecture.youtube_url, prefer_local=True)
            if transcript:
                lecture.transcript = transcript
                await db.commit()
                await db.refresh(lecture)
        if not transcript:
            raise HTTPException(status_code=400, detail="Transcript is not ready yet. Please retry shortly.")

    try:
        from app.services.quiz_generator_service import refine_quiz_questions
        questions = await refine_quiz_questions(
            transcript=transcript,
            current_questions=request.current_questions,
            feedback=request.feedback,
        )
        return {"questions": questions, "count": len(questions)}
    except Exception as e:
        debug_logger.log("error", f"AI quiz refinement failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quiz refinement failed: {str(e)}")
