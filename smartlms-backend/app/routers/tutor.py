"""
Smart LMS - AI Tutor Router
Multimodal language practice and conversational tutoring via Groq LLaMA
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional
import json
import asyncio

from app.database import get_db
from app.models.models import User
from app.middleware.auth import get_current_user
from app.config import settings
from app.services.debug_logger import debug_logger

router = APIRouter(prefix="/api/tutor", tags=["AI Tutor"])

class ChatMessage(BaseModel):
    role: str
    content: str

class TutorChatRequest(BaseModel):
    messages: List[ChatMessage]
    mode: str = "general" # general, language_practice, grammar_check
    target_language: Optional[str] = None # e.g. "Spanish"
    lecture_id: Optional[str] = None # Context-aware tutoring

SYSTEM_PROMPTS = {
    "general": "You are a friendly, encouraging, and highly knowledgeable AI Tutor for the Smart LMS. Explain concepts clearly using the socratic method when appropriate.",
    "language_practice": "You are a native-speaking language exchange partner. The user wants to practice {target_language}. Keep responses conversational, natural, and relatively brief to mimic real chat. Gently correct major errors without breaking the flow.",
    "grammar_check": "You are a strict but helpful grammar teacher for {target_language}. Analyze the user's latest message, point out any grammar/spelling errors, explain why they are wrong, and provide the correct version.",
}

@router.post("/chat")
async def chat_with_tutor(
    request: TutorChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream a chat response from the AI tutor"""
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    try:
        from groq import AsyncGroq
        from sqlalchemy import select
        from app.models.models import Lecture
        
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        
        # Determine system prompt
        sys_prompt_template = SYSTEM_PROMPTS.get(request.mode, SYSTEM_PROMPTS["general"])
        sys_prompt = sys_prompt_template.replace("{target_language}", request.target_language or "the language")
        
        # Deep Context: Fetch Student History
        from app.models.models import EngagementLog, QuizAttempt, ICAPLog
        from sqlalchemy import func
        
        # Get avg engagement
        avg_eng_res = await db.execute(select(func.avg(EngagementLog.engagement_score)).where(EngagementLog.student_id == current_user.id))
        avg_eng = avg_eng_res.scalar() or 50.0
        
        # Get latest ICAP
        icap_res = await db.execute(select(ICAPLog.classification).where(ICAPLog.student_id == current_user.id).order_by(ICAPLog.created_at.desc()).limit(1))
        latest_icap = icap_res.scalar() or "passive"
        
        # Get avg quiz
        quiz_res = await db.execute(select(func.avg(QuizAttempt.score / QuizAttempt.max_score)).where(QuizAttempt.student_id == current_user.id, QuizAttempt.max_score > 0))
        avg_quiz = (quiz_res.scalar() or 0.0) * 100
        
        sys_prompt += f"\n\nStudent Deep Context:\n- Average Engagement: {avg_eng:.1f}%\n- Recent Learning State (ICAP): {latest_icap.upper()}\n- Average Quiz Score: {avg_quiz:.1f}%\n"
        sys_prompt += "Use this context to adapt your teaching style. If engagement is low or state is passive, be more interactive and engaging. If quiz scores are low, break down concepts simpler."
        
        # Make context-aware if lecture_id provided
        if request.lecture_id:
            result = await db.execute(select(Lecture).where(Lecture.id == request.lecture_id))
            lecture = result.scalar_one_or_none()
            if lecture and lecture.transcript:
                sys_prompt += f"\n\nCurrent Lecture Transcript Context ('{lecture.title}'):\n{lecture.transcript[:4000]}...\n\nCRITICAL: The transcript might be in a different language. Native parse it, but always converse with the student in their preferred language, explaining the concepts clearly."
        
        # Intelligent Model Routing based on use case
        model_name = "llama-3.3-70b-versatile" # Default robust model
        if request.mode == "general":
            model_name = "qwen-2.5-32b" # Known for deep reasoning
        elif request.mode == "language_practice":
            model_name = "mixtral-8x7b-32768" # Fast, good multilingual
        # Note: adjust names based on exact Groq availability, substituting the user's requested Qwen/Kimi as available standard IDs

        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in request.messages[-10:]: # Keep last 10 messages for context window
            messages.append({"role": msg.role, "content": msg.content})

        async def generate_response():
            try:
                stream = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2048,
                    stream=True
                )
                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                debug_logger.log("error", f"Tutor streaming error: {str(e)}")
                yield f"\n\n[Error communicating with AI Tutor: {str(e)}]"

        debug_logger.log("activity", f"AI Tutor chat ({request.mode}) initiated", user_id=current_user.id)
        
        return StreamingResponse(
            generate_response(), 
            media_type="text/event-stream"
        )
        
    except Exception as e:
        debug_logger.log("error", f"Tutor initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
