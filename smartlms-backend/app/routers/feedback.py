"""
Smart LMS - Feedback Router
Post-lecture feedback submission with NLP analysis
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from app.database import get_db
from app.models.models import User, UserRole, Feedback, Lecture
from app.middleware.auth import get_current_user
from app.services.debug_logger import debug_logger

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


class FeedbackSubmit(BaseModel):
    lecture_id: str
    course_id: str
    overall_rating: int = Field(..., ge=1, le=5)
    content_quality: Optional[int] = Field(None, ge=1, le=5)
    teaching_clarity: Optional[int] = Field(None, ge=1, le=5)
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    text: Optional[str] = None
    suggestions: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    student_id: str
    lecture_id: str
    course_id: str
    overall_rating: int
    content_quality: Optional[int]
    teaching_clarity: Optional[int]
    difficulty_level: Optional[int]
    text: Optional[str]
    suggestions: Optional[str]
    sentiment: Optional[Dict]
    emotions: Optional[Dict]
    keywords: Optional[list]
    themes: Optional[list]
    created_at: datetime

    class Config:
        from_attributes = True


from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import string

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment_advanced(text: str) -> Dict:
    """Advanced sentiment analysis using VADER"""
    if not text:
        return {"label": "neutral", "positive": 0.33, "negative": 0.33, "neutral": 0.34}

    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    return {
        "label": label,
        "positive": round(scores['pos'], 3),
        "negative": round(scores['neg'], 3),
        "neutral": round(scores['neu'], 3),
    }


def extract_keywords_advanced(text: str) -> List[str]:
    """Keyword extraction using basic NLTK stopword filtering"""
    if not text:
        return []

    try:
        import nltk
        from nltk.corpus import stopwords
        from nltk.tokenize import word_tokenize
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        stop_words = set(stopwords.words('english'))
        
        # Tokenize and clean
        words = word_tokenize(text.lower())
        filtered = [w for w in words if w.isalnum() and w not in stop_words and len(w) > 2]
    except Exception:
        # Fallback to simple filtering if NLTK data isn't downloaded
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
                      "have", "has", "had", "do", "does", "did", "will", "would", "could",
                      "should", "may", "might", "can", "shall", "to", "of", "in", "for",
                      "on", "with", "at", "by", "from", "it", "this", "that", "i", "me",
                      "my", "we", "our", "you", "your", "he", "she", "they", "and", "but",
                      "or", "so", "very", "really", "just", "not", "no", "all", "also"}
        words = text.lower().translate(str.maketrans('', '', string.punctuation)).split()
        filtered = [w for w in words if w not in stop_words and len(w) > 2]

    # Count frequencies
    freq = {}
    for w in filtered:
        freq[w] = freq.get(w, 0) + 1

    return sorted(freq, key=freq.get, reverse=True)[:10]


@router.post("", response_model=FeedbackResponse, status_code=201)
async def submit_feedback(
    request: FeedbackSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit feedback for a lecture"""
    combined_text = f"{request.text or ''} {request.suggestions or ''}".strip()
    sentiment = analyze_sentiment_advanced(combined_text)
    keywords = extract_keywords_advanced(combined_text)

    feedback = Feedback(
        student_id=current_user.id,
        lecture_id=request.lecture_id,
        course_id=request.course_id,
        overall_rating=request.overall_rating,
        content_quality=request.content_quality,
        teaching_clarity=request.teaching_clarity,
        difficulty_level=request.difficulty_level,
        text=request.text,
        suggestions=request.suggestions,
        sentiment=sentiment,
        keywords=keywords,
        themes=[],
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    debug_logger.log("activity",
                     f"Feedback submitted: rating={request.overall_rating}, sentiment={sentiment['label']}",
                     user_id=current_user.id)

    return FeedbackResponse.model_validate(feedback)


@router.get("/lecture/{lecture_id}", response_model=List[FeedbackResponse])
async def get_lecture_feedback(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all feedback for a lecture"""
    query = select(Feedback).where(Feedback.lecture_id == lecture_id)
    if current_user.role == UserRole.STUDENT:
        query = query.where(Feedback.student_id == current_user.id)

    result = await db.execute(query.order_by(Feedback.created_at.desc()))
    feedbacks = result.scalars().all()
    return [FeedbackResponse.model_validate(f) for f in feedbacks]


@router.get("/course/{course_id}")
async def get_course_feedback_summary(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get feedback summary for a course"""
    result = await db.execute(
        select(Feedback).where(Feedback.course_id == course_id)
    )
    feedbacks = result.scalars().all()

    if not feedbacks:
        return {"course_id": course_id, "count": 0, "avg_rating": 0}

    avg_rating = sum(f.overall_rating for f in feedbacks) / len(feedbacks)
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    for f in feedbacks:
        if f.sentiment:
            sentiment_counts[f.sentiment.get("label", "neutral")] += 1

    return {
        "course_id": course_id,
        "count": len(feedbacks),
        "avg_rating": round(avg_rating, 1),
        "sentiment_distribution": sentiment_counts,
        "all_keywords": list(set(k for f in feedbacks if f.keywords for k in f.keywords))[:20],
    }
