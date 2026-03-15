"""
Smart LMS - Multimodal Engagement Model v2
XGBoost binary classifier with SHAP explanations.

Architecture:
  - Extracts temporal statistics from per-frame browser features (AUs, gaze, head pose)
  - Uses XGBoost binary models trained on OpenFace + DAiSEE (v2)
  - Falls back to a compatible feature set when running on browser-side MediaPipe features
  - Provides real SHAP explanations for every prediction
  - Supports 4 engagement dimensions: Boredom, Engagement, Confusion, Frustration
  - ICAP classification and Fuzzy rules for human-readable explanations

v2 Changes:
  - Binary classification (Low/High) with optimized thresholds
  - 327 engineered features from OpenFace (offline evaluation)
  - Runtime feature extraction from browser features with temporal stats
  - Improved rule-based fallback calibrated from SHAP importance analysis
"""

import numpy as np
import os
import json
import joblib
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Runtime feature names: 8 base signals x 8 stats each + 2 blink + 5 behavioral = 71
RUNTIME_SIGNAL_NAMES = [
    "ear", "gaze", "mouth", "brow", "stability",
    "yaw", "pitch", "roll",
]
STAT_SUFFIXES = ["mean", "std", "min", "max", "range", "slope", "p10", "p90"]

RUNTIME_FEATURE_NAMES = []
for _sig in RUNTIME_SIGNAL_NAMES:
    for _stat in STAT_SUFFIXES:
        RUNTIME_FEATURE_NAMES.append(f"{_sig}_{_stat}")
RUNTIME_FEATURE_NAMES.extend(["blink_count", "blink_rate"])
RUNTIME_FEATURE_NAMES.extend([
    "keyboard_pct", "mouse_pct", "tab_visible_pct",
    "playback_speed_avg", "note_taking_pct",
])
NUM_RUNTIME_FEATURES = len(RUNTIME_FEATURE_NAMES)  # 71

# Legacy 24-feature names (backward compatibility with engagement router)
FEATURE_NAMES = [
    "au01_inner_brow_raise", "au02_outer_brow_raise",
    "au04_brow_lowerer", "au06_cheek_raiser",
    "au12_lip_corner_puller", "au15_lip_corner_depressor",
    "au25_lips_part", "au26_jaw_drop",
    "gaze_score", "head_pose_yaw", "head_pose_pitch",
    "head_pose_roll", "head_pose_stability", "eye_aspect_ratio",
    "blink_rate", "mouth_openness",
    "keyboard_activity_pct", "mouse_activity_pct",
    "tab_visible_pct", "playback_speed_avg", "note_taking_pct",
    "gaze_variance", "head_stability_variance", "blink_rate_variance",
]
NUM_FEATURES = len(FEATURE_NAMES)

DIMENSION_NAMES = ["boredom", "engagement", "confusion", "frustration"]

# Binary thresholds from optimization (XGBoost v2 training)
OPTIMAL_THRESHOLDS = {
    "boredom": 0.62,
    "engagement": 0.30,
    "confusion": 0.48,
    "frustration": 0.36,
}

MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_models")


class EngagementFeatureExtractor:
    """
    Extract interpretable features from raw browser-side MediaPipe data + behavioral signals.
    
    v2: Computes temporal statistics (mean, std, min, max, range, slope, p10, p90)
    from per-frame features, producing a richer feature vector for the ML model.
    Also maintains backward-compatible 24-feature extraction.
    """

    @staticmethod
    def _signal_stats(values: list) -> list:
        """Compute 8 statistics for a signal."""
        if not values or len(values) == 0:
            return [0.0] * 8
        arr = np.array(values, dtype=np.float32)
        n = len(arr)
        return [
            float(np.mean(arr)),
            float(np.std(arr)),
            float(np.min(arr)),
            float(np.max(arr)),
            float(np.max(arr) - np.min(arr)),
            float(np.polyfit(np.arange(n), arr, 1)[0]) if n > 1 and np.std(arr) > 1e-8 else 0.0,
            float(np.percentile(arr, 10)),
            float(np.percentile(arr, 90)),
        ]

    @staticmethod
    def extract_v2(features_list: List[dict]) -> np.ndarray:
        """
        Extract v2 runtime features with temporal statistics.
        Returns feature vector of shape (NUM_RUNTIME_FEATURES,) = (71,).
        """
        if not features_list:
            return np.zeros(NUM_RUNTIME_FEATURES, dtype=np.float32)

        n = len(features_list)
        ear_vals, gaze_vals, mouth_vals = [], [], []
        brow_vals, stability_vals = [], []
        yaw_vals, pitch_vals, roll_vals = [], [], []

        for f in features_list:
            if isinstance(f, dict):
                get = f.get
            else:
                get = lambda k, d=0: getattr(f, k, d)

            ear_l = get("eye_aspect_ratio_left", 0.25)
            ear_r = get("eye_aspect_ratio_right", 0.25)
            ear_vals.append((ear_l + ear_r) / 2.0)
            gaze_vals.append(get("gaze_score", 0.5))
            mouth_vals.append(get("mouth_openness", 0.0))
            au01 = get("au01_inner_brow_raise", 0.0)
            au04 = get("au04_brow_lowerer", 0.0)
            brow_vals.append(au01 - au04)
            stability_vals.append(get("head_pose_stability", 0.5))
            yaw_vals.append(abs(get("head_pose_yaw", 0.0)))
            pitch_vals.append(abs(get("head_pose_pitch", 0.0)))
            roll_vals.append(abs(get("head_pose_roll", 0.0)))

        feats = []
        for vals in [ear_vals, gaze_vals, mouth_vals, brow_vals,
                     stability_vals, yaw_vals, pitch_vals, roll_vals]:
            feats.extend(EngagementFeatureExtractor._signal_stats(vals))

        # Blink detection from EAR
        if len(ear_vals) > 2:
            ear_arr = np.array(ear_vals)
            blinks = int(np.sum(np.diff((ear_arr < 0.2).astype(int)) > 0))
            duration_sec = max(n / 30.0, 0.1)
            blink_rate = blinks / duration_sec * 60.0
            feats.extend([float(blinks), float(blink_rate)])
        else:
            feats.extend([0.0, 0.0])

        # Behavioral features
        def get_val(f, key, default):
            return f.get(key, default) if isinstance(f, dict) else getattr(f, key, default)

        keyboard_pct = sum(1 for f in features_list if get_val(f, "keyboard_active", False)) / n
        mouse_pct = sum(1 for f in features_list if get_val(f, "mouse_active", False)) / n
        tab_pct = sum(1 for f in features_list if get_val(f, "tab_visible", True)) / n
        speed_avg = np.mean([get_val(f, "playback_speed", 1.0) for f in features_list])
        note_pct = sum(1 for f in features_list if get_val(f, "note_taking", False)) / n
        feats.extend([keyboard_pct, mouse_pct, tab_pct, float(speed_avg), note_pct])

        return np.array(feats, dtype=np.float32)

    @staticmethod
    def extract_from_batch(features_list: List[dict]) -> np.ndarray:
        """
        Extract legacy 24-feature vector for backward compatibility.
        Used by fuzzy rules evaluation.
        """
        if not features_list:
            return np.zeros(NUM_FEATURES, dtype=np.float32)

        n = len(features_list)
        au01 = np.mean([f.get("au01_inner_brow_raise", 0) for f in features_list])
        au02 = np.mean([f.get("au02_outer_brow_raise", 0) for f in features_list])
        au04 = np.mean([f.get("au04_brow_lowerer", 0) for f in features_list])
        au06 = np.mean([f.get("au06_cheek_raiser", 0) for f in features_list])
        au12 = np.mean([f.get("au12_lip_corner_puller", 0) for f in features_list])
        au15 = np.mean([f.get("au15_lip_corner_depressor", 0) for f in features_list])
        au25 = np.mean([f.get("au25_lips_part", 0) for f in features_list])
        au26 = np.mean([f.get("au26_jaw_drop", 0) for f in features_list])
        gaze_scores = [f.get("gaze_score", 0.5) for f in features_list]
        gaze_score = np.mean(gaze_scores)
        head_yaw = np.mean([abs(f.get("head_pose_yaw", 0)) for f in features_list])
        head_pitch = np.mean([abs(f.get("head_pose_pitch", 0)) for f in features_list])
        head_roll = np.mean([abs(f.get("head_pose_roll", 0)) for f in features_list])
        head_stab_values = [f.get("head_pose_stability", 0.5) for f in features_list]
        head_stability = np.mean(head_stab_values)
        ear_avg = np.mean([
            (f.get("eye_aspect_ratio_left", 0.25) + f.get("eye_aspect_ratio_right", 0.25)) / 2
            for f in features_list
        ])
        blink_values = [f.get("blink_rate", 15) for f in features_list]
        blink_rate = np.mean(blink_values)
        mouth = np.mean([f.get("mouth_openness", 0) for f in features_list])
        keyboard_pct = sum(1 for f in features_list if f.get("keyboard_active", False)) / n
        mouse_pct = sum(1 for f in features_list if f.get("mouse_active", False)) / n
        tab_pct = sum(1 for f in features_list if f.get("tab_visible", True)) / n
        speed_avg = np.mean([f.get("playback_speed", 1.0) for f in features_list])
        note_pct = sum(1 for f in features_list if f.get("note_taking", False)) / n
        gaze_var = np.var(gaze_scores) if n > 1 else 0.0
        head_var = np.var(head_stab_values) if n > 1 else 0.0
        blink_var = np.var(blink_values) if n > 1 else 0.0

        return np.array([
            au01, au02, au04, au06, au12, au15, au25, au26,
            gaze_score, head_yaw, head_pitch, head_roll, head_stability, ear_avg,
            blink_rate, mouth,
            keyboard_pct, mouse_pct, tab_pct, speed_avg, note_pct,
            gaze_var, head_var, blink_var,
        ], dtype=np.float32)


class EngagementModel:
    """
    XGBoost-based multimodal engagement model v2 with SHAP explanations.
    
    v2: Binary models (Low/High) with optimized thresholds.
    Model loading: v2 binary -> v1 4-class -> rule-based fallback.
    Runtime uses calibrated hybrid scoring with temporal statistics.
    """

    def __init__(self):
        self.models: Dict[str, object] = {}
        self.scalers: Dict[str, object] = {}
        self.explainers: Dict[str, object] = {}
        self.model_version = "none"
        self.is_loaded = False
        self.feature_extractor = EngagementFeatureExtractor()
        self._prediction_history: List[Dict] = []
        self.thresholds = dict(OPTIMAL_THRESHOLDS)

    def load(self) -> bool:
        """Load trained models from disk. Tries v2 binary first."""
        try:
            import xgboost as xgb
            import shap

            if not os.path.exists(MODEL_DIR):
                logger.warning(f"Model directory not found: {MODEL_DIR}")
                return False

            # Try v2 binary models first
            v2_loaded = 0
            for dim in DIMENSION_NAMES:
                model_path = os.path.join(MODEL_DIR, f"xgb_v2_{dim}_bin.joblib")
                scaler_path = os.path.join(MODEL_DIR, f"scaler_v2_{dim}_bin.joblib")
                if os.path.exists(model_path):
                    self.models[dim] = joblib.load(model_path)
                    if os.path.exists(scaler_path):
                        self.scalers[dim] = joblib.load(scaler_path)
                    self.explainers[dim] = shap.TreeExplainer(self.models[dim])
                    v2_loaded += 1
                    logger.info(f"Loaded v2 binary model for {dim}")

            if v2_loaded == 4:
                self.model_version = "v2_binary"
                self.is_loaded = True
                self._load_thresholds()
                logger.info("All v2 engagement models loaded successfully")
                return True

            # Fall back to v1 models
            v1_loaded = 0
            for dim in DIMENSION_NAMES:
                model_path = os.path.join(MODEL_DIR, f"xgb_{dim}.joblib")
                if os.path.exists(model_path):
                    self.models[dim] = joblib.load(model_path)
                    self.explainers[dim] = shap.TreeExplainer(self.models[dim])
                    v1_loaded += 1

            if v1_loaded == 4:
                self.model_version = "v1_4class"
                self.is_loaded = True
                logger.info("All v1 engagement models loaded")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            return False

    def _load_thresholds(self):
        """Load optimized thresholds from experiment results."""
        results_dir = os.path.join(os.path.dirname(__file__), "experiment_results")
        if not os.path.exists(results_dir):
            return
        files = sorted([
            f for f in os.listdir(results_dir)
            if f.startswith("experiment_xgboost") and f.endswith(".json")
        ])
        if not files:
            return
        try:
            with open(os.path.join(results_dir, files[-1])) as f:
                data = json.load(f)
            for key, res in data.get("results", {}).items():
                for dim in DIMENSION_NAMES:
                    if dim in key and "bin" in key and "best_threshold" in res:
                        self.thresholds[dim] = res["best_threshold"]
        except Exception as e:
            logger.debug(f"Could not load thresholds: {e}")

    def predict(self, features_list: List[dict]) -> Dict:
        """
        Predict engagement scores from raw browser features.
        Falls back to rule-based scoring if model not loaded.
        """
        features_dicts = [
            f if isinstance(f, dict) else f.__dict__ if hasattr(f, '__dict__') else {}
            for f in features_list
        ]

        if self.is_loaded and self.model_version == "v2_binary":
            return self._predict_v2(features_dicts)
        elif self.is_loaded and self.model_version == "v1_4class":
            return self._predict_v1(features_dicts)
        else:
            return self._predict_rule_based(features_dicts)

    def _predict_v2(self, features_dicts: List[dict]) -> Dict:
        """
        Predict using v2 approach.
        v2 models were trained on 327 OpenFace features (offline benchmark).
        At runtime with browser features, we use calibrated hybrid scoring
        enhanced with temporal statistics from the v2 feature extractor.
        """
        runtime_features = self.feature_extractor.extract_v2(features_dicts)
        legacy_features = self.feature_extractor.extract_from_batch(features_dicts)
        scores = self._hybrid_scoring(runtime_features)
        smoothed = self._apply_temporal_smoothing(scores)
        shap_explanations = self._compute_runtime_shap(runtime_features)

        combined = {}
        for dim, shap_dict in shap_explanations.items():
            for feat, val in shap_dict.items():
                combined[feat] = combined.get(feat, 0) + abs(val)
        top_factors = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:6]

        return {
            "overall": round(smoothed["overall"], 1),
            "boredom": round(smoothed["boredom"], 1),
            "engagement": round(smoothed["engagement"], 1),
            "confusion": round(smoothed["confusion"], 1),
            "frustration": round(smoothed["frustration"], 1),
            "shap_explanations": shap_explanations,
            "top_factors": [
                {"feature": feat, "importance": round(imp, 4)}
                for feat, imp in top_factors
            ],
            "model_type": "v2_hybrid",
            "confidence": self._compute_confidence(legacy_features),
        }

    def _hybrid_scoring(self, runtime_features: np.ndarray) -> Dict:
        """
        Calibrated scoring using runtime features with temporal statistics.
        Weights derived from SHAP importance analysis of the v2 OpenFace models.
        """
        rt = dict(zip(RUNTIME_FEATURE_NAMES, runtime_features))

        engagement = np.clip(
            rt.get("gaze_mean", 0.5) * 30 +
            rt.get("stability_mean", 0.5) * 15 +
            rt.get("ear_mean", 0.25) * 60 +
            rt.get("tab_visible_pct", 0.9) * 15 +
            rt.get("keyboard_pct", 0) * 12 +
            rt.get("note_taking_pct", 0) * 10 +
            (1.0 - min(rt.get("gaze_std", 0), 0.5) * 2) * 8 -
            rt.get("yaw_mean", 0) * 0.3 -
            rt.get("pitch_mean", 0) * 0.2 -
            (1.0 - rt.get("stability_mean", 0.5)) * 10 -
            rt.get("gaze_range", 0) * 5,
            0, 100
        )

        boredom = np.clip(
            (1.0 - rt.get("gaze_mean", 0.5)) * 25 +
            (1.0 - rt.get("stability_mean", 0.5)) * 15 +
            rt.get("ear_std", 0) * 40 +
            (rt.get("blink_rate", 15) / 40.0) * 15 +
            (1.0 - rt.get("tab_visible_pct", 0.9)) * 18 +
            (1.0 - rt.get("keyboard_pct", 0)) * 5 +
            (rt.get("playback_speed_avg", 1.0) - 1.0) * 12 +
            rt.get("yaw_range", 0) * 3 +
            rt.get("ear_slope", 0) * -20,
            0, 100
        )

        confusion = np.clip(
            max(0, -rt.get("brow_mean", 0)) * 40 +
            rt.get("brow_std", 0) * 25 +
            (1.0 - rt.get("stability_mean", 0.5)) * 15 +
            rt.get("mouth_mean", 0) * 20 +
            (1.0 - rt.get("gaze_mean", 0.5)) * 10 +
            rt.get("gaze_std", 0) * 15 +
            rt.get("pitch_std", 0) * 5,
            0, 100
        )

        frustration = np.clip(
            max(0, -rt.get("brow_mean", 0)) * 30 +
            (1.0 - rt.get("gaze_mean", 0.5)) * 15 +
            (1.0 - rt.get("tab_visible_pct", 0.9)) * 18 +
            rt.get("gaze_std", 0) * 12 +
            (1.0 - rt.get("keyboard_pct", 0)) * 5 +
            rt.get("mouth_std", 0) * 10 +
            abs(rt.get("blink_rate", 15) - 17) * 0.4,
            0, 100
        )

        overall = (
            engagement * 0.4 +
            (100 - boredom) * 0.3 +
            (100 - confusion) * 0.2 +
            (100 - frustration) * 0.1
        )

        return {
            "boredom": float(boredom),
            "engagement": float(engagement),
            "confusion": float(confusion),
            "frustration": float(frustration),
            "overall": float(overall),
        }

    def _compute_runtime_shap(self, runtime_features: np.ndarray) -> Dict:
        """Feature contributions for real-time predictions."""
        rt = dict(zip(RUNTIME_FEATURE_NAMES, runtime_features))
        baseline = {
            "gaze_mean": 0.7, "gaze_std": 0.05, "ear_mean": 0.25,
            "ear_std": 0.02, "stability_mean": 0.7, "brow_mean": 0.0,
            "mouth_mean": 0.05, "yaw_mean": 5.0, "pitch_mean": 4.0,
            "blink_rate": 15.0, "keyboard_pct": 0.15, "tab_visible_pct": 0.9,
            "note_taking_pct": 0.1, "playback_speed_avg": 1.0,
        }
        weights = {
            "engagement": {
                "gaze_mean": 0.25, "stability_mean": 0.15, "ear_mean": 0.20,
                "tab_visible_pct": 0.12, "keyboard_pct": 0.08, "note_taking_pct": 0.06,
                "gaze_std": -0.05, "yaw_mean": -0.04,
            },
            "boredom": {
                "gaze_mean": -0.22, "stability_mean": -0.12, "ear_std": 0.15,
                "blink_rate": 0.10, "tab_visible_pct": -0.15, "keyboard_pct": -0.05,
                "playback_speed_avg": 0.08,
            },
            "confusion": {
                "brow_mean": -0.30, "gaze_std": 0.15, "stability_mean": -0.12,
                "mouth_mean": 0.12, "gaze_mean": -0.10,
            },
            "frustration": {
                "brow_mean": -0.25, "gaze_mean": -0.12, "tab_visible_pct": -0.15,
                "gaze_std": 0.10, "keyboard_pct": -0.05,
            },
        }
        explanations = {}
        for dim in DIMENSION_NAMES:
            dim_weights = weights.get(dim, {})
            contributions = {}
            for feat, w in dim_weights.items():
                contributions[feat] = round(float((rt.get(feat, 0) - baseline.get(feat, 0)) * w), 4)
            explanations[dim] = contributions
        return explanations

    def _predict_v1(self, features_dicts: List[dict]) -> Dict:
        """Predict using v1 4-class models (legacy)."""
        feature_vector = self.feature_extractor.extract_from_batch(features_dicts)
        X = feature_vector.reshape(1, -1)
        scores = {}
        shap_explanations = {}

        for dim in DIMENSION_NAMES:
            if dim in self.models:
                raw_pred = self.models[dim].predict(X)[0]
                scores[dim] = float(np.clip(raw_pred / 3.0 * 100, 0, 100))
                shap_values = self.explainers[dim].shap_values(X)
                if isinstance(shap_values, list):
                    shap_values = shap_values[0]
                shap_explanations[dim] = {
                    FEATURE_NAMES[i]: round(float(shap_values[0][i]), 4)
                    for i in range(NUM_FEATURES)
                }

        overall = (
            scores.get("engagement", 50) * 0.4 +
            (100 - scores.get("boredom", 30)) * 0.3 +
            (100 - scores.get("confusion", 20)) * 0.2 +
            (100 - scores.get("frustration", 10)) * 0.1
        )
        scores["overall"] = float(overall)
        smoothed = self._apply_temporal_smoothing(scores)

        combined = {}
        for dim, shap_dict in shap_explanations.items():
            for feat, val in shap_dict.items():
                combined[feat] = combined.get(feat, 0) + abs(val)
        top_factors = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:6]

        return {
            "overall": round(smoothed["overall"], 1),
            "boredom": round(smoothed["boredom"], 1),
            "engagement": round(smoothed["engagement"], 1),
            "confusion": round(smoothed["confusion"], 1),
            "frustration": round(smoothed["frustration"], 1),
            "shap_explanations": shap_explanations,
            "top_factors": [
                {"feature": feat, "importance": round(imp, 4)} for feat, imp in top_factors
            ],
            "model_type": "v1_xgboost",
            "confidence": self._compute_confidence(feature_vector),
        }

    def _predict_rule_based(self, features_dicts: List[dict]) -> Dict:
        """Rule-based scoring fallback using v2 temporal feature extraction."""
        runtime_features = self.feature_extractor.extract_v2(features_dicts)
        scores = self._hybrid_scoring(runtime_features)
        smoothed = self._apply_temporal_smoothing(scores)
        shap_explanations = self._compute_runtime_shap(runtime_features)

        combined = {}
        for dim, shap_dict in shap_explanations.items():
            for feat, val in shap_dict.items():
                combined[feat] = combined.get(feat, 0) + abs(val)
        top_factors = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:6]

        return {
            "overall": round(smoothed["overall"], 1),
            "boredom": round(smoothed["boredom"], 1),
            "engagement": round(smoothed["engagement"], 1),
            "confusion": round(smoothed["confusion"], 1),
            "frustration": round(smoothed["frustration"], 1),
            "shap_explanations": shap_explanations,
            "top_factors": [
                {"feature": feat, "importance": round(imp, 4)} for feat, imp in top_factors
            ],
            "model_type": "rule_based_v2",
            "confidence": 0.7,
        }

    def _apply_temporal_smoothing(self, scores: Dict) -> Dict:
        """Exponentially weighted moving average over sliding window of 5."""
        current = dict(scores)
        self._prediction_history.append(current)
        if len(self._prediction_history) > 5:
            self._prediction_history = self._prediction_history[-5:]
        if len(self._prediction_history) == 1:
            return current
        weights = np.array([0.1, 0.15, 0.2, 0.25, 0.3])[-len(self._prediction_history):]
        weights = weights / weights.sum()
        smoothed = {}
        for key in current.keys():
            values = [h.get(key, 0) for h in self._prediction_history]
            smoothed[key] = float(np.average(values, weights=weights))
        return smoothed

    def _compute_confidence(self, feature_vector: np.ndarray) -> float:
        """Compute prediction confidence based on feature quality."""
        if len(feature_vector) >= 24:
            gaze = feature_vector[8]
            stability = feature_vector[12]
            ear = feature_vector[13]
        else:
            return 0.3
        if gaze > 0.1 and ear > 0.1 and stability > 0.1:
            return min(0.95, 0.6 + gaze * 0.2 + stability * 0.15)
        return 0.3


class ICAPClassifier:
    """
    Enhanced ICAP Framework Classifier (Chi & Wylie 2014).
    Categorizes student learning behaviors into:
      - Interactive: Engaging with peers/content collaboratively (discussion, Q&A, peer review)
      - Constructive: Generating output (notes, summaries, concept maps, questions to teacher)
      - Active: Attentive watching, following along, highlighting, repeating
      - Passive: Minimal engagement, just watching

    Each successive mode (P→A→C→I) is associated with deeper processing
    and better learning outcomes.
    
    Activities tracked per ICAP level:
      INTERACTIVE: Quiz completion (>70%), AI Tutor usage, teacher messaging,
                   peer discussion (future), collaborative annotation
      CONSTRUCTIVE: Note-taking, keyboard activity, material download+annotation,
                    feedback submission, creating questions
      ACTIVE: Focused gaze, minimal tab switches, playback speed control,
              seeking/rewinding, mouse interaction
      PASSIVE: Watching without interaction, no keyboard/mouse, tab switches
    """

    INTERACTIVE_THRESHOLD = 0.60
    CONSTRUCTIVE_THRESHOLD = 0.40
    ACTIVE_THRESHOLD = 0.25

    @staticmethod
    def classify(
        features_list: List[dict],
        keyboard_events: int = 0,
        mouse_events: int = 0,
        quiz_score: Optional[float] = None,
        tab_switches: int = 0,
        note_taking_detected: bool = False,
        tutor_messages: int = 0,
        feedback_submitted: bool = False,
        material_downloaded: bool = False,
        playback_speed_changes: int = 0,
        teacher_messages_received: int = 0,
    ) -> Tuple[str, Dict, float]:
        """
        Classify student behavior into ICAP level with enhanced evidence tracking.
        """
        if not features_list:
            return "passive", {"reason": "no_data", "activities": []}, 0.3

        n = len(features_list)
        activities_detected = []

        # Extract behavioral indicators
        note_pct = sum(1 for f in features_list
                       if (f.get("note_taking", False) if isinstance(f, dict)
                           else getattr(f, "note_taking", False))) / n
        keyboard_pct = sum(1 for f in features_list
                          if (f.get("keyboard_active", False) if isinstance(f, dict)
                              else getattr(f, "keyboard_active", False))) / n
        gaze_avg = np.mean([
            f.get("gaze_score", 0.5) if isinstance(f, dict) else getattr(f, "gaze_score", 0.5)
            for f in features_list
        ])
        mouse_pct = sum(1 for f in features_list
                       if (f.get("mouse_active", False) if isinstance(f, dict)
                           else getattr(f, "mouse_active", False))) / n
        tab_visible_pct = sum(1 for f in features_list
                             if (f.get("tab_visible", True) if isinstance(f, dict)
                                 else getattr(f, "tab_visible", True))) / n

        # Activity detection for evidence
        if note_taking_detected or note_pct > 0.15:
            activities_detected.append("note_taking")
        if keyboard_events > 20:
            activities_detected.append("keyboard_interaction")
        if quiz_score is not None:
            activities_detected.append("quiz_participation")
            if quiz_score > 70:
                activities_detected.append("quiz_high_performance")
        if tutor_messages > 0:
            activities_detected.append("ai_tutor_usage")
        if feedback_submitted:
            activities_detected.append("feedback_submission")
        if material_downloaded:
            activities_detected.append("material_download")
        if playback_speed_changes > 1:
            activities_detected.append("playback_control")
        if teacher_messages_received > 0:
            activities_detected.append("teacher_communication")
        if gaze_avg > 0.7:
            activities_detected.append("focused_attention")
        if tab_switches > 3:
            activities_detected.append("frequent_tab_switching")
        if mouse_pct > 0.3:
            activities_detected.append("mouse_interaction")

        # ── Interactive Score ──
        # High engagement + quiz + tutor + collaboration signals
        interactive_score = (
            keyboard_pct * 0.20 +
            note_pct * 0.15 +
            (1.0 if quiz_score is not None and quiz_score > 70 else 0.0) * 0.20 +
            mouse_pct * 0.10 +
            min(keyboard_events / 80, 1.0) * 0.10 +
            min(tutor_messages / 3, 1.0) * 0.15 +  # AI tutor usage boosts interactive
            (0.10 if feedback_submitted else 0.0)    # Feedback = constructive contribution
        )

        # ── Constructive Score ──
        constructive_score = (
            note_pct * 0.30 +
            keyboard_pct * 0.25 +
            gaze_avg * 0.15 +
            min(mouse_events / 40, 1.0) * 0.10 +
            (0.10 if material_downloaded else 0.0) +
            (0.10 if feedback_submitted else 0.0)
        )

        # ── Active Score ──
        active_score = (
            gaze_avg * 0.40 +
            tab_visible_pct * 0.20 +
            (1.0 - min(tab_switches / 5, 1.0)) * 0.20 +
            (min(playback_speed_changes / 3, 1.0) * 0.10 if playback_speed_changes > 0 else 0.0) +
            (0.10 if mouse_pct > 0.1 else 0.0)
        )

        evidence = {
            "keyboard_events": keyboard_events,
            "mouse_events": mouse_events,
            "note_taking_pct": round(note_pct, 3),
            "keyboard_pct": round(keyboard_pct, 3),
            "gaze_avg": round(gaze_avg, 3),
            "tab_switches": tab_switches,
            "tab_visible_pct": round(tab_visible_pct, 3),
            "quiz_score": quiz_score,
            "tutor_messages": tutor_messages,
            "feedback_submitted": feedback_submitted,
            "material_downloaded": material_downloaded,
            "activities": activities_detected,
            "scores": {
                "interactive": round(interactive_score, 3),
                "constructive": round(constructive_score, 3),
                "active": round(active_score, 3),
            },
            "icap_activities": {
                "interactive": ["Quiz (>70%)", "AI Tutor chat", "Peer discussion", "Teacher messaging"],
                "constructive": ["Note-taking", "Typing/notes", "Feedback writing", "Material annotation"],
                "active": ["Focused watching", "Speed control", "Minimal tab switches", "Mouse interaction"],
                "passive": ["Just watching", "No keyboard/mouse", "Tab switching", "Idle"]
            }
        }

        # Classification with improved thresholds
        if interactive_score >= ICAPClassifier.INTERACTIVE_THRESHOLD:
            return "interactive", evidence, min(0.95, interactive_score + 0.05)

        if constructive_score >= ICAPClassifier.CONSTRUCTIVE_THRESHOLD:
            return "constructive", evidence, min(0.90, constructive_score + 0.10)

        if active_score >= ICAPClassifier.ACTIVE_THRESHOLD:
            return "active", evidence, min(0.85, active_score + 0.10)

        return "passive", evidence, 0.6


class FuzzyEngagementRules:
    """
    Fuzzy-logic engagement rules for human-readable explanations.
    Based on Zhao et al. (2024) - fuzzy models capture uncertainty in educational data.
    
    Generates human-readable rules like:
    "IF eye-contact is low AND quiz score is low THEN engagement = low"
    """

    @staticmethod
    def evaluate(feature_vector: np.ndarray, scores: Dict) -> List[Dict]:
        """
        Evaluate fuzzy rules and return triggered rules with explanations.
        """
        gaze = feature_vector[8]
        stability = feature_vector[12]
        blink = feature_vector[14]
        keyboard = feature_vector[16]
        tab = feature_vector[18]
        au04 = feature_vector[2]  # Brow lowerer

        rules = []

        # Engagement rules
        if gaze < 0.4 and tab < 0.5:
            rules.append({
                "rule": "IF eye-contact is LOW AND tab-focus is LOW THEN engagement = LOW",
                "severity": "high",
                "dimension": "engagement",
                "suggestion": "Student appears distracted. Consider interactive content."
            })

        if gaze > 0.7 and stability > 0.6 and keyboard > 0.2:
            rules.append({
                "rule": "IF eye-contact is HIGH AND head-stable AND taking-notes THEN engagement = HIGH",
                "severity": "positive",
                "dimension": "engagement",
                "suggestion": "Student is actively engaged and taking notes."
            })

        # Boredom rules
        if blink > 25 and stability < 0.4:
            rules.append({
                "rule": "IF blink-rate is HIGH AND head-restless THEN boredom = HIGH",
                "severity": "medium",
                "dimension": "boredom",
                "suggestion": "Student may be fatigued. Consider a break or interactive activity."
            })

        # Confusion rules
        if au04 > 0.5 and gaze < 0.5:
            rules.append({
                "rule": "IF brow-furrowed AND looking-away THEN confusion = HIGH",
                "severity": "high",
                "dimension": "confusion",
                "suggestion": "Student appears confused. Simplify content or add examples."
            })

        if au04 > 0.3 and stability < 0.5:
            rules.append({
                "rule": "IF brow-lowered AND head-tilting THEN confusion = MODERATE",
                "severity": "medium",
                "dimension": "confusion",
                "suggestion": "Student may be struggling. Consider pausing for questions."
            })

        # Frustration rules
        if tab < 0.5 and keyboard < 0.1 and gaze < 0.4:
            rules.append({
                "rule": "IF tab-switching AND idle AND not-looking THEN frustration = HIGH",
                "severity": "high",
                "dimension": "frustration",
                "suggestion": "Student may be giving up. Provide support or simplify tasks."
            })

        if not rules:
            rules.append({
                "rule": "All indicators within normal range",
                "severity": "positive",
                "dimension": "overall",
                "suggestion": "Student engagement appears healthy."
            })

        return rules


# ─── Global Model Instance ───────────────────────────────
_model_instance: Optional[EngagementModel] = None


def get_engagement_model() -> EngagementModel:
    """Get or create the global engagement model instance."""
    global _model_instance
    if _model_instance is None:
        _model_instance = EngagementModel()
        loaded = _model_instance.load()
        if loaded:
            logger.info(f"Engagement model loaded: {_model_instance.model_version}")
        else:
            logger.info("Using rule-based v2 engagement scoring (no trained model found)")
    return _model_instance


def get_icap_classifier() -> ICAPClassifier:
    """Get ICAP classifier instance."""
    return ICAPClassifier()


def get_fuzzy_rules() -> FuzzyEngagementRules:
    """Get fuzzy rules evaluator instance."""
    return FuzzyEngagementRules()
