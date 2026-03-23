"""
Smart LMS - Analytics Router
Teaching scores, course analytics, engagement summaries
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.models import (
    User, UserRole, Course, Lecture, Enrollment, EnrollmentStatus,
    EngagementLog, QuizAttempt, Quiz, Feedback, Attendance,
    TeachingScore, ICAPLog, ICAPLevel, ActivityLog, Message
)
from app.middleware.auth import get_current_user, require_teacher_or_admin
from app.services.debug_logger import debug_logger

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/teaching-score/{course_id}")
async def get_teaching_score(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate comprehensive teaching score for a course (v2).
    
    Components:
      - Avg Engagement (25%): Mean engagement score across sessions
      - Engagement Trend (15%): Slope of engagement over time (retention)
      - Low Engagement Rate (10%): % sessions with engagement < 40 (inverted)
      - Quiz Performance (15%): Average quiz score
      - ICAP Distribution (15%): Weighted by learning depth (I>C>A>P)
      - Feedback (10%): Student satisfaction ratings
      - Completion Rate (10%): Sessions vs expected
    """
    # Get course
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # ── 1. Engagement Score ──
    eng_result = await db.execute(
        select(EngagementLog).where(
            EngagementLog.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        ).order_by(EngagementLog.started_at)
    )
    engagement_logs = eng_result.scalars().all()

    engagement_scores = [l.engagement_score or 50.0 for l in engagement_logs]
    engagement_avg = sum(engagement_scores) / max(len(engagement_scores), 1)

    # ── 2. Engagement Trend (retention slope) ──
    if len(engagement_scores) >= 3:
        import numpy as np
        x = np.arange(len(engagement_scores), dtype=float)
        y = np.array(engagement_scores, dtype=float)
        slope = float(np.polyfit(x, y, 1)[0])
        # Normalize: positive slope = improving, map to 0-100
        trend_score = min(100, max(0, 50 + slope * 50))
    else:
        trend_score = 50.0
        slope = 0.0

    # ── 3. Low Engagement Rate ──
    low_threshold = 40.0
    if engagement_scores:
        low_count = sum(1 for s in engagement_scores if s < low_threshold)
        low_rate = low_count / len(engagement_scores)
        low_eng_score = (1.0 - low_rate) * 100  # Inverted: fewer low sessions = better
    else:
        low_rate = 0.0
        low_eng_score = 50.0

    # ── 4. Quiz Score ──
    quiz_result = await db.execute(
        select(func.avg(QuizAttempt.score / func.nullif(QuizAttempt.max_score, 0) * 100)).where(
            QuizAttempt.quiz_id.in_(
                select(Quiz.id).where(
                    Quiz.lecture_id.in_(
                        select(Lecture.id).where(Lecture.course_id == course_id)
                    )
                )
            )
        )
    )
    quiz_avg = quiz_result.scalar() or 50.0

    # ── 5. ICAP Distribution ──
    icap_result = await db.execute(
        select(ICAPLog.classification, func.count()).where(
            ICAPLog.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        ).group_by(ICAPLog.classification)
    )
    icap_rows = icap_result.all()
    icap_counts = {row[0].value if hasattr(row[0], 'value') else str(row[0]): row[1] for row in icap_rows}
    icap_total = sum(icap_counts.values()) or 1

    # Weighted ICAP score: Interactive=100, Constructive=75, Active=50, Passive=25
    icap_weights = {"interactive": 100, "constructive": 75, "active": 50, "passive": 25}
    icap_score = sum(
        icap_counts.get(level, 0) / icap_total * weight
        for level, weight in icap_weights.items()
    )

    # ── 6. Attendance Score ──
    att_result = await db.execute(
        select(func.avg(Attendance.presence_score)).where(
            Attendance.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        )
    )
    attendance_avg = att_result.scalar() or 50.0

    # ── 7. Feedback Score ──
    fb_result = await db.execute(
        select(func.avg(Feedback.overall_rating)).where(Feedback.course_id == course_id)
    )
    feedback_avg_raw = fb_result.scalar() or 3.0
    feedback_score = (feedback_avg_raw / 5) * 100

    # ── 8. Completion Rate ──
    total_lectures = await db.execute(
        select(func.count()).select_from(Lecture).where(Lecture.course_id == course_id)
    )
    num_lectures = total_lectures.scalar() or 1
    total_students = await db.execute(
        select(func.count()).select_from(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        )
    )
    num_students = total_students.scalar() or 1
    completed = await db.execute(
        select(func.count(func.distinct(
            func.concat(EngagementLog.student_id, '-', EngagementLog.lecture_id)
        ))).where(
            EngagementLog.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        )
    )
    completion_count = completed.scalar() or 0
    completion_rate = min(100, (completion_count / max(num_lectures * num_students, 1)) * 100)

    # ── 9. Teacher Responsiveness (Messaging) ──
    msg_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.sender_id == course.teacher_id,
            Message.course_id == course_id,
        )
    )
    teacher_messages = msg_result.scalar() or 0
    # Score: messages per student, capped at 100. 
    # 2+ messages/student = 100, 1 = 75, 0 = 25
    msgs_per_student = teacher_messages / max(num_students, 1)
    if msgs_per_student >= 2:
        responsiveness_score = 100.0
    elif msgs_per_student >= 1:
        responsiveness_score = 75.0
    elif msgs_per_student >= 0.5:
        responsiveness_score = 50.0
    elif teacher_messages > 0:
        responsiveness_score = 35.0
    else:
        responsiveness_score = 15.0  # No messages = low responsiveness

    # ── 10. Teacher Activity Score (logins, materials, activity) ──
    # Count activity log entries for this teacher
    activity_result = await db.execute(
        select(func.count(ActivityLog.id)).where(
            ActivityLog.user_id == course.teacher_id
        )
    )
    teacher_activity_count = activity_result.scalar() or 0
    
    # Count materials added for lectures in this course
    from app.models.models import Material
    try:
        mat_result = await db.execute(
            select(func.count()).select_from(Material).where(
                Material.lecture_id.in_(
                    select(Lecture.id).where(Lecture.course_id == course_id)
                )
            )
        )
        materials_count = mat_result.scalar() or 0
    except Exception:
        materials_count = 0
    
    # Activity score: combined from activity logs + materials
    # More active teachers get higher scores
    if teacher_activity_count >= 20 and materials_count >= 5:
        teacher_activity_score = 100.0
    elif teacher_activity_count >= 10 or materials_count >= 3:
        teacher_activity_score = 75.0
    elif teacher_activity_count >= 5 or materials_count >= 1:
        teacher_activity_score = 50.0
    elif teacher_activity_count > 0:
        teacher_activity_score = 30.0
    else:
        teacher_activity_score = 10.0

    # ── Overall weighted score (v4) ──
    # Updated weights: engagement(18%) + trend(10%) + low_eng(7%) + quiz(12%) + 
    # icap(12%) + feedback(9%) + completion(8%) + responsiveness(7%) + attendance(7%) + activity(5%) + consistency(5%)
    overall = (
        engagement_avg * 0.18 +
        trend_score * 0.10 +
        low_eng_score * 0.07 +
        quiz_avg * 0.12 +
        icap_score * 0.12 +
        feedback_score * 0.09 +
        completion_rate * 0.08 +
        responsiveness_score * 0.07 +
        attendance_avg * 0.07 +
        teacher_activity_score * 0.05 +
        consistency_score * 0.05
    )

    # SHAP-style breakdown
    shap_breakdown = {
        "engagement": round(engagement_avg * 0.18, 1),
        "engagement_trend": round(trend_score * 0.10, 1),
        "low_engagement_penalty": round(low_eng_score * 0.07, 1),
        "quiz_performance": round(quiz_avg * 0.12, 1),
        "icap_distribution": round(icap_score * 0.12, 1),
        "feedback_sentiment": round(feedback_score * 0.09, 1),
        "completion_rate": round(completion_rate * 0.08, 1),
        "teacher_responsiveness": round(responsiveness_score * 0.07, 1),
        "attendance": round(attendance_avg * 0.07, 1),
        "teacher_activity": round(teacher_activity_score * 0.05, 1),
        "engagement_consistency": round(consistency_score * 0.05, 1),
    }

    # Recommendations
    recommendations = []
    if engagement_avg < 50:
        recommendations.append("Student engagement is low. Consider more interactive content.")
    if slope < -0.5:
        recommendations.append("Engagement is declining over time. Consider varying content format.")
    if low_rate > 0.3:
        recommendations.append(f"{int(low_rate*100)}% of sessions have low engagement. Add checkpoints or breaks.")
    if quiz_avg < 60:
        recommendations.append("Quiz scores are below average. Review content difficulty.")
    if icap_score < 40:
        recommendations.append("Most students are passive. Add collaborative activities to promote deeper learning.")
    if feedback_score < 60:
        recommendations.append("Student feedback is below expectations. Address common concerns.")
    if attendance_avg < 60:
        recommendations.append("Attendance needs improvement. Consider making lectures more accessible.")
    if teacher_messages == 0:
        recommendations.append("You haven't messaged any students yet. Use the messaging feature to provide personalized advice and encouragement.")
    elif msgs_per_student < 0.5:
        recommendations.append("Consider messaging more students with personalized feedback — it significantly improves engagement and retention.")
    if not recommendations:
        recommendations.append("Teaching metrics are healthy. Keep up the great work!")

    # ── Multi-dimensional engagement analysis (v3) ──
    boredom_scores = [l.boredom_score or 50.0 for l in engagement_logs if hasattr(l, 'boredom_score')]
    confusion_scores = [l.confusion_score or 0.0 for l in engagement_logs if hasattr(l, 'confusion_score')]
    frustration_scores = [l.frustration_score or 0.0 for l in engagement_logs if hasattr(l, 'frustration_score')]

    # Safe averages
    boredom_avg = sum(boredom_scores) / max(len(boredom_scores), 1) if boredom_scores else None
    confusion_avg = sum(confusion_scores) / max(len(confusion_scores), 1) if confusion_scores else None
    frustration_avg = sum(frustration_scores) / max(len(frustration_scores), 1) if frustration_scores else None

    # Engagement consistency: lower std = more consistent teaching
    if len(engagement_scores) >= 3:
        import numpy as np
        eng_std = float(np.std(engagement_scores))
        consistency_score = max(0, min(100, 100 - eng_std * 2))  # Lower std = higher score
    else:
        eng_std = 0.0
        consistency_score = 50.0

    # Enhanced dimension-specific recommendations (v3)
    if confusion_avg is not None and confusion_avg > 40:
        recommendations.append(
            f"Average confusion score is {confusion_avg:.0f}%. Review content clarity — "
            "consider adding more examples or breaking complex topics into smaller segments."
        )
    if frustration_avg is not None and frustration_avg > 30:
        recommendations.append(
            f"Frustration detected ({frustration_avg:.0f}% avg). Check for technical issues, "
            "pacing problems, or overly difficult content."
        )
    if boredom_avg is not None and boredom_avg > 50:
        recommendations.append(
            f"High boredom detected ({boredom_avg:.0f}% avg). Add variety — polls, discussions, "
            "or hands-on exercises to maintain attention."
        )
    if eng_std > 20 and len(engagement_scores) >= 5:
        recommendations.append(
            "Engagement is inconsistent across sessions. Identify which lectures have low scores "
            "and apply successful patterns from high-engagement sessions."
        )

    # Save score
    score = TeachingScore(
        teacher_id=course.teacher_id,
        course_id=course_id,
        engagement_score=engagement_avg,
        quiz_score=quiz_avg,
        attendance_score=attendance_avg,
        feedback_score=feedback_score,
        completion_score=completion_rate,
        overall_score=overall,
        shap_breakdown=shap_breakdown,
        recommendations=recommendations,
    )
    db.add(score)
    await db.commit()

    debug_logger.log("activity",
                     f"Teaching score calculated: {overall:.1f} for course {course.title}",
                     user_id=current_user.id)

    return {
        "course_id": course_id,
        "course_title": course.title,
        "overall_score": round(overall, 1),
        "components": {
            "engagement": round(engagement_avg, 1),
            "engagement_trend": round(trend_score, 1),
            "engagement_slope": round(slope, 3),
            "low_engagement_rate": round(low_rate * 100, 1),
            "quiz_performance": round(quiz_avg, 1),
            "icap_score": round(icap_score, 1),
            "icap_distribution": icap_counts,
            "attendance": round(attendance_avg, 1),
            "feedback": round(feedback_score, 1),
            "completion_rate": round(completion_rate, 1),
            "teacher_responsiveness": round(responsiveness_score, 1),
            "teacher_messages": teacher_messages,
            "msgs_per_student": round(msgs_per_student, 2),
        },
        "shap_breakdown": shap_breakdown,
        "recommendations": recommendations,
        "num_students": num_students,
        "num_lectures": num_lectures,
        "total_sessions": len(engagement_scores),
        "multi_dimensional": {
            "boredom_avg": round(boredom_avg, 1) if boredom_avg is not None else None,
            "confusion_avg": round(confusion_avg, 1) if confusion_avg is not None else None,
            "frustration_avg": round(frustration_avg, 1) if frustration_avg is not None else None,
            "engagement_consistency": round(consistency_score, 1),
            "engagement_std": round(eng_std, 1) if eng_std else 0.0,
        },
        "teacher_activity": {
            "total_activities": teacher_activity_count,
            "materials_uploaded": materials_count,
            "messages_sent": teacher_messages,
            "activity_score": round(teacher_activity_score, 1),
        },
        "version": "v4",
        "calculated_at": datetime.utcnow().isoformat(),
    }


@router.get("/course-dashboard/{course_id}")
async def get_course_dashboard(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive course dashboard analytics"""
    # Engagement distribution
    eng_result = await db.execute(
        select(EngagementLog).where(
            EngagementLog.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        ).order_by(EngagementLog.started_at.desc())
    )
    engagement_logs = eng_result.scalars().all()

    # ICAP distribution
    icap_result = await db.execute(
        select(ICAPLog.classification, func.count()).where(
            ICAPLog.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        ).group_by(ICAPLog.classification)
    )
    icap_dist = {row[0].value: row[1] for row in icap_result.all()}

    # Recent quiz performance
    quiz_result = await db.execute(
        select(QuizAttempt).join(Quiz).where(
            Quiz.lecture_id.in_(
                select(Lecture.id).where(Lecture.course_id == course_id)
            )
        ).order_by(QuizAttempt.completed_at.desc())
    )
    quiz_attempts = quiz_result.scalars().all()

    # Tutor Usage
    tutor_result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.action == "tutor_message_sent",
        ).limit(100)
    )
    tutor_logs = tutor_result.scalars().all()
    
    # Material Downloads
    download_result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.action == "material_download"
        ).order_by(ActivityLog.created_at.desc()).limit(50)
    )
    download_logs = download_result.scalars().all()

    # Aggregate student stats
    students_in_logs = list(set([log.student_id for log in engagement_logs]))
    students_dict = {}
    if students_in_logs:
        student_result = await db.execute(
            select(User).where(User.id.in_(students_in_logs))
        )
        students_dict = {u.id: {"name": u.full_name, "email": u.email} for u in student_result.scalars().all()}

    student_stats_map = {}
    for log in engagement_logs:
        sid = log.student_id
        if sid not in student_stats_map:
            student_stats_map[sid] = {"logs": [], "quizzes": []}
        student_stats_map[sid]["logs"].append(log)
    for qa in quiz_attempts:
        sid = qa.student_id
        if sid not in student_stats_map:
            student_stats_map[sid] = {"logs": [], "quizzes": []}
        student_stats_map[sid]["quizzes"].append(qa)

    student_stats = []
    # Fetch enrollment statuses to only show active enrolled students or those with history
    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        )
    )
    enrolled_student_ids = [e.student_id for e in enrollment_result.scalars().all()]
    all_student_ids = list(set(enrolled_student_ids + list(student_stats_map.keys())))
    
    # We need to fetch users not in students_dict
    missing_ids = [sid for sid in all_student_ids if sid not in students_dict]
    if missing_ids:
        missing_result = await db.execute(select(User).where(User.id.in_(missing_ids)))
        for u in missing_result.scalars().all():
            students_dict[u.id] = {"name": u.full_name, "email": u.email}

    for sid in all_student_ids:
        info = students_dict.get(sid, {"name": "Unknown", "email": ""})
        s_logs = student_stats_map.get(sid, {}).get("logs", [])
        s_quizzes = student_stats_map.get(sid, {}).get("quizzes", [])
        
        avg_eng = sum((l.engagement_score or 0) for l in s_logs) / max(len(s_logs), 1) if s_logs else None
        boredom = sum((l.boredom_score or 0) for l in s_logs) / max(len(s_logs), 1) if s_logs else None
        confusion = sum((l.confusion_score or 0) for l in s_logs) / max(len(s_logs), 1) if s_logs else None
        tabs = sum((l.tab_switches or 0) for l in s_logs) if s_logs else 0
        latest_icap = s_logs[0].icap_classification.value if s_logs and s_logs[0].icap_classification else None
        
        quiz_avg = sum(((qa.score / qa.max_score * 100) if qa.max_score else 0) for qa in s_quizzes) / max(len(s_quizzes), 1) if s_quizzes else None
        
        # Combine all engagement timelines sequentially to make a master timeline
        master_timeline = []
        for l in sorted(s_logs, key=lambda x: x.started_at):
            if hasattr(l, 'scores_timeline') and l.scores_timeline:
                master_timeline.extend(l.scores_timeline)
        
        student_stats.append({
            "student_id": sid,
            "name": info["name"],
            "email": info["email"],
            "engagement_score": avg_eng,
            "boredom_score": boredom,
            "confusion_score": confusion,
            "tab_switches": tabs,
            "quiz_score": quiz_avg,
            "icap_level": latest_icap,
            "timeline": master_timeline
        })


    return {
        "course_id": course_id,
        "engagement": {
            "total_sessions": len(engagement_logs),
            "avg_score": round(sum(l.engagement_score or 0 for l in engagement_logs) / max(len(engagement_logs), 1), 1),
            "avg_boredom": round(sum(l.boredom_score or 0 for l in engagement_logs) / max(len(engagement_logs), 1), 1),
            "avg_confusion": round(sum(l.confusion_score or 0 for l in engagement_logs) / max(len(engagement_logs), 1), 1),
            "total_tab_switches": sum(l.tab_switches or 0 for l in engagement_logs),
        },
        "icap_distribution": icap_dist,
        "quiz_performance": {
            "total_attempts": len(quiz_attempts),
            "avg_score": round(sum(
                (a.score / a.max_score * 100) if a.max_score else 0 for a in quiz_attempts
            ) / max(len(quiz_attempts), 1), 1),
            "avg_integrity": round(
                sum(a.integrity_score or 100 for a in quiz_attempts) / max(len(quiz_attempts), 1), 1
            ),
        },
        "tutor_usage": {
            "total_messages": len(tutor_logs)
        },
        "recent_downloads": [
            {
                "file_name": (log.details or {}).get("file_name", "Unknown File"),
                "date": log.created_at.isoformat() if getattr(log, 'created_at', None) else None
            } for log in download_logs[:10]
        ],
        "student_stats": student_stats
    }


@router.get("/lecture-dashboard/{lecture_id}")
async def get_lecture_dashboard(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed analytics for a specific lecture, including heatmap data and student list"""
    # Get lecture details
    lecture_result = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lecture = lecture_result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    # Get all engagement logs for this lecture
    eng_result = await db.execute(
        select(EngagementLog).where(EngagementLog.lecture_id == lecture_id)
    )
    engagement_logs = eng_result.scalars().all()

    # Get student info
    students_in_logs = list(set([log.student_id for log in engagement_logs]))
    students_dict = {}
    if students_in_logs:
        student_result = await db.execute(
            select(User).where(User.id.in_(students_in_logs))
        )
        students_dict = {u.id: {"name": u.full_name, "email": u.email} for u in student_result.scalars().all()}

    # Quiz performance for this lecture
    quiz_result = await db.execute(
        select(QuizAttempt).join(Quiz).where(Quiz.lecture_id == lecture_id)
    )
    quiz_attempts = quiz_result.scalars().all()

    student_stats = []
    timelines = []

    for log in engagement_logs:
        student_info = students_dict.get(log.student_id, {"name": "Unknown", "email": ""})
        student_quiz = next((q for q in quiz_attempts if q.student_id == log.student_id), None)
        quiz_score = (student_quiz.score / student_quiz.max_score * 100) if student_quiz and student_quiz.max_score else None

        student_stats.append({
            "student_id": log.student_id,
            "name": student_info["name"],
            "email": student_info["email"],
            "engagement_score": log.engagement_score or 0,
            "boredom_score": log.boredom_score or 0,
            "confusion_score": log.confusion_score or 0,
            "tab_switches": log.tab_switches or 0,
            "quiz_score": quiz_score,
            "icap_level": log.icap_classification.value if log.icap_classification else None
        })

        if log.scores_timeline:
             timelines.append({
                 "student_id": log.student_id,
                 "name": student_info["name"],
                 "timeline": log.scores_timeline
             })

    avg_engagement = sum(s["engagement_score"] for s in student_stats) / max(len(student_stats), 1) if student_stats else 0
    
    return {
        "lecture_id": lecture_id,
        "lecture_title": lecture.title,
        "total_views": len(engagement_logs),
        "avg_engagement": round(avg_engagement, 1),
        "student_stats": student_stats,
        "engagement_timelines": timelines
    }


@router.get("/student-dashboard")
async def get_student_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get student's personal analytics dashboard"""
    # Engagement history
    eng_result = await db.execute(
        select(EngagementLog).where(EngagementLog.student_id == current_user.id)
        .order_by(EngagementLog.started_at.desc()).limit(50)
    )
    logs = eng_result.scalars().all()

    # Quiz history
    quiz_result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.student_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc()).limit(20)
    )
    attempts = quiz_result.scalars().all()

    # ICAP history
    icap_result = await db.execute(
        select(ICAPLog.classification, func.count()).where(
            ICAPLog.student_id == current_user.id
        ).group_by(ICAPLog.classification)
    )
    icap_dist = {row[0].value: row[1] for row in icap_result.all()}

    # Tutor and Downloads
    tutor_result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.action == "tutor_message_sent"
        )
    )
    tutor_logs = tutor_result.scalars().all()

    download_result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.action == "material_download"
        ).order_by(ActivityLog.created_at.desc()).limit(20)
    )
    download_logs = download_result.scalars().all()

    return {
        "engagement": {
            "total_sessions": len(logs),
            "avg_score": round(sum(l.engagement_score or 0 for l in logs) / max(len(logs), 1), 1),
            "total_watch_time": sum(l.watch_duration or 0 for l in logs),
            "recent": [
                {
                    "lecture_id": l.lecture_id,
                    "score": l.engagement_score,
                    "icap": l.icap_classification.value if l.icap_classification else None,
                    "date": l.started_at.isoformat(),
                }
                for l in logs[:10]
            ],
        },
        "quizzes": {
            "total_attempts": len(attempts),
            "avg_score": round(sum(
                (a.score / a.max_score * 100) if a.max_score else 0 for a in attempts
            ) / max(len(attempts), 1), 1),
        },
        "icap_distribution": icap_dist,
        "tutor_usage": {
            "messages_sent": len(tutor_logs),
        },
        "recent_downloads": [
            {
                "file_name": (log.details or {}).get("file_name", "Unknown"),
                "file_type": (log.details or {}).get("file_type", "txt"),
                "date": log.created_at.isoformat() if log.created_at else None
            } for log in download_logs[:10]
        ]
    }
