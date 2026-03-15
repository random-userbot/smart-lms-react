"""
Smart LMS - Quiz Generator Service
AI-powered quiz generation using Groq API
"""

from typing import List, Dict
from app.config import settings


QUIZ_GENERATION_PROMPT = """You are an educational quiz generator. Generate {num_questions} quiz questions from the following lecture content.

Requirements:
- Mix question types: MCQ, True/False, Short Answer, Fill in the Blank
- Align with ICAP framework levels:
  * Passive: Basic recall questions (remember facts)
  * Active: Understanding questions (explain concepts)
  * Constructive: Application questions (apply knowledge)
  * Interactive: Analysis/synthesis questions (compare, evaluate, create)
- Difficulty: {difficulty}
- Include explanations for correct answers
- MULTI-LINGUAL SUPPORT: The transcript may be in any language (e.g., Japanese, Spanish, etc.). You must natively understand the transcript language, but output the final JSON and all questions/answers in English (or the primary language of the course, if obvious from context).

Output as JSON array with this format:
[
  {{
    "type": "mcq",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "A",
    "points": 1,
    "icap_level": "passive|active|constructive|interactive",
    "explanation": "..."
  }}
]

Lecture Content:
{transcript}
"""


async def generate_quiz_questions(
    transcript: str,
    num_questions: int = 10,
    difficulty: str = "medium",
    include_icap: bool = True,
) -> List[Dict]:
    """Generate quiz questions using Groq API"""
    if not settings.GROQ_API_KEY:
        raise Exception("Groq API key not configured")

    try:
        from groq import AsyncGroq
        import json

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        # Truncate transcript if too long
        max_chars = 6000
        if len(transcript) > max_chars:
            transcript = transcript[:max_chars] + "..."

        prompt = QUIZ_GENERATION_PROMPT.format(
            num_questions=num_questions,
            difficulty=difficulty,
            transcript=transcript,
        )

        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a precise educational quiz generator. Output ONLY a valid JSON array. Do not wrap in markdown or add conversational text."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
        )

        content = response.choices[0].message.content.strip()

        # Extract JSON from response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        questions = json.loads(content)

        # Validate and clean
        valid_questions = []
        for q in questions:
            if "question" in q and "correct_answer" in q:
                valid_questions.append({
                    "type": q.get("type", "mcq"),
                    "question": q["question"],
                    "options": q.get("options", []),
                    "correct_answer": q["correct_answer"],
                    "points": q.get("points", 1),
                    "icap_level": q.get("icap_level", "active"),
                    "explanation": q.get("explanation", ""),
                })

        return valid_questions

    except Exception as e:
        raise Exception(f"Quiz generation failed: {str(e)}")
