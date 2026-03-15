"""
Smart LMS - Courses Router
Course CRUD, enrollment, and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.database import get_db
from app.models.models import (
    User, UserRole, Course, Enrollment, EnrollmentStatus,
    Lecture, Notification, NotificationType
)
from app.middleware.auth import get_current_user, require_teacher_or_admin
from app.services.debug_logger import debug_logger

router = APIRouter(prefix="/api/courses", tags=["Courses"])


# ─── Schemas ─────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[bool] = None


class CourseResponse(BaseModel):
    id: str
    teacher_id: str
    title: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    category: Optional[str]
    is_published: bool
    created_at: datetime
    teacher_name: Optional[str] = None
    lecture_count: int = 0
    student_count: int = 0

    class Config:
        from_attributes = True


class EnrollmentResponse(BaseModel):
    id: str
    course_id: str
    student_id: str
    status: str
    progress: float
    enrolled_at: datetime

    class Config:
        from_attributes = True


# ─── Routes ──────────────────────────────────────────────

# IMPORTANT: /enrolled/my-courses must be before /{course_id} to avoid shadowing
@router.get("/enrolled/my-courses")
async def get_my_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get courses the current student is enrolled in"""
    result = await db.execute(
        select(Enrollment, Course, User).join(
            Course, Enrollment.course_id == Course.id
        ).join(
            User, Course.teacher_id == User.id
        ).where(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        )
    )
    rows = result.all()

    return [
        {
            "enrollment_id": enr.id,
            "course_id": course.id,
            "title": course.title,
            "description": course.description,
            "thumbnail_url": course.thumbnail_url,
            "category": course.category,
            "teacher_name": teacher.full_name,
            "progress": enr.progress,
            "enrolled_at": enr.enrolled_at.isoformat(),
        }
        for enr, course, teacher in rows
    ]


@router.get("", response_model=List[CourseResponse])
async def list_courses(
    search: Optional[str] = None,
    category: Optional[str] = None,
    teacher_id: Optional[str] = None,
    published_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all courses with optional filters"""
    query = select(Course).options(selectinload(Course.teacher))

    if published_only and current_user.role == UserRole.STUDENT:
        query = query.where(Course.is_published == True)

    if current_user.role == UserRole.TEACHER:
        query = query.where(Course.teacher_id == current_user.id)

    if search:
        query = query.where(Course.title.ilike(f"%{search}%"))
    if category:
        query = query.where(Course.category == category)
    if teacher_id:
        query = query.where(Course.teacher_id == teacher_id)

    result = await db.execute(query.order_by(Course.created_at.desc()))
    courses = result.scalars().all()

    # Build responses with counts
    responses = []
    for course in courses:
        # Get lecture count
        lec_result = await db.execute(
            select(func.count()).select_from(Lecture).where(Lecture.course_id == course.id)
        )
        lecture_count = lec_result.scalar() or 0

        # Get student count
        enr_result = await db.execute(
            select(func.count()).select_from(Enrollment).where(
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ACTIVE
            )
        )
        student_count = enr_result.scalar() or 0

        responses.append(CourseResponse(
            id=course.id,
            teacher_id=course.teacher_id,
            title=course.title,
            description=course.description,
            thumbnail_url=course.thumbnail_url,
            category=course.category,
            is_published=course.is_published,
            created_at=course.created_at,
            teacher_name=course.teacher.full_name if course.teacher else None,
            lecture_count=lecture_count,
            student_count=student_count,
        ))

    return responses


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get course details"""
    result = await db.execute(
        select(Course).options(selectinload(Course.teacher)).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get counts
    lec_result = await db.execute(
        select(func.count()).select_from(Lecture).where(Lecture.course_id == course.id)
    )
    lecture_count = lec_result.scalar() or 0

    enr_result = await db.execute(
        select(func.count()).select_from(Enrollment).where(
            Enrollment.course_id == course.id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        )
    )
    student_count = enr_result.scalar() or 0

    return CourseResponse(
        id=course.id,
        teacher_id=course.teacher_id,
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        category=course.category,
        is_published=course.is_published,
        created_at=course.created_at,
        teacher_name=course.teacher.full_name if course.teacher else None,
        lecture_count=lecture_count,
        student_count=student_count,
    )


@router.post("", response_model=CourseResponse, status_code=201)
async def create_course(
    request: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Create a new course (teacher/admin only)"""
    course = Course(
        teacher_id=current_user.id,
        title=request.title,
        description=request.description,
        category=request.category,
        thumbnail_url=request.thumbnail_url,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)

    debug_logger.log("activity", f"Course created: {course.title}",
                     user_id=current_user.id)

    return CourseResponse(
        id=course.id,
        teacher_id=course.teacher_id,
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        category=course.category,
        is_published=course.is_published,
        created_at=course.created_at,
        teacher_name=current_user.full_name,
        lecture_count=0,
        student_count=0,
    )


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    request: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Update a course"""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your course")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)

    debug_logger.log("activity", f"Course updated: {course.title}",
                     user_id=current_user.id)

    return CourseResponse(
        id=course.id,
        teacher_id=course.teacher_id,
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        category=course.category,
        is_published=course.is_published,
        created_at=course.created_at,
        teacher_name=current_user.full_name,
    )


@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Delete a course"""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your course")

    await db.delete(course)
    await db.commit()

    debug_logger.log("activity", f"Course deleted: {course.title}",
                     user_id=current_user.id)

    return {"message": "Course deleted"}


# ─── Enrollment ──────────────────────────────────────────

@router.post("/{course_id}/enroll", response_model=EnrollmentResponse)
async def enroll_in_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enroll current student in a course"""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Only students can enroll")

    # Check course exists
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check not already enrolled
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already enrolled")

    enrollment = Enrollment(
        student_id=current_user.id,
        course_id=course_id,
    )
    db.add(enrollment)

    # Notify teacher
    notification = Notification(
        user_id=course.teacher_id,
        sender_id=current_user.id,
        type=NotificationType.SYSTEM,
        title="New Enrollment",
        message=f"{current_user.full_name} enrolled in {course.title}",
        extra_data={"course_id": course_id},
    )
    db.add(notification)

    await db.commit()
    await db.refresh(enrollment)

    debug_logger.log("activity", f"Enrolled in: {course.title}",
                     user_id=current_user.id)

    return EnrollmentResponse.model_validate(enrollment)


@router.get("/{course_id}/students")
async def get_course_students(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Get all enrolled students in a course"""
    result = await db.execute(
        select(Enrollment, User).join(User, Enrollment.student_id == User.id).where(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        )
    )
    rows = result.all()

    return [
        {
            "enrollment_id": enr.id,
            "student_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "progress": enr.progress,
            "enrolled_at": enr.enrolled_at.isoformat(),
        }
        for enr, user in rows
    ]
