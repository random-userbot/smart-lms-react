"""
Smart LMS - Admin Router
User management, system analytics, moderation
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.models import (
    User, UserRole, Course, Enrollment, EngagementLog,
    QuizAttempt, Feedback, TeachingScore, ActivityLog
)
from app.middleware.auth import get_current_user, require_admin
from app.services.debug_logger import debug_logger

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/teachers")
async def list_teachers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all teachers with their teaching scores"""
    result = await db.execute(
        select(User).where(User.role == UserRole.TEACHER)
    )
    teachers = result.scalars().all()
    teacher_ids = [teacher.id for teacher in teachers]

    latest_scores_by_teacher = {}
    course_counts_by_teacher = {}

    if teacher_ids:
        scores_result = await db.execute(
            select(TeachingScore)
            .where(TeachingScore.teacher_id.in_(teacher_ids))
            .order_by(TeachingScore.teacher_id, TeachingScore.calculated_at.desc())
        )
        for score in scores_result.scalars().all():
            if score.teacher_id not in latest_scores_by_teacher:
                latest_scores_by_teacher[score.teacher_id] = score

        course_count_result = await db.execute(
            select(Course.teacher_id, func.count(Course.id))
            .where(Course.teacher_id.in_(teacher_ids))
            .group_by(Course.teacher_id)
        )
        course_counts_by_teacher = {
            teacher_id: count for teacher_id, count in course_count_result.all()
        }

    response = []
    for teacher in teachers:
        latest_score = latest_scores_by_teacher.get(teacher.id)

        response.append({
            "id": teacher.id,
            "username": teacher.username,
            "full_name": teacher.full_name,
            "email": teacher.email,
            "is_active": teacher.is_active,
            "last_login": teacher.last_login.isoformat() if teacher.last_login else None,
            "course_count": int(course_counts_by_teacher.get(teacher.id, 0) or 0),
            "overall_teaching_score": latest_score.overall_score if latest_score else None,
            "score_breakdown": latest_score.shap_breakdown if latest_score else None,
        })

    return response


@router.get("/teacher/{teacher_id}")
async def get_teacher_detail(
    teacher_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get detailed teacher analytics"""
    result = await db.execute(select(User).where(User.id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Get courses
    courses_result = await db.execute(
        select(Course).where(Course.teacher_id == teacher_id)
    )
    courses = courses_result.scalars().all()
    course_ids = [course.id for course in courses]

    latest_scores_by_course = {}
    student_counts_by_course = {}

    if course_ids:
        scores_result = await db.execute(
            select(TeachingScore)
            .where(TeachingScore.course_id.in_(course_ids))
            .order_by(TeachingScore.course_id, TeachingScore.calculated_at.desc())
        )
        for score in scores_result.scalars().all():
            if score.course_id not in latest_scores_by_course:
                latest_scores_by_course[score.course_id] = score

        student_count_result = await db.execute(
            select(Enrollment.course_id, func.count(Enrollment.id))
            .where(Enrollment.course_id.in_(course_ids))
            .group_by(Enrollment.course_id)
        )
        student_counts_by_course = {
            cid: count for cid, count in student_count_result.all()
        }

    course_data = []
    for course in courses:
        score = latest_scores_by_course.get(course.id)

        course_data.append({
            "id": course.id,
            "title": course.title,
            "student_count": int(student_counts_by_course.get(course.id, 0) or 0),
            "teaching_score": score.overall_score if score else None,
            "score_breakdown": score.shap_breakdown if score else None,
            "recommendations": score.recommendations if score else [],
        })

    return {
        "teacher": {
            "id": teacher.id,
            "full_name": teacher.full_name,
            "email": teacher.email,
            "is_active": teacher.is_active,
        },
        "courses": course_data,
        "overall_avg_score": round(
            sum(c["teaching_score"] or 0 for c in course_data) / max(len(course_data), 1), 1
        ),
    }


@router.get("/users")
async def list_all_users(
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users with optional role filter"""
    query = select(User)
    if role:
        query = query.where(User.role == UserRole(role))
    result = await db.execute(query.order_by(User.created_at.desc()))
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Activate/deactivate a user"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    await db.commit()

    debug_logger.log("activity",
                     f"User {'activated' if user.is_active else 'deactivated'}: {user.username}",
                     user_id=current_user.id)

    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a user and all associated data"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    await db.delete(user)
    await db.commit()

    debug_logger.log("activity", f"User deleted: {user.username}",
                     user_id=current_user.id)

    return {"message": "User deleted"}


@router.delete("/courses/{course_id}")
async def admin_delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: delete any course"""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    await db.delete(course)
    await db.commit()

    debug_logger.log("activity", f"Admin deleted course: {course.title}",
                     user_id=current_user.id)

    return {"message": "Course deleted"}


@router.get("/system-stats")
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get system-wide statistics"""
    users_count = await db.execute(select(func.count()).select_from(User))
    students_count = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.STUDENT)
    )
    teachers_count = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.TEACHER)
    )
    courses_count = await db.execute(select(func.count()).select_from(Course))
    engagement_count = await db.execute(select(func.count()).select_from(EngagementLog))

    return {
        "total_users": users_count.scalar() or 0,
        "students": students_count.scalar() or 0,
        "teachers": teachers_count.scalar() or 0,
        "courses": courses_count.scalar() or 0,
        "engagement_sessions": engagement_count.scalar() or 0,
    }
