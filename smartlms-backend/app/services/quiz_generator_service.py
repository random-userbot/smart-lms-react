"""
Smart LMS - Quiz Generator Service
AI-powered quiz generation using Groq API + lightweight web fact checking.
"""

from typing import List, Dict
import asyncio
import json
import urllib.parse
import urllib.request
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

        # Lightweight internet fact-checking for factual confidence signals.
        await _attach_fact_check(valid_questions)
        return valid_questions

    except Exception as e:
        raise Exception(f"Quiz generation failed: {str(e)}")

async def refine_quiz_questions(
    transcript: str,
    current_questions: List[Dict],
    feedback: str
) -> List[Dict]:
    """Refine generated quiz questions using Groq API based on teacher feedback"""
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

        prompt = f"""You are an educational quiz generator. The teacher has requested changes to the current quiz questions based on the following feedback:

Feedback: "{feedback}"

Here are the current questions:
{json.dumps(current_questions, indent=2)}

And here is the source lecture transcript for context:
{transcript}

Please modify the questions, add new ones, or remove ones based strictly on the teacher's feedback.
Ensure the output format remains exactly the same JSON array of question objects:
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
"""

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
            content = content.split("```json")[-1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[-1].split("```")[0]

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
        raise Exception(f"Quiz refinement failed: {str(e)}")


def _extract_primary_topic(question: str) -> str:
    cleaned = question.replace("?", " ").replace("'", " ").replace('"', " ")
    tokens = [t for t in cleaned.split() if t]
    # Prefer title-cased tokens as simple named-entity heuristic.
    title_tokens = [t for t in tokens if t[:1].isupper()]
    if title_tokens:
        return " ".join(title_tokens[:4])
    return " ".join(tokens[:5])


def _fetch_wikipedia_summary(topic: str) -> str:
    if not topic:
        return ""
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(topic)
    req = urllib.request.Request(url, headers={"User-Agent": "SmartLMS/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:  # nosec B310
        payload = json.loads(resp.read().decode("utf-8"))
    return (payload.get("extract") or "")[:1200]


async def _fact_check_question(question_obj: Dict) -> Dict:
    question_text = (question_obj.get("question") or "").strip()
    answer_text = str(question_obj.get("correct_answer") or "").strip()
    topic = _extract_primary_topic(question_text)

    if not question_text or not answer_text or not topic:
        return {"status": "unknown", "confidence": "low", "source": "wikipedia", "note": "Insufficient data to verify"}

    try:
        summary = await asyncio.get_event_loop().run_in_executor(None, _fetch_wikipedia_summary, topic)
        if not summary:
            return {"status": "unknown", "confidence": "low", "source": "wikipedia", "note": "No summary found"}

        answer_in_summary = answer_text.lower() in summary.lower()
        return {
            "status": "likely_true" if answer_in_summary else "needs_review",
            "confidence": "medium" if answer_in_summary else "low",
            "source": "wikipedia",
            "note": "Auto-check compares correct answer against public summary text",
        }
    except Exception:
        return {"status": "unknown", "confidence": "low", "source": "wikipedia", "note": "Fact check service unavailable"}


async def _attach_fact_check(questions: List[Dict]) -> None:
    # Keep latency bounded for quiz generation; check first 8 questions.
    tasks = [_fact_check_question(q) for q in questions[:8]]
    if not tasks:
        return
    results = await asyncio.gather(*tasks)
    for idx, result in enumerate(results):
        questions[idx]["fact_check"] = result
