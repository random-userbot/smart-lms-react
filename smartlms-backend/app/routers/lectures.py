"""
Smart LMS - Lectures Router
Lecture CRUD, video upload, YouTube import, transcript extraction
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.database import get_db
from app.models.models import User, UserRole, Course, Lecture, Material
from app.middleware.auth import get_current_user, require_teacher_or_admin
from app.services.debug_logger import debug_logger
import json

router = APIRouter(prefix="/api/lectures", tags=["Lectures"])


# ─── Schemas ─────────────────────────────────────────────

class LectureCreate(BaseModel):
    course_id: str
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    video_url: Optional[str] = None
    youtube_url: Optional[str] = None
    duration: int = 0
    order_index: int = 0


class LectureUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    youtube_url: Optional[str] = None
    duration: Optional[int] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None
    transcript: Optional[str] = None


class LectureResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str]
    video_url: Optional[str]
    youtube_url: Optional[str]
    thumbnail_url: Optional[str]
    transcript: Optional[str]
    duration: int
    order_index: int
    is_published: bool
    created_at: datetime

    class Config:
        from_attributes = True


class YouTubeImportRequest(BaseModel):
    course_id: str
    playlist_url: str  # YouTube playlist URL
    import_transcripts: bool = True


class MaterialResponse(BaseModel):
    id: str
    course_id: str
    lecture_id: Optional[str]
    title: str
    file_url: str
    file_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Routes ──────────────────────────────────────────────

@router.get("/course/{course_id}", response_model=List[LectureResponse])
async def get_course_lectures(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all lectures for a course"""
    result = await db.execute(
        select(Lecture).where(Lecture.course_id == course_id)
        .order_by(Lecture.order_index)
    )
    lectures = result.scalars().all()
    return [LectureResponse.model_validate(l) for l in lectures]


@router.get("/{lecture_id}", response_model=LectureResponse)
async def get_lecture(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single lecture"""
    result = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return LectureResponse.model_validate(lecture)


@router.post("", response_model=LectureResponse, status_code=201)
async def create_lecture(
    request: LectureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Create a new lecture"""
    # Verify course ownership
    course_result = await db.execute(select(Course).where(Course.id == request.course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your course")

    # Auto-set order_index if not provided
    if request.order_index == 0:
        count_result = await db.execute(
            select(func.count()).select_from(Lecture).where(Lecture.course_id == request.course_id)
        )
        request.order_index = (count_result.scalar() or 0) + 1

    lecture = Lecture(
        course_id=request.course_id,
        title=request.title,
        description=request.description,
        video_url=request.video_url,
        youtube_url=request.youtube_url,
        duration=request.duration,
        order_index=request.order_index,
    )
    db.add(lecture)
    await db.commit()
    await db.refresh(lecture)

    debug_logger.log("activity", f"Lecture created: {lecture.title} in course {course.title}",
                     user_id=current_user.id)

    return LectureResponse.model_validate(lecture)


@router.put("/{lecture_id}", response_model=LectureResponse)
async def update_lecture(
    lecture_id: str,
    request: LectureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Update a lecture"""
    result = await db.execute(
        select(Lecture).join(Course).where(
            Lecture.id == lecture_id,
        )
    )
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(lecture, field, value)

    await db.commit()
    await db.refresh(lecture)

    debug_logger.log("activity", f"Lecture updated: {lecture.title}",
                     user_id=current_user.id)

    return LectureResponse.model_validate(lecture)


@router.delete("/{lecture_id}")
async def delete_lecture(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Delete a lecture"""
    result = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    await db.delete(lecture)
    await db.commit()

    debug_logger.log("activity", f"Lecture deleted: {lecture.title}",
                     user_id=current_user.id)

    return {"message": "Lecture deleted"}


@router.post("/youtube-import")
async def import_youtube_playlist(
    request: YouTubeImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Import YouTube playlist as lectures"""
    # Verify course ownership
    course_result = await db.execute(select(Course).where(Course.id == request.course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        from app.services.youtube_service import extract_playlist_videos
        videos = await extract_playlist_videos(request.playlist_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import playlist: {str(e)}")

    # Get current lecture count for ordering
    count_result = await db.execute(
        select(func.count()).select_from(Lecture).where(Lecture.course_id == request.course_id)
    )
    start_index = (count_result.scalar() or 0) + 1

    created_lectures = []
    for i, video in enumerate(videos):
        lecture = Lecture(
            course_id=request.course_id,
            title=video["title"],
            description=video.get("description", ""),
            youtube_url=video["url"],
            thumbnail_url=video.get("thumbnail"),
            duration=video.get("duration", 0),
            order_index=start_index + i,
        )
        db.add(lecture)
        created_lectures.append(lecture)

    await db.commit()

    debug_logger.log("activity",
                     f"Imported {len(created_lectures)} videos from YouTube playlist",
                     user_id=current_user.id)

    return {
        "message": f"Imported {len(created_lectures)} lectures",
        "count": len(created_lectures),
    }


# ─── Materials ───────────────────────────────────────────

@router.get("/{lecture_id}/materials", response_model=List[MaterialResponse])
async def get_lecture_materials(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get materials attached to a lecture"""
    result = await db.execute(
        select(Material).where(Material.lecture_id == lecture_id)
    )
    materials = result.scalars().all()
    return [MaterialResponse.model_validate(m) for m in materials]


@router.get("/course/{course_id}/materials", response_model=List[MaterialResponse])
async def get_course_materials(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all materials for a course"""
    result = await db.execute(
        select(Material).where(Material.course_id == course_id)
    )
    materials = result.scalars().all()
    return [MaterialResponse.model_validate(m) for m in materials]


@router.post("/materials", response_model=MaterialResponse, status_code=201)
async def add_material(
    course_id: str = Form(...),
    lecture_id: Optional[str] = Form(None),
    title: str = Form(...),
    file_url: str = Form(...),
    file_type: str = Form(...),
    file_size: int = Form(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Add a material to a course/lecture"""
    material = Material(
        course_id=course_id,
        lecture_id=lecture_id,
        title=title,
        file_url=file_url,
        file_type=file_type,
        file_size=file_size,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)

    debug_logger.log("activity", f"Material added: {title}",
                     user_id=current_user.id)

    return MaterialResponse.model_validate(material)


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Delete a material"""
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    await db.delete(material)
    await db.commit()

    return {"message": "Material deleted"}
