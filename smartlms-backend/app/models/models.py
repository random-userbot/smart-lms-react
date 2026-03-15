"""
Smart LMS - Database Models
All SQLAlchemy ORM models for the Smart LMS portal
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
import enum


def generate_uuid():
    return str(uuid.uuid4())


# ─── Enums ───────────────────────────────────────────────

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class EnrollmentStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    DROPPED = "dropped"


class NotificationType(str, enum.Enum):
    ANNOUNCEMENT = "announcement"
    QUIZ_AVAILABLE = "quiz_available"
    GRADE_POSTED = "grade_posted"
    ASSIGNMENT_DUE = "assignment_due"
    FEEDBACK_RECEIVED = "feedback_received"
    SYSTEM = "system"
    PRIVATE_MESSAGE = "private_message"
    TEACHER_MESSAGE = "teacher_message"


class MessageCategory(str, enum.Enum):
    ADVICE = "advice"
    ENCOURAGEMENT = "encouragement"
    WARNING = "warning"
    GENERAL = "general"
    ENGAGEMENT_ALERT = "engagement_alert"


class ICAPLevel(str, enum.Enum):
    INTERACTIVE = "interactive"
    CONSTRUCTIVE = "constructive"
    ACTIVE = "active"
    PASSIVE = "passive"


# ─── Users ───────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    courses_teaching = relationship("Course", back_populates="teacher", foreign_keys="Course.teacher_id")
    enrollments = relationship("Enrollment", back_populates="student")
    engagement_logs = relationship("EngagementLog", back_populates="student")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    feedbacks = relationship("Feedback", back_populates="student")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id")
    activity_logs = relationship("ActivityLog", back_populates="user")
    gamification = relationship("Gamification", back_populates="user", uselist=False)
    assignment_submissions = relationship("AssignmentSubmission", back_populates="student")
    messages_sent = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    messages_received = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")


# ─── Courses ─────────────────────────────────────────────

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=generate_uuid)
    teacher_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    teacher = relationship("User", back_populates="courses_teaching", foreign_keys=[teacher_id])
    lectures = relationship("Lecture", back_populates="course", cascade="all, delete-orphan", order_by="Lecture.order_index")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="course", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")
    teaching_scores = relationship("TeachingScore", back_populates="course", cascade="all, delete-orphan")


# ─── Enrollments ─────────────────────────────────────────

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    status = Column(SQLEnum(EnrollmentStatus), default=EnrollmentStatus.ACTIVE)
    progress = Column(Float, default=0.0)  # 0-100%
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

    __table_args__ = (
        Index("idx_enrollment_student_course", "student_id", "course_id", unique=True),
    )


# ─── Lectures ────────────────────────────────────────────

class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(String, primary_key=True, default=generate_uuid)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=True)  # Cloudinary URL
    youtube_url = Column(String(500), nullable=True)  # YouTube URL
    thumbnail_url = Column(String(500), nullable=True)
    transcript = Column(Text, nullable=True)
    duration = Column(Integer, default=0)  # seconds
    order_index = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="lectures")
    engagement_logs = relationship("EngagementLog", back_populates="lecture", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="lecture", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="lecture", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="lecture")
    attendance_records = relationship("Attendance", back_populates="lecture", cascade="all, delete-orphan")


# ─── Materials ───────────────────────────────────────────

class Material(Base):
    __tablename__ = "materials"

    id = Column(String, primary_key=True, default=generate_uuid)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    lecture_id = Column(String, ForeignKey("lectures.id"), nullable=True)
    title = Column(String(300), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, ppt, docx, txt, etc
    file_size = Column(Integer, default=0)  # bytes
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="materials")
    lecture = relationship("Lecture", back_populates="materials")


# ─── Quizzes ─────────────────────────────────────────────

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String, primary_key=True, default=generate_uuid)
    lecture_id = Column(String, ForeignKey("lectures.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    questions = Column(JSONB, nullable=False, default=list)
    # questions format: [{type: "mcq"|"short"|"true_false"|"fill_blank", question: str, options: [], correct_answer: str, points: int, icap_level: str}]
    time_limit = Column(Integer, default=600)  # seconds
    max_attempts = Column(Integer, default=1)
    is_published = Column(Boolean, default=False)
    anti_cheat_enabled = Column(Boolean, default=True)
    webcam_required = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lecture = relationship("Lecture", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=False)
    answers = Column(JSONB, nullable=False, default=dict)
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    violations = Column(JSONB, default=list)
    # violations: [{type: "tab_switch"|"copy_paste"|"focus_loss", timestamp: str, details: str}]
    engagement_data = Column(JSONB, nullable=True)
    integrity_score = Column(Float, default=100.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")


# ─── Engagement ──────────────────────────────────────────

class EngagementLog(Base):
    __tablename__ = "engagement_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    lecture_id = Column(String, ForeignKey("lectures.id"), nullable=False)
    session_id = Column(String, nullable=False)

    # Scores
    overall_score = Column(Float, nullable=True)
    boredom_score = Column(Float, nullable=True)
    engagement_score = Column(Float, nullable=True)
    confusion_score = Column(Float, nullable=True)
    frustration_score = Column(Float, nullable=True)

    # Feature data
    features = Column(JSONB, nullable=True)
    # features: {gaze_score, head_pose, eye_aspect_ratio, blink_rate, au_values, ...}
    scores_timeline = Column(JSONB, nullable=True)
    # scores_timeline: [{timestamp, engagement, boredom, confusion, frustration}, ...]

    # SHAP explanations
    shap_explanations = Column(JSONB, nullable=True)
    # {feature_contributions: {gaze: 0.3, head_pose: -0.1, ...}, top_factors: [...]}

    # ICAP classification
    icap_classification = Column(SQLEnum(ICAPLevel), nullable=True)
    icap_evidence = Column(JSONB, nullable=True)

    # Behavioral data
    keyboard_events = Column(Integer, default=0)
    mouse_events = Column(Integer, default=0)
    tab_switches = Column(Integer, default=0)
    idle_time = Column(Float, default=0.0)  # seconds
    playback_speeds = Column(JSONB, nullable=True)  # [{timestamp, speed}, ...]
    note_taking_detected = Column(Boolean, default=False)

    # Session timing
    watch_duration = Column(Integer, default=0)  # seconds actually watched
    total_duration = Column(Integer, default=0)  # video total length
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("User", back_populates="engagement_logs")
    lecture = relationship("Lecture", back_populates="engagement_logs")

    __table_args__ = (
        Index("idx_engagement_student_lecture", "student_id", "lecture_id"),
        Index("idx_engagement_session", "session_id"),
    )


# ─── Feedback ────────────────────────────────────────────

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    lecture_id = Column(String, ForeignKey("lectures.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)

    # Ratings
    overall_rating = Column(Integer, nullable=False)  # 1-5
    content_quality = Column(Integer, nullable=True)  # 1-5
    teaching_clarity = Column(Integer, nullable=True)  # 1-5
    difficulty_level = Column(Integer, nullable=True)  # 1-5

    # Text
    text = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)

    # NLP analysis
    sentiment = Column(JSONB, nullable=True)
    # {label: "positive"|"negative"|"neutral", positive: 0.8, negative: 0.1, neutral: 0.1}
    emotions = Column(JSONB, nullable=True)
    # {happiness: 0.5, sadness: 0.1, anger: 0.0, frustration: 0.1, confusion: 0.2}
    keywords = Column(JSONB, nullable=True)
    themes = Column(JSONB, nullable=True)
    aspect_sentiment = Column(JSONB, nullable=True)
    # {content: {score: 0.8, label: "positive"}, delivery: {...}, difficulty: {...}}

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="feedbacks")
    lecture = relationship("Lecture", back_populates="feedbacks")


# ─── Assignments ─────────────────────────────────────────

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=generate_uuid)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    questions = Column(JSONB, nullable=True)  # [{question, points, type}]
    file_url = Column(String(500), nullable=True)  # Assignment file
    max_score = Column(Float, default=100.0)
    due_date = Column(DateTime, nullable=True)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="assignments")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    assignment_id = Column(String, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    file_url = Column(String(500), nullable=True)
    text = Column(Text, nullable=True)
    grade = Column(Float, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime, nullable=True)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="assignment_submissions")


# ─── Teaching Scores ─────────────────────────────────────

class TeachingScore(Base):
    __tablename__ = "teaching_scores"

    id = Column(String, primary_key=True, default=generate_uuid)
    teacher_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)

    # Component scores (0-100)
    engagement_score = Column(Float, default=0.0)
    quiz_score = Column(Float, default=0.0)
    attendance_score = Column(Float, default=0.0)
    feedback_score = Column(Float, default=0.0)
    completion_score = Column(Float, default=0.0)
    resource_score = Column(Float, default=0.0)
    activity_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)

    # Explainability
    shap_breakdown = Column(JSONB, nullable=True)
    recommendations = Column(JSONB, nullable=True)

    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="teaching_scores")


# ─── Attendance ──────────────────────────────────────────

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    lecture_id = Column(String, ForeignKey("lectures.id"), nullable=False)
    presence_score = Column(Float, default=0.0)  # 0-100
    face_detected_pct = Column(Float, default=0.0)  # % of time face was detected
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    # Relationships
    lecture = relationship("Lecture", back_populates="attendance_records")


# ─── Notifications ───────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=True)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=True)
    extra_data = Column(JSONB, nullable=True)  # {course_id, lecture_id, quiz_id, etc}
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])


# ─── Activity Logs ───────────────────────────────────────

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    # actions: login, logout, lecture_start, lecture_end, quiz_start, quiz_submit,
    # feedback_submit, course_enroll, material_download, tab_switch, etc
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")

    __table_args__ = (
        Index("idx_activity_user_action", "user_id", "action"),
        Index("idx_activity_created", "created_at"),
    )


# ─── Gamification ────────────────────────────────────────

class Gamification(Base):
    __tablename__ = "gamification"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    badges = Column(JSONB, default=list)
    # badges: [{id, name, description, icon, earned_at}]
    streaks = Column(JSONB, default=dict)
    # streaks: {current: 0, longest: 0, last_active: "2024-01-01"}
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="gamification")


# ─── ICAP Logs ───────────────────────────────────────────

class ICAPLog(Base):
    __tablename__ = "icap_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    lecture_id = Column(String, ForeignKey("lectures.id"), nullable=False)
    classification = Column(SQLEnum(ICAPLevel), nullable=False)
    evidence = Column(JSONB, nullable=True)
    # evidence: {keyboard_activity, quiz_score, note_taking, interaction_count, ...}
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Messages ────────────────────────────────────────────

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)  # Optional: linked to course context
    subject = Column(String(300), nullable=True)
    content = Column(Text, nullable=False)
    category = Column(SQLEnum(MessageCategory), default=MessageCategory.GENERAL)
    is_read = Column(Boolean, default=False)
    parent_id = Column(String, ForeignKey("messages.id"), nullable=True)  # For threads
    analytics_context = Column(JSONB, nullable=True)
    # analytics_context: {engagement_score, icap_level, quiz_avg, trigger: "low_engagement"|"manual"}
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sender = relationship("User", back_populates="messages_sent", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="messages_received", foreign_keys=[receiver_id])
    course = relationship("Course")
    replies = relationship("Message", backref="parent", remote_side=[id])

    __table_args__ = (
        Index("idx_message_receiver", "receiver_id", "is_read"),
        Index("idx_message_sender", "sender_id"),
        Index("idx_message_course", "course_id"),
        Index("idx_message_created", "created_at"),
    )
