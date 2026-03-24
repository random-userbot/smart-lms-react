"""
Smart LMS - Engagement Router
Receive client-side features, compute engagement scores, store with SHAP explanations.

Upgraded to use XGBoost ML model with real SHAP explanations,
enhanced ICAP classification, and fuzzy rule explanations.
Based on: "Designing an Explainable Multimodal Engagement Model"
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import time
import logging
import numpy as np
from app.database import get_db
from app.models.models import (
    User, UserRole, EngagementLog, ICAPLog, ICAPLevel,
    Attendance, ActivityLog, Lecture
)
from app.middleware.auth import get_current_user, get_current_user_optional
from app.services.debug_logger import debug_logger
from app.ml.engagement_model import (
    get_engagement_model, get_icap_classifier, get_fuzzy_rules,
    EngagementFeatureExtractor, FEATURE_NAMES
)
from app.ml.export_inference_registry import get_export_model_registry

router = APIRouter(prefix="/api/engagement", tags=["Engagement"])
logger = logging.getLogger("uvicorn.error")


# ─── Schemas ─────────────────────────────────────────────

class EngagementFeatures(BaseModel):
    """Features extracted client-side from MediaPipe"""
    session_id: str
    lecture_id: str
    timestamp: float

    # Facial features
    gaze_score: float = 0.0           # 0-1, 1 = looking at screen
    head_pose_yaw: float = 0.0        # degrees
    head_pose_pitch: float = 0.0
    head_pose_roll: float = 0.0
    head_pose_stability: float = 0.0  # 0-1
    eye_aspect_ratio_left: float = 0.0
    eye_aspect_ratio_right: float = 0.0
    blink_rate: float = 0.0           # blinks per minute
    mouth_openness: float = 0.0       # 0-1

    # Action Unit proxies
    au01_inner_brow_raise: float = 0.0
    au02_outer_brow_raise: float = 0.0
    au04_brow_lowerer: float = 0.0
    au06_cheek_raiser: float = 0.0
    au12_lip_corner_puller: float = 0.0  # smile
    au15_lip_corner_depressor: float = 0.0
    au25_lips_part: float = 0.0
    au26_jaw_drop: float = 0.0

    # Optional OpenFace-compatible fields (accepted if present)
    au07_lid_tightener: float = 0.0
    au09_nose_wrinkler: float = 0.0
    au10_upper_lip_raiser: float = 0.0
    au14_dimpler: float = 0.0
    au17_chin_raiser: float = 0.0
    au20_lip_stretcher: float = 0.0
    au23_lip_tightener: float = 0.0
    au45_blink: float = 0.0

    gaze_angle_x: float = 0.0
    gaze_angle_y: float = 0.0
    pose_Tx: float = 0.0
    pose_Ty: float = 0.0
    pose_Tz: float = 0.0
    pose_Rx: float = 0.0
    pose_Ry: float = 0.0
    pose_Rz: float = 0.0

    happy: float = 0.0
    sad: float = 0.0
    angry: float = 0.0
    surprised: float = 0.0
    fear: float = 0.0
    disgust: float = 0.0
    neutral: float = 0.0

    # Behavioral (from browser)
    keyboard_active: bool = False
    mouse_active: bool = False
    tab_visible: bool = True
    playback_speed: float = 1.0
    note_taking: bool = False  # head-down detection


class EngagementBatchSubmit(BaseModel):
    """Batch of features for a session segment"""
    session_id: str
    lecture_id: str
    features: List[EngagementFeatures]
    keyboard_events: int = 0
    mouse_events: int = 0
    tab_switches: int = 0
    idle_time: float = 0.0
    playback_speeds: List[Dict[str, Any]] = []
    watch_duration: int = 0
    total_duration: int = 0


class EngagementScoreResponse(BaseModel):
    overall_score: float
    boredom: float
    engagement: float
    confusion: float
    frustration: float
    icap_classification: str
    icap_confidence: float = 0.0
    shap_explanations: Dict[str, Any] = {}
    top_factors: List[Dict[str, Any]] = []
    fuzzy_rules: List[Dict[str, str]] = []
    recommendations: List[str] = []
    model_type: str = "rule_based"
    confidence: float = 0.0
    ensemble_models: List[str] = []
    ensemble_model_count: int = 0
    model_breakdown: Dict[str, Any] = {}


class SessionEndRequest(BaseModel):
    session_id: str
    lecture_id: str


class ModelInferenceRequest(BaseModel):
    model_id: str
    features: List[EngagementFeatures]


# ─── ML-Powered Engagement Scoring Engine ────────────────

def compute_engagement_scores(features: List[EngagementFeatures]) -> Dict:
    """
    Compute engagement scores using the ML model (XGBoost + SHAP).
    Falls back to enhanced rule-based scoring if model not loaded.
    
    Returns scores, SHAP explanations, top factors, and confidence.
    """
    model = get_engagement_model()
    features_dicts = [f.model_dump() for f in features] if features else []
    return model.predict(features_dicts)


def compute_shap_explanations(features: List[EngagementFeatures], scores: Dict) -> Dict:
    """
    Get SHAP explanations - now integrated into the model prediction.
    This function extracts the SHAP data from the model's output.
    """
    return scores.get("shap_explanations", {})


def _expected_score_from_probabilities(probabilities: List[float]) -> float:
    """Convert class probabilities to a 0-100 expected score."""
    if not probabilities:
        return 0.0

    total = sum(float(p) for p in probabilities)
    if total <= 0:
        return 0.0

    probs = [float(p) / total for p in probabilities]
    max_class = max(len(probs) - 1, 1)
    expected_class = sum(idx * p for idx, p in enumerate(probs))
    return (expected_class / max_class) * 100.0


def _extract_export_scores(export_result: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """Extract comparable 0-100 per-dimension scores from export model output."""
    output = export_result.get("output", {}) if isinstance(export_result, dict) else {}
    dims = output.get("dimensions", {}) if isinstance(output, dict) else {}

    if not dims:
        return None

    parsed: Dict[str, float] = {}
    for key in ["boredom", "engagement", "confusion", "frustration"]:
        dim_data = dims.get(key) or {}
        probs = dim_data.get("probabilities")
        if isinstance(probs, list) and probs:
            parsed[key] = round(_expected_score_from_probabilities(probs), 2)
        else:
            class_index = float(dim_data.get("class_index", 0))
            parsed[key] = round((class_index / 3.0) * 100.0, 2)

    parsed["overall"] = float(output.get("overall_proxy", np.mean([parsed[k] for k in ["boredom", "engagement", "confusion", "frustration"]])))
    return parsed


def apply_export_xgb_ensemble(scores: Dict[str, Any], features: List[EngagementFeatures]) -> Dict[str, Any]:
    """
    Blend XGBoost runtime scores with available export models using simple averaging.
    Keeps XGBoost SHAP/top factors as the explainability backbone.
    """
    features_dicts = [f.model_dump() for f in features] if features else []
    if not features_dicts:
        return scores

    try:
        registry = get_export_model_registry()
        listed = registry.list_models()
        export_candidates = [m for m in listed if m.get("family") == "export_keras" and m.get("status") != "error"]
        if not export_candidates:
            return scores

        # Prefer recommended exports first; if none, use all discovered models.
        recommended = [m for m in export_candidates if m.get("recommended")]
        selected_models = recommended if recommended else export_candidates

        export_predictions: List[Dict[str, float]] = []
        used_model_names: List[str] = []
        used_model_ids: List[str] = []
        base_xgb = {
            "overall": float(scores.get("overall", 0.0) or 0.0),
            "boredom": float(scores.get("boredom", 0.0) or 0.0),
            "engagement": float(scores.get("engagement", 0.0) or 0.0),
            "confusion": float(scores.get("confusion", 0.0) or 0.0),
            "frustration": float(scores.get("frustration", 0.0) or 0.0),
        }
        model_breakdown: Dict[str, Any] = {
            "xgboost_runtime": base_xgb,
            "exports": {},
        }

        for model_info in selected_models:
            model_id = model_info.get("model_id")
            if not model_id:
                continue
            try:
                result = registry.infer(model_id=model_id, features=features_dicts)
                parsed = _extract_export_scores(result)
                if parsed:
                    export_predictions.append(parsed)
                    used_model_ids.append(model_id)
                    used_model_names.append(model_info.get("name", model_id))
                    model_breakdown["exports"][model_id] = parsed
            except Exception:
                # Skip unavailable/mismatched export models without failing engagement submission.
                continue

        if not export_predictions:
            return scores

        def _clamp_score(v: float) -> float:
            return max(0.0, min(100.0, float(v)))

        dims = ["overall", "boredom", "engagement", "confusion", "frustration"]
        for dim in dims:
            values = [float(scores.get(dim, 0.0))] + [float(p.get(dim, 0.0)) for p in export_predictions]
            scores[dim] = round(_clamp_score(float(np.mean(values))), 2)

        export_confidence = 0.0
        if export_predictions:
            # Confidence proxy from the number of agreeing export models.
            export_confidence = min(0.99, 0.60 + (0.05 * len(export_predictions)))
        xgb_conf = float(scores.get("confidence", 0.0) or 0.0)
        scores["confidence"] = round((xgb_conf + export_confidence) / 2.0, 4)

        scores["model_type"] = f"xgboost+export_ensemble({len(export_predictions)})"
        scores["ensemble_models"] = used_model_names
        scores["ensemble_model_ids"] = used_model_ids
        model_breakdown["ensemble"] = {
            "overall": scores.get("overall", 0.0),
            "boredom": scores.get("boredom", 0.0),
            "engagement": scores.get("engagement", 0.0),
            "confusion": scores.get("confusion", 0.0),
            "frustration": scores.get("frustration", 0.0),
            "confidence": scores.get("confidence", 0.0),
        }
        scores["model_breakdown"] = model_breakdown
        return scores
    except Exception:
        return scores


def classify_icap(
    features: List[EngagementFeatures],
    keyboard_events: int,
    mouse_events: int = 0,
    tab_switches: int = 0,
    quiz_score: Optional[float] = None,
) -> tuple:
    """
    Classify student behavior into ICAP framework level using the enhanced classifier.
    Returns (level, evidence, confidence).
    """
    classifier = get_icap_classifier()
    features_dicts = [f.model_dump() for f in features] if features else []
    return classifier.classify(
        features_dicts,
        keyboard_events=keyboard_events,
        mouse_events=mouse_events,
        tab_switches=tab_switches,
        quiz_score=quiz_score,
        note_taking_detected=any(
            (f.get("note_taking", False) if isinstance(f, dict) else getattr(f, "note_taking", False))
            for f in features_dicts
        ) if features_dicts else False,
    )


def compute_fuzzy_rules(features: List[EngagementFeatures], scores: Dict) -> List[Dict]:
    """
    Evaluate fuzzy logic rules for human-readable engagement explanations.
    Based on Zhao et al. (2024).
    """
    fuzzy = get_fuzzy_rules()
    features_dicts = [f.model_dump() for f in features] if features else []
    feature_vector = EngagementFeatureExtractor.extract_from_batch(features_dicts)
    return fuzzy.evaluate(feature_vector, scores)


def build_scores_timeline(features: List[EngagementFeatures], watch_duration: int) -> List[Dict[str, Any]]:
    """Create lightweight timeline points from raw feature frames for heatmap rendering."""
    if not features:
        return []

    frame_count = len(features)
    base_time = max(0, int(watch_duration) - frame_count)
    timeline: List[Dict[str, Any]] = []

    for idx, f in enumerate(features):
        gaze = max(0.0, min(1.0, float(getattr(f, "gaze_score", 0.0) or 0.0)))
        stability = max(0.0, min(1.0, float(getattr(f, "head_pose_stability", 0.0) or 0.0)))
        tab_visible = 1.0 if getattr(f, "tab_visible", True) else 0.0
        keyboard = 1.0 if getattr(f, "keyboard_active", False) else 0.0
        mouse = 1.0 if getattr(f, "mouse_active", False) else 0.0

        engagement = (gaze * 65.0) + (stability * 20.0) + (tab_visible * 10.0) + ((keyboard + mouse) * 2.5)
        engagement = max(0.0, min(100.0, engagement))

        confusion = max(0.0, min(100.0, 60.0 - (gaze * 30.0) - (stability * 15.0)))
        boredom = max(0.0, min(100.0, 70.0 - engagement))
        frustration = max(0.0, min(100.0, (confusion * 0.6) + ((1.0 - gaze) * 20.0)))

        timeline.append(
            {
                "timestamp": base_time + idx,
                "engagement": round(engagement, 2),
                "boredom": round(boredom, 2),
                "confusion": round(confusion, 2),
                "frustration": round(frustration, 2),
            }
        )

    return timeline


def generate_recommendations(scores: Dict, icap: str, fuzzy_rules: List[Dict] = None) -> List[str]:
    """
    Generate actionable recommendations based on engagement analysis.
    Enhanced with ICAP-aware suggestions following the research paper.
    """
    recs = []

    # Score-based recommendations
    if scores.get("engagement", 50) < 40:
        recs.append("Consider breaking content into shorter segments to maintain attention")
    if scores.get("boredom", 30) > 60:
        recs.append("Include interactive elements or discussion prompts to reduce boredom")
    if scores.get("confusion", 20) > 50:
        recs.append("Review pace and complexity of content; add more examples or explanations")
    if scores.get("frustration", 10) > 50:
        recs.append("Check if prerequisites are met; provide additional support resources")

    # ICAP-based recommendations (P→A→C→I progression)
    if icap == ICAPLevel.PASSIVE.value:
        recs.append("Student is in PASSIVE mode. Encourage active note-taking or provide guided worksheets")
        recs.append("Consider adding quiz checkpoints to move from Passive to Active learning")
    elif icap == ICAPLevel.ACTIVE.value:
        recs.append("Student is ACTIVELY watching. Add reflection prompts to promote Constructive learning")
        recs.append("Try adding open-ended questions to encourage deeper processing")
    elif icap == ICAPLevel.CONSTRUCTIVE.value:
        recs.append("Student is in CONSTRUCTIVE mode (taking notes). Encourage peer discussion for Interactive learning")
    elif icap == ICAPLevel.INTERACTIVE.value:
        recs.append("Excellent! Student is in INTERACTIVE mode - the highest ICAP level")

    # Add fuzzy rule suggestions
    if fuzzy_rules:
        for rule in fuzzy_rules:
            if rule.get("severity") in ["high", "medium"] and rule.get("suggestion"):
                if rule["suggestion"] not in recs:
                    recs.append(rule["suggestion"])

    if not recs:
        recs.append("Engagement levels are healthy. Continue with current approach.")

    return recs[:8]  # Limit to top 8 recommendations


# ─── Routes ──────────────────────────────────────────────

@router.post("/submit", response_model=EngagementScoreResponse)
async def submit_engagement_data(
    request: EngagementBatchSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a batch of engagement features and get ML-powered scores with SHAP explanations"""
    # Compute scores using ML model (XGBoost + SHAP)
    scores = compute_engagement_scores(request.features)
    shap = compute_shap_explanations(request.features, scores)
    # Blend export models with XGBoost by averaging available model outputs.
    scores = apply_export_xgb_ensemble(scores, request.features)
    
    # Enhanced ICAP classification
    icap_level, icap_evidence, icap_confidence = classify_icap(
        request.features,
        keyboard_events=request.keyboard_events,
        mouse_events=request.mouse_events,
        tab_switches=request.tab_switches,
    )
    
    # Fuzzy rule evaluation for human-readable explanations
    fuzzy_rules = compute_fuzzy_rules(request.features, scores)
    
    # Generate enhanced recommendations
    recommendations = generate_recommendations(scores, icap_level, fuzzy_rules)
    timeline_points = build_scores_timeline(request.features, request.watch_duration)

    # Store engagement log
    log = EngagementLog(
        student_id=current_user.id,
        lecture_id=request.lecture_id,
        session_id=request.session_id,
        overall_score=scores["overall"],
        boredom_score=scores["boredom"],
        engagement_score=scores["engagement"],
        confusion_score=scores["confusion"],
        frustration_score=scores["frustration"],
        features={
            "count": len(request.features),
            "avg_gaze": sum(f.gaze_score for f in request.features) / max(len(request.features), 1),
            "avg_head_stability": sum(f.head_pose_stability for f in request.features) / max(len(request.features), 1),
            "model_type": scores.get("model_type", "rule_based"),
            "confidence": scores.get("confidence", 0),
            "ensemble_models": scores.get("ensemble_models", []),
            "model_breakdown": scores.get("model_breakdown", {}),
        },
        scores_timeline=timeline_points,
        shap_explanations={
            "feature_contributions": shap,
            "top_factors": scores.get("top_factors", []),
        },
        icap_classification=ICAPLevel(icap_level),
        icap_evidence={
            **icap_evidence,
            "confidence": icap_confidence,
        },
        keyboard_events=request.keyboard_events,
        mouse_events=request.mouse_events,
        tab_switches=request.tab_switches,
        idle_time=request.idle_time,
        playback_speeds=request.playback_speeds,
        note_taking_detected=any(f.note_taking for f in request.features),
        watch_duration=request.watch_duration,
        total_duration=request.total_duration,
    )
    db.add(log)

    # Store ICAP log
    icap_log = ICAPLog(
        student_id=current_user.id,
        lecture_id=request.lecture_id,
        classification=ICAPLevel(icap_level),
        evidence={
            **icap_evidence,
            "confidence": icap_confidence,
        },
    )
    db.add(icap_log)

    # Update attendance
    attendance = Attendance(
        student_id=current_user.id,
        lecture_id=request.lecture_id,
        presence_score=scores["engagement"],
        face_detected_pct=sum(1 for f in request.features if f.gaze_score > 0) / max(len(request.features), 1) * 100,
    )
    db.add(attendance)

    await db.commit()

    # Debug log
    debug_logger.log_engagement(
        student_id=current_user.id,
        lecture_id=request.lecture_id,
        features={"count": len(request.features), "tab_switches": request.tab_switches},
        scores=scores,
        shap_data=shap,
    )

    return EngagementScoreResponse(
        overall_score=scores["overall"],
        boredom=scores["boredom"],
        engagement=scores["engagement"],
        confusion=scores["confusion"],
        frustration=scores["frustration"],
        icap_classification=icap_level,
        icap_confidence=icap_confidence,
        shap_explanations=shap,
        top_factors=scores.get("top_factors", []),
        fuzzy_rules=fuzzy_rules,
        recommendations=recommendations,
        model_type=scores.get("model_type", "rule_based"),
        confidence=scores.get("confidence", 0),
        ensemble_models=scores.get("ensemble_models", []),
        ensemble_model_count=len(scores.get("ensemble_models", [])),
        model_breakdown=scores.get("model_breakdown", {}),
    )


@router.get("/history/{lecture_id}")
async def get_engagement_history(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get engagement history for a lecture"""
    result = await db.execute(
        select(EngagementLog).where(
            EngagementLog.student_id == current_user.id,
            EngagementLog.lecture_id == lecture_id,
        ).order_by(EngagementLog.started_at.desc())
    )
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "session_id": log.session_id,
            "overall_score": log.overall_score,
            "engagement_score": log.engagement_score,
            "boredom_score": log.boredom_score,
            "confusion_score": log.confusion_score,
            "frustration_score": log.frustration_score,
            "icap_classification": log.icap_classification.value if log.icap_classification else None,
            "shap_explanations": log.shap_explanations,
            "tab_switches": log.tab_switches,
            "keyboard_events": log.keyboard_events,
            "watch_duration": log.watch_duration,
            "started_at": log.started_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/student-summary/{student_id}")
async def get_student_engagement_summary(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get engagement summary for a student (teacher/admin view)"""
    if current_user.role == UserRole.STUDENT and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Cannot view other students' data")

    result = await db.execute(
        select(EngagementLog).where(EngagementLog.student_id == student_id)
        .order_by(EngagementLog.started_at.desc())
    )
    logs = result.scalars().all()

    if not logs:
        return {"student_id": student_id, "sessions": 0, "avg_engagement": 0}

    avg_engagement = sum(l.engagement_score or 0 for l in logs) / len(logs)
    avg_boredom = sum(l.boredom_score or 0 for l in logs) / len(logs)

    # ICAP distribution
    icap_counts = {}
    for log in logs:
        if log.icap_classification:
            k = log.icap_classification.value
            icap_counts[k] = icap_counts.get(k, 0) + 1

    # Collect latest recommendations & top weaknesses
    # Collect latest recommendations from SHAP explanations
    recent_recs = []
    for log in logs[:3]: # Look at last 3 sessions
        recs = getattr(log, 'recommendations', None)
        if not recs and log.shap_explanations:
            recs = log.shap_explanations.get('recommendations', [])
        if recs:
            recent_recs.extend(recs)
    recent_recs = list(set(recent_recs))[:5] # Deduplicate and limit

    return {
        "student_id": student_id,
        "sessions": len(logs),
        "avg_engagement": round(avg_engagement, 1),
        "avg_boredom": round(avg_boredom, 1),
        "total_watch_time": sum(l.watch_duration or 0 for l in logs),
        "total_tab_switches": sum(l.tab_switches or 0 for l in logs),
        "icap_distribution": icap_counts,
        "insights": recent_recs,
    }


@router.get("/heatmap/{lecture_id}")
async def get_engagement_heatmap(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get engagement heatmap data for a lecture.
    Maps time segments to aggregate attention levels.
    High-intensity (red) = replayed/lingered; Low (blue) = skipped.
    Based on research: engagement heatmaps pinpoint confusing sections.
    """
    lecture_result = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lecture = lecture_result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    result = await db.execute(
        select(EngagementLog).where(EngagementLog.lecture_id == lecture_id).order_by(EngagementLog.started_at)
    )
    logs = result.scalars().all()

    if not logs:
        return {"lecture_id": lecture_id, "segments": [], "avg_engagement": 0, "pain_points": []}

    duration = lecture.duration or 300
    segment_count = min(20, max(5, duration // 30))
    segment_length = duration / segment_count

    # Flatten timeline entries once to avoid nested repeated scans.
    timeline_entries = []
    for log in logs:
        if log.scores_timeline:
            for entry in log.scores_timeline:
                timeline_entries.append(
                    {
                        "timestamp": entry.get("timestamp", 0),
                        "engagement": entry.get("engagement", 50),
                        "boredom": entry.get("boredom", 30),
                        "confusion": entry.get("confusion", 20),
                    }
                )

    segments = []
    for seg_idx in range(segment_count):
        start_time = seg_idx * segment_length
        end_time = (seg_idx + 1) * segment_length
        seg_engagement, seg_boredom, seg_confusion = [], [], []

        for entry in timeline_entries:
            ts = entry.get("timestamp", 0)
            if start_time <= ts < end_time:
                seg_engagement.append(entry.get("engagement", 50))
                seg_boredom.append(entry.get("boredom", 30))
                seg_confusion.append(entry.get("confusion", 20))

        # ONLY ADD SEGMENTS WITH REAL DATA - NEVER USE DUMMY/FALLBACK DATA
        if seg_engagement:
            avg_eng = sum(seg_engagement) / max(len(seg_engagement), 1)
            avg_bore = sum(seg_boredom) / max(len(seg_boredom), 1)
            avg_conf = sum(seg_confusion) / max(len(seg_confusion), 1)

            segments.append({
                "index": seg_idx,
                "start_time": round(start_time, 1),
                "end_time": round(end_time, 1),
                "engagement": round(avg_eng, 1),
                "boredom": round(avg_bore, 1),
                "confusion": round(avg_conf, 1),
                "intensity": round(avg_eng / 100.0, 3),
                "student_count": len(set(l.student_id for l in logs)),
            })

    pain_points = [
        {
            "segment": s["index"],
            "time_range": f"{int(s['start_time'])}s - {int(s['end_time'])}s",
            "issue": "high_confusion" if s["confusion"] > 50 else "low_engagement",
            "severity": "high" if s["engagement"] < 25 or s["confusion"] > 70 else "medium",
        }
        for s in segments if s["engagement"] < 40 or s["confusion"] > 50
    ]

    return {
        "lecture_id": lecture_id,
        "lecture_title": lecture.title,
        "duration": duration,
        "segment_count": segment_count,
        "segments": segments,
        "avg_engagement": round(sum(s["engagement"] for s in segments) / max(len(segments), 1), 1),
        "pain_points": pain_points,
        "total_views": len(logs),
    }


@router.get("/heatmap/{lecture_id}/me")
async def get_my_engagement_heatmap(
    lecture_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get student-specific engagement heatmap for current user and lecture."""
    lecture_result = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lecture = lecture_result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    result = await db.execute(
        select(EngagementLog)
        .where(EngagementLog.lecture_id == lecture_id, EngagementLog.student_id == current_user.id)
        .order_by(EngagementLog.started_at)
    )
    logs = result.scalars().all()

    if not logs:
        return {"lecture_id": lecture_id, "segments": [], "avg_engagement": 0, "pain_points": [], "scope": "student"}

    duration = lecture.duration or 300
    segment_count = min(20, max(5, duration // 30))
    segment_length = duration / segment_count

    timeline_entries = []
    for log in logs:
        if log.scores_timeline:
            for entry in log.scores_timeline:
                timeline_entries.append(
                    {
                        "timestamp": entry.get("timestamp", 0),
                        "engagement": entry.get("engagement", 50),
                        "boredom": entry.get("boredom", 30),
                        "confusion": entry.get("confusion", 20),
                    }
                )

    segments = []
    for seg_idx in range(segment_count):
        start_time = seg_idx * segment_length
        end_time = (seg_idx + 1) * segment_length
        seg_engagement, seg_boredom, seg_confusion = [], [], []

        for entry in timeline_entries:
            ts = entry.get("timestamp", 0)
            if start_time <= ts < end_time:
                seg_engagement.append(entry.get("engagement", 50))
                seg_boredom.append(entry.get("boredom", 30))
                seg_confusion.append(entry.get("confusion", 20))

        # ONLY ADD SEGMENTS WITH REAL DATA - NEVER USE DUMMY/FALLBACK DATA
        if seg_engagement:
            avg_eng = sum(seg_engagement) / max(len(seg_engagement), 1)
            avg_bore = sum(seg_boredom) / max(len(seg_boredom), 1)
            avg_conf = sum(seg_confusion) / max(len(seg_confusion), 1)

            segments.append(
                {
                    "index": seg_idx,
                    "start_time": round(start_time, 1),
                    "end_time": round(end_time, 1),
                    "engagement": round(avg_eng, 1),
                    "boredom": round(avg_bore, 1),
                    "confusion": round(avg_conf, 1),
                    "intensity": round(avg_eng / 100.0, 3),
                    "student_count": 1,
                }
            )

    pain_points = [
        {
            "segment": s["index"],
            "time_range": f"{int(s['start_time'])}s - {int(s['end_time'])}s",
            "issue": "high_confusion" if s["confusion"] > 50 else "low_engagement",
            "severity": "high" if s["engagement"] < 25 or s["confusion"] > 70 else "medium",
        }
        for s in segments
        if s["engagement"] < 40 or s["confusion"] > 50
    ]

    return {
        "lecture_id": lecture_id,
        "lecture_title": lecture.title,
        "duration": duration,
        "segment_count": segment_count,
        "segments": segments,
        "avg_engagement": round(sum(s["engagement"] for s in segments) / max(len(segments), 1), 1),
        "pain_points": pain_points,
        "total_views": len(logs),
        "scope": "student",
    }


@router.get("/live-watchers/{lecture_id}")
async def get_live_watchers(
    lecture_id: str,
    window_seconds: int = 120,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Teacher/Admin: see which students are currently active on a lecture."""
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only teachers/admin can view live watchers")

    window_seconds = max(30, min(window_seconds, 900))
    cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)

    result = await db.execute(
        select(EngagementLog, User)
        .join(User, User.id == EngagementLog.student_id)
        .where(EngagementLog.lecture_id == lecture_id)
        .order_by(EngagementLog.started_at.desc())
    )
    rows = result.all()

    latest_by_student = {}
    for log, student in rows:
        if log.student_id not in latest_by_student:
            latest_by_student[log.student_id] = (log, student)

    viewers = []
    for _, (log, student) in latest_by_student.items():
        is_live = bool(log.started_at and log.started_at >= cutoff)
        viewers.append(
            {
                "student_id": student.id,
                "student_name": student.full_name,
                "student_email": student.email,
                "is_live": is_live,
                "last_seen": log.started_at.isoformat() if log.started_at else None,
                "watch_duration": log.watch_duration or 0,
                "engagement_score": round(log.engagement_score or 0, 1),
                "icap_classification": log.icap_classification.value if log.icap_classification else None,
                "model_type": (log.features or {}).get("model_type"),
            }
        )

    live_count = sum(1 for v in viewers if v["is_live"])
    return {
        "lecture_id": lecture_id,
        "window_seconds": window_seconds,
        "live_count": live_count,
        "total_students_seen": len(viewers),
        "viewers": viewers,
    }


@router.get("/model-info")
async def get_model_info():
    """Get information about the current engagement model."""
    model = get_engagement_model()

    # Determine model type label
    if model.is_loaded:
        if model.model_version == "v2_binary":
            model_type = "v2_hybrid"
            description = "XGBoost v2 binary classifiers trained on DAiSEE with SHAP explainability + calibrated hybrid scoring"
            num_features = 71
        elif model.model_version == "v1_4class":
            model_type = "xgboost_shap"
            description = "XGBoost 4-class models with SHAP explainability"
            num_features = 24
        else:
            model_type = model.model_version
            description = "ML engagement model"
            num_features = len(FEATURE_NAMES)
    else:
        model_type = "rule_based"
        description = "Enhanced rule-based fallback with fuzzy logic"
        num_features = len(FEATURE_NAMES)

    return {
        "model_loaded": model.is_loaded,
        "model_type": model_type,
        "model_version": model.model_version,
        "description": description,
        "features": FEATURE_NAMES,
        "num_features": num_features,
        "dimensions": ["boredom", "engagement", "confusion", "frustration"],
        "icap_levels": ["passive", "active", "constructive", "interactive"],
        "temporal_smoothing": True,
        "shap_enabled": True,
        "fuzzy_rules_enabled": True,
    }


@router.get("/models")
async def list_runtime_models():
    """List all runtime-selectable models, including exported models."""
    registry = get_export_model_registry()
    models = registry.list_models()
    logger.info("[MODEL_LIST] count=%s", len(models))
    print(f"[MODEL_LIST] count={len(models)}", flush=True)
    return {
        "models": models,
        "count": len(models),
    }


@router.post("/models/infer")
async def infer_with_selected_model(
    request: ModelInferenceRequest,
):
    """Run inference with a user-selected model on real captured feature batches."""
    registry = get_export_model_registry()
    t0 = time.perf_counter()
    feature_count = len(request.features or [])
    logger.info("[MODEL_INFER_START] model_id=%s features=%s", request.model_id, feature_count)
    print(
        f"[MODEL_INFER_START] model_id={request.model_id} features={feature_count}",
        flush=True,
    )
    try:
        result = registry.infer(
            model_id=request.model_id,
            features=[f.model_dump() for f in request.features],
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        logger.info("[MODEL_INFER_OK] model_id=%s elapsed_ms=%.1f", request.model_id, elapsed_ms)
        print(
            f"[MODEL_INFER_OK] model_id={request.model_id} elapsed_ms={elapsed_ms:.1f}",
            flush=True,
        )
        return result
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        logger.error(
            "[MODEL_INFER_FAIL] model_id=%s elapsed_ms=%.1f error=%s",
            request.model_id,
            elapsed_ms,
            exc,
        )
        print(
            f"[MODEL_INFER_FAIL] model_id={request.model_id} elapsed_ms={elapsed_ms:.1f} error={exc}",
            flush=True,
        )
        raise HTTPException(status_code=400, detail=f"Model inference failed: {exc}")
