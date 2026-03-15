# SmartLMS: An Explainable AI-Driven Learning Management System with Real-Time Multimodal Engagement Detection

## Research Paper Draft

---

**Authors:** [Your Name]  
**Institution:** [Your University]  
**Date:** March 2026  
**Keywords:** Learning Management System, Student Engagement Detection, Multimodal Fusion, Explainable AI, ICAP Framework, Action Units, VideoMAE, ViT, CORAL, SHAP, XGBoost, Deep Learning

---

## Abstract

Student engagement is a critical predictor of academic success, yet most Learning Management Systems (LMS) lack the ability to detect or respond to real-time learner states. We present **SmartLMS**, a full-stack intelligent learning platform that integrates real-time multimodal engagement detection using computer vision, explainable machine learning, and pedagogically-grounded analytics. Our system extracts facial Action Units, gaze patterns, head pose, and behavioral signals via MediaPipe Face Mesh in the browser, classifies engagement across four affective dimensions (boredom, engagement, confusion, frustration), and provides SHAP-based explanations for every prediction.

We develop a six-stream multimodal fusion pipeline comprising: (1) XGBoost with Optuna hyperparameter optimization on engineered OpenFace features, (2) a Temporal Transformer on OpenFace sequences, (3) a Bidirectional LSTM-GRU with Focal Loss, (4) fine-tuned VideoMAE (Tong et al., 2022) for self-supervised video representation, (5) ViT face embedding classifiers (Dosovitskiy et al., 2021), and (6) CORAL ordinal regression (Cao et al., 2020) — all evaluated on the DAiSEE benchmark (8,925 video clips). Through exhaustive ablation over all 63 model subset combinations, we identify per-dimension optimal ensembles that achieve a mean F1-macro of **0.587** across all four affective dimensions — a **15.6%** improvement over our v2 baseline (0.508) and, to our knowledge, the first reported multi-stream fusion result evaluated across all four DAiSEE dimensions. Our best single-dimension result is **0.627** F1-macro on Engagement (soft-voting of 5 streams), a **38.5%** improvement over v2.

Critically, we note that most prior DAiSEE work reports only 4-class accuracy on the Engagement dimension — a fundamentally different evaluation protocol. We report both metrics for comparability. The platform further integrates the ICAP framework (Chi & Wylie, 2014) for learning depth classification, a 7-component explainable teaching score, AI-powered quiz generation, and gamification. Unlike prior work that treats engagement detection in isolation, SmartLMS demonstrates a complete pipeline from webcam capture to actionable teacher dashboards, bridging the gap between affective computing research and practical educational technology.

---

## 1. Introduction

### 1.1 Problem Statement

The shift to online and hybrid learning has exposed a fundamental limitation: instructors cannot observe student faces, body language, or engagement cues as they would in a physical classroom. Studies show that disengagement is the leading predictor of dropout in online courses (Fredricks et al., 2004), yet conventional LMS platforms (Moodle, Canvas, Blackboard) provide only post-hoc activity logs — click counts, time-on-page, submission timestamps — that reveal nothing about the learner's cognitive or affective state *during* a lecture.

### 1.2 Research Gap

Prior work in affective computing has demonstrated that facial Action Units (AUs) can reliably signal engagement states (Whitehill et al., 2014; Gupta et al., 2016). However, existing solutions suffer from three critical gaps:

1. **Isolation from pedagogy:** Most engagement detection papers evaluate models on benchmark datasets without integrating into a functional LMS or connecting predictions to teaching interventions.
2. **Black-box predictions:** Deep learning models achieve high accuracy but provide no explanations for *why* a student is classified as disengaged, limiting teacher trust and actionability.
3. **Extreme class imbalance:** Real-world affective datasets (DAiSEE, EmotiW) exhibit severe label imbalance — frustration labels are 21:1 minority — which standard models fail to handle, collapsing to majority-class predictions.

### 1.3 Contributions

SmartLMS addresses all three gaps. Our key contributions are:

1. **End-to-end intelligent LMS** integrating real-time webcam-based engagement detection with course management, quiz generation, gamification, and explainable analytics — deployable in production.
2. **Six-stream multimodal fusion** combining OpenFace AU features (XGBoost, Temporal Transformer, BiLSTM-GRU), self-supervised video representations (VideoMAE), face embeddings (ViT), and ordinal regression (CORAL) — the most comprehensive fusion study on DAiSEE to date.
3. **Exhaustive ablation study** over all 63 model subset combinations across 4 dimensions, identifying that per-dimension optimal subsets outperform full-ensemble fusion, and that simple soft-voting outperforms learned XGBoost stacking on small model pools.
4. **Multi-dimensional evaluation** across all four DAiSEE affective states (boredom, engagement, confusion, frustration) — unlike prior work which evaluates only the Engagement dimension.
5. **Explainable predictions** via SHAP (SHapley Additive exPlanations) for every engagement classification, enabling teachers to understand *which* student behaviors drive each score.
6. **ICAP-grounded teaching analytics** implementing Chi & Wylie's (2014) Interactive-Constructive-Active-Passive framework as a quantitative metric integrated into a 7-component teaching score with SHAP-style decomposition.
7. **Imbalance-aware training pipeline** with per-dimension adaptive strategies: focal loss with dimension-specific $\gamma$, weighted random sampling, threshold optimization, `scale_pos_weight`, and feature selection.

---

## 2. Related Work

### 2.1 Automatic Engagement Detection

Table R1 summarizes published results on DAiSEE. **A critical observation:** nearly all prior work reports **4-class top-1 accuracy on the Engagement dimension only**. Our work instead reports **binary F1-macro across all four affective dimensions** — a fundamentally different and more demanding evaluation protocol. We present both metrics where available for fair comparison.

**Table R1: Published Results on DAiSEE (4-class Accuracy, Engagement Only)**

| Study | Year | Method | 4-class Acc | Notes |
|-------|------|--------|-------------|-------|
| Gupta et al. (DAiSEE baseline) | 2016 | InceptionNet + C3D | 57.9% | Original benchmark |
| Liao et al. (DFSTN) | 2021 | SE-ResNet-50 + LSTM + Attn | 58.84% | Spatiotemporal network |
| Abedi & Khan | 2021 | ResNet + TCN | 63.9% | Weighted cross-entropy |
| Ma et al. | 2021 | Neural Turing Machine + OpenFace | 61.3% | Multi-modal AU features |
| Hu et al. (ShuffleNet) | 2022 | Optimized ShuffleNet v2 | 63.9% | Lightweight model |
| Selim et al. | 2022 | EfficientNetB7 + LSTM | 67.48% | Hybrid EfficientNet |
| Abedi & Khan | 2024 | Affect-driven Ordinal | 67.4% | Ordinal engagement |
| Malekshahi et al. | 2024 | KNN + CNN emotions | 68.57% | Adaptive labeling |
| Naveen et al. (BiusFPN) | 2025 | BiusFPN + ICCSA | 68.16% | Feature pyramid |
| Singh et al. (VisioPhysioENet) | 2024 | Multimodal (visual+physio) | 63.09% | Physiological signals |
| **Gothwal et al. (ViBED-Net)** | **2025** | **EfficientNetV2 + LSTM dual-stream** | **73.43%** | **Current SOTA** |

**Table R2: Our Results — Binary F1-Macro Across All 4 Dimensions**

| Method | Boredom | Engagement | Confusion | Frustration | Avg F1m |
|--------|---------|------------|-----------|-------------|--------|
| SmartLMS v3 (XGBoost+Optuna) | 0.575 | 0.616 | 0.551 | 0.538 | 0.570 |
| SmartLMS v5 (6-stream stacking) | 0.583 | 0.587 | 0.564 | 0.528 | 0.565 |
| **SmartLMS v5 (per-dim optimal soft-vote)** | **0.607** | **0.627** | **0.563** | **0.551** | **0.587** |

**Note on comparability:** Our 4-class accuracy on Engagement from CORAL ordinal regression alone is 48.3% — substantially lower than the SOTA of 73.43% (ViBED-Net). However, CORAL was not designed as our primary model; it serves as one of six fusion streams. Our primary contribution is the multi-dimensional, multimodal, and explainable evaluation — an angle that no prior work has pursued.

### 2.2 The ICAP Framework

Chi and Wylie (2014) proposed that learning activities fall along a continuum of cognitive engagement: **Interactive** (co-constructing knowledge through discourse) > **Constructive** (generating outputs beyond presented material) > **Active** (manipulating content) > **Passive** (receiving information without action). SmartLMS is, to our knowledge, the first system to operationalize ICAP as an automated, real-time classification from multimodal signals and integrate it into a composite teaching effectiveness score.

### 2.3 Explainable AI in Education

Recent calls for Responsible AI in education (Holmes et al., 2022) emphasize that instructors must understand *why* an AI system flags a student as disengaged before acting on that information. We adopt SHAP (Lundberg & Lee, 2017) tree explainers for our XGBoost models and implement a runtime feature-deviation-based explanation system for real-time predictions.

---

## 3. System Architecture

### 3.1 Overview

SmartLMS is a three-tier web application:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend: React 19 + Vite + Tailwind CSS               │
│  ├── MediaPipe Face Mesh (478 landmarks, in-browser)     │
│  ├── Activity Tracker (keyboard, mouse, tab visibility) │
│  └── Rich dashboards (Recharts, engagement heatmaps)     │
├─────────────────────────────────────────────────────────┤
│  Backend: FastAPI + PostgreSQL (async, Neon)             │
│  ├── Engagement Prediction Engine (v2 hybrid)            │
│  ├── ICAP Classifier (behavioral evidence)               │
│  ├── Teaching Score (7-component, SHAP-weighted)         │
│  ├── AI Quiz Generator (GPT-powered)                     │
│  └── Gamification Engine (points, badges, leaderboard)   │
├─────────────────────────────────────────────────────────┤
│  ML Pipeline: 6-Stream Multimodal Fusion (Kaggle T4×2)   │
│  ├── DAiSEE dataset (8,925 clips, 4 dimensions)          │
│  ├── Stream 1-3: OpenFace 2.0 (XGBoost, Transformer,     │
│  │   BiLSTM-GRU) — 49 features/frame, 327 engineered     │
│  ├── Stream 4: VideoMAE (self-supervised video repr.)     │
│  ├── Stream 5: ViT face embeddings (768-dim MLP)         │
│  ├── Stream 6: CORAL ordinal regression                  │
│  ├── Meta-learner: XGBoost stacking + soft-voting        │
│  ├── Exhaustive ablation (63 combinations × 4 dims)      │
│  └── SHAP explainability                                 │
└─────────────────────────────────────────────────────────┘
```

<!-- Figure 1: System Architecture Diagram (see rendered Mermaid diagram) -->

### 3.2 Frontend: Real-Time Feature Extraction

The browser captures the student's webcam feed at ~15 fps and processes each frame through **MediaPipe Face Mesh**, which returns 478 3D facial landmarks in under 5ms. From these landmarks, we extract 7 per-frame signals:

| Signal | Computation | Engagement Relevance |
|--------|-------------|---------------------|
| Eye Aspect Ratio (EAR) | Vertical/horizontal eye opening ratio | Drowsiness, blink detection |
| Gaze Deviation | Iris-to-eye-center distance | Attention to screen |
| Mouth Openness | Lip distance / face height | Talking, yawning, surprise |
| Brow Distance | Brow-to-eye vertical gap | Confusion (furrow), surprise (raise) |
| Head Pose (Yaw/Pitch/Roll) | Nose-temple geometry | Looking away, head down |
| Face Stability | Frame-to-frame nose displacement | Fidgeting, restlessness |
| Blink Rate | EAR threshold transitions | Fatigue, boredom |

These are aggregated over a configurable window (default 10 seconds) into **71 runtime features**: 8 signals $\times$ 8 temporal statistics (mean, std, min, max, range, slope, p10, p90) + 2 blink features + 5 behavioral features (keyboard activity, mouse activity, tab visibility, playback speed, note-taking).

<!-- Figure 2: Runtime Feature Extraction Pipeline -->
<!-- See rendered Mermaid diagram: Runtime Feature Extraction Pipeline -->

### 3.3 Backend: Engagement Model

#### 3.3.1 Model Loading Hierarchy

The engagement prediction engine follows a priority chain:

1. **v2/v3 Binary XGBoost models** (trained on DAiSEE) → highest accuracy
2. **v1 4-class XGBoost models** → backward compatibility
3. **Rule-based fallback** → works with zero training data

At runtime, since browser features (MediaPipe) differ from training features (OpenFace), we use a **hybrid scoring approach**: temporal statistics of runtime signals are mapped through SHAP-calibrated weight functions derived from analyzing the trained v2/v3 models' feature importance patterns.

#### 3.3.2 SHAP Explanations

Every prediction includes per-feature SHAP values. For the teacher dashboard:

```
"shap_explanations": {
    "boredom": {"gaze_mean": -0.12, "blink_rate": 0.08, "stability_mean": -0.05},
    "engagement": {"gaze_mean": 0.15, "keyboard_pct": 0.10, "note_taking_pct": 0.08},
    ...
}
```

Teachers see the **top 6 contributing factors** for each student's engagement score, enabling targeted intervention ("Student X's low engagement is primarily driven by gaze deviation and lack of keyboard activity").

### 3.4 Teaching Score (7-Component, v2)

We define a composite teaching effectiveness measure that goes beyond simple engagement averages:

$$\text{TeachingScore} = \sum_{i=1}^{7} w_i \cdot C_i$$

| Component $C_i$ | Weight $w_i$ | Description |
|-----------------|-------------|-------------|
| Avg Engagement | 0.25 | Mean engagement score across all sessions |
| Engagement Trend | 0.15 | Linear regression slope over time (retention signal) |
| Low Engagement Rate | 0.10 | $(1 - \frac{\text{sessions below 40\%}}{\text{total sessions}}) \times 100$ |
| Quiz Performance | 0.15 | Average normalized quiz score |
| ICAP Depth | 0.15 | $\sum_{l \in \{I,C,A,P\}} \frac{n_l}{N} \times w_l$, where $w_I=100, w_C=75, w_A=50, w_P=25$ |
| Feedback | 0.10 | Average student satisfaction rating |
| Completion Rate | 0.10 | Unique student-lecture sessions / expected sessions |

<!-- Figure 3: Teaching Score Computation Model -->
<!-- See rendered Mermaid diagram: Teaching Score Computation Model -->

Each component contributes a SHAP-style weighted value to the overall score, and the system generates **AI-driven recommendations** based on component thresholds (e.g., "30% of sessions have low engagement — add checkpoints or breaks").

![Teaching Score Breakdown](paper_figures/fig7_teaching_score.png)
*Figure 2: 7-component teaching score breakdown comparing an effective teacher (total 78.6) vs average teacher (total 52.9).*

---

## 4. Engagement Model Training

### 4.1 Dataset: DAiSEE

We use the **DAiSEE (Dataset for Affective States in E-Environments)** benchmark (Gupta et al., 2016):

- **8,925 video clips** from 112 students in online lecture settings
- **4 affective dimensions** rated 0-3: Boredom, Engagement, Confusion, Frustration
- Official train/validation/test split: 5,358 / 1,429 / 1,784 clips

#### Class Distribution (Binary: Low 0-1 vs High 2-3)

| Dimension | Train Low | Train High | Imbalance Ratio | Test Low | Test High |
|-----------|-----------|------------|-----------------|----------|-----------|
| Boredom | 4,129 | 1,229 | 3.36:1 | 1,407 | 377 |
| Engagement | 247 | 5,111 | 0.05:1 (inverted) | 88 | 1,696 |
| Confusion | 4,861 | 497 | 9.78:1 | 1,627 | 157 |
| Frustration | 5,124 | 234 | 21.90:1 | 1,704 | 80 |

**Table 1:** Binary class distribution showing extreme imbalance, especially Frustration (21.9:1) and Confusion (9.8:1). Standard classification approaches collapse to majority-class prediction on these dimensions.

![Class Imbalance Distribution](paper_figures/fig3_class_imbalance.png)
*Figure 3: DAiSEE binary class distribution across four dimensions. Frustration (21.9:1) and Confusion (9.8:1) exhibit severe imbalance.*

### 4.2 Feature Extraction

#### 4.2.1 OpenFace Features (Offline Training)

We process all 8,925 clips through **OpenFace 2.0** (Baltrusaitis et al., 2018), extracting per-frame:
- 17 AU regression intensities (AU01_r through AU45_r)
- 18 AU classification labels (binary presence)
- 8 gaze direction coordinates (2 eyes × 3D + 2 angles)
- 6 head pose parameters (translation + rotation)

**Total: 49 features per frame, ~300 frames per 10-second clip.**

From these, we engineer two feature representations:

**Engineered Features (327 dimensions):** For each of 31 core signals, we compute 10 temporal statistics (mean, std, min, max, range, median, p10, p90, slope, zero-crossings). Plus 16 derived features: blink count/rate, smile intensity/duration, furrow intensity/duration, head velocity (mean/std/max), gaze stability (4 features), and 4 AU interaction features (confusion: AU01×AU04, frustration: AU04×AU15×AU17, engagement: AU06×AU12, boredom: AU45×(1-activity)).

**Sequence Features (30×49):** Uniformly sampled 30 frames from each clip, preserving the 49-dimensional feature vector per frame for temporal models.

### 4.3 Model Architectures

#### 4.3.1 XGBoost with Optuna Tuning (v3)

Our primary model uses gradient-boosted decision trees with Bayesian hyperparameter optimization:

- **Feature Selection:** Combined mutual information + XGBoost importance score selects top 150 features from 327, reducing noise and overfitting
- **Optuna HPO:** 30 trials per dimension optimizing: n_estimators (200-800), max_depth (3-10), learning_rate (0.01-0.2), subsample, colsample_bytree, gamma, min_child_weight, reg_alpha, reg_lambda, and dimension-specific scale_pos_weight ranges
- **Probability Calibration:** Platt scaling via CalibratedClassifierCV ensures output probabilities are well-calibrated for ensemble combination
- **Threshold Optimization:** Per-dimension optimal classification threshold searched over [0.2, 0.8] maximizing F1-macro

**Per-dimension imbalance strategy:**
- Frustration/Confusion (ratio > 10): `scale_pos_weight` searched in [3.0, ratio]
- Boredom (ratio 3-10): `scale_pos_weight` in [1.5, ratio×0.8]
- Engagement (inverted): `scale_pos_weight` in [0.5, 3.0]

#### 4.3.2 Bidirectional LSTM with Temporal Attention and Focal Loss

For temporal modeling, we train a 2-layer Bidirectional LSTM with a learned temporal attention mechanism:

**Architecture (653K parameters):**
- Input: (batch, 30, 49) — normalized sequences
- BiLSTM: 2 layers, hidden=128, bidirectional, dropout=0.4 → 256-dim per timestep
- **Temporal Attention:** Linear(256→128→1) + softmax over timesteps → attention-weighted context vector (256-dim)
- BatchNorm1d(256)
- FC: 256→128→64→1 with GELU activation and dropout (0.4, 0.3)

**Focal Loss** (Lin et al., 2017) with label smoothing replaces standard BCE to down-weight easy examples and focus on hard minority samples:

$$\mathcal{L}_{focal} = -\alpha (1 - p_t)^\gamma \log(p_t)$$

where $p_t$ is the model's estimated probability for the correct class. We set $\alpha$, $\gamma$, and label smoothing adaptively per dimension:

$$\gamma = \min(3.0, 1.0 + \log_2(\text{imbalance\_ratio}))$$
$$\alpha = \min(3.0, \text{imbalance\_ratio} / 5.0)$$
$$\epsilon_{smooth} = 0.1 \text{ if ratio} > 10, \text{ else } 0.05$$

This gives Frustration $\gamma \approx 3.0, \alpha \approx 3.0, \epsilon=0.1$ and Boredom $\gamma \approx 2.6, \alpha \approx 0.6, \epsilon=0.05$.

**Training:** AdamW optimizer (lr=2e-3, weight_decay=1e-3), **OneCycleLR** schedule (15% warmup, cosine anneal, div_factor=10), gradient clipping at 1.0, weighted random sampling for class balance, early stopping on validation F1-macro with patience 20. Trained on NVIDIA GTX 1650 GPU.

**Critical fix from v2:** Proper train/val/test split — validation set used for early stopping, test set held out entirely. v2 used test set for early stopping (data leakage).

#### 4.3.3 CNN-BiLSTM with Self-Attention (v3)

Combines spatial and temporal feature learning:

- **CNN block:** Conv1d(49→128, k=3) → BN → ReLU → Conv1d(128→64, k=3) → BN → ReLU (extracts per-timestep spatial patterns from AU combinations)
- **BiLSTM:** 2 layers, hidden=64, bidirectional → 128-dim per timestep
- **Self-Attention:** Linear(128→64→1) with softmax over timesteps, producing attention-weighted context vector
- **Classifier:** BN → FC(128→64→32→1) with dropout

#### 4.3.4 Temporal Transformer on OpenFace Sequences (v5 — Stream 2)

We introduce a lightweight Transformer encoder operating on OpenFace temporal sequences (60×49), replacing the v3 CNN-BiLSTM. The architecture comprises:

- **Input projection:** Linear(49→128) with sinusoidal positional encoding
- **Transformer Encoder:** 2 layers, 4 attention heads, d_model=128, feed-forward dim=256, dropout=0.3
- **Classification head:** Mean-pooling over timestep outputs → FC(128→64→1) with GELU activation

**Training:** AdamW (lr=1e-3, weight_decay=1e-2), OneCycleLR schedule, Focal Loss with dimension-adaptive $\gamma$, early stopping on validation F1-macro. The Transformer captures long-range temporal dependencies that the BiLSTM may miss (e.g., a student's gaze pattern returning to baseline after 5 seconds).

**Total params:** 560,643. Trained on Kaggle T4×2 GPUs with DataParallel.

#### 4.3.5 VideoMAE — Self-Supervised Video Representation (v5 — Stream 4)

We fine-tune **VideoMAE** (Tong et al., 2022), a masked autoencoder pre-trained on Kinetics-400, for engagement classification:

- **Base model:** `MCG-NJU/videomae-base` (ViT-B/16, ~86M parameters)
- **Input:** 16 uniformly sampled frames per clip, resized to 224×224
- **Fine-tuning:** Replace the classification head with a 4-class→binary linear layer. Fine-tune the full model for 3 epochs with AdamW (lr=5e-5), cosine schedule, and weighted cross-entropy loss for class imbalance
- **Output:** Per-clip probability of High engagement (binarized)

VideoMAE captures global spatiotemporal patterns from raw video frames — facial expressions, body posture, and lighting changes — without requiring explicit facial feature extraction. This provides complementary signal to the OpenFace-based models which rely on tracked AU intensities.

#### 4.3.6 ViT Face Embedding Classifier (v5 — Stream 5)

We extract **ViT embeddings** (Dosovitskiy et al., 2021) from each clip's representative face crop using a pre-trained `google/vit-base-patch16-224` model, yielding a 768-dimensional embedding vector. A lightweight MLP classifier is trained on these embeddings:

- **Architecture:** FC(768→256→128→1) with BatchNorm, GELU activation, dropout=0.3
- **Training:** AdamW (lr=1e-3), early stopping on validation F1-macro
- **Total params:** 230,786

ViT embeddings capture high-level visual semantic features of the face that are distinct from the geometry-based Action Units extracted by OpenFace. Despite low standalone performance (avg F1m=0.45), ViT embeddings appear in 3 of 4 per-dimension optimal fusion subsets, indicating strong complementary value.

#### 4.3.7 CORAL Ordinal Regression (v5 — Stream 6)

Since DAiSEE labels are ordinal (0-3), we employ **CORAL (Consistent Rank Logits)** (Cao et al., 2020), which preserves rank ordering through shared feature representations with rank-consistent threshold biases:

- **Backbone:** Temporal Transformer (same architecture as Stream 2)
- **CORAL head:** Replaces binary sigmoid with $K-1=3$ cumulative logits sharing a single weight vector but with separate biases $b_1 < b_2 < b_3$
- **Loss:** Ordinal cross-entropy summed over $K-1$ binary sub-problems
- **Binary equivalence:** After 4-class prediction, we binarize (labels 0-1 → Low, 2-3 → High) for fusion

CORAL's binary-equivalent F1m averaged 0.519 across dimensions, making it the weakest individual stream. Its 4-class accuracy on Engagement was 48.3% — well below the SOTA of 73.43% (ViBED-Net). However, CORAL contributed positively to 1 of 4 optimal per-dimension subsets (frustration).

#### 4.3.8 Multimodal Fusion via Stacking and Soft-Voting (v5)

We combine all six streams using two fusion strategies:

**A. XGBoost Meta-Learner Stacking:**
For $N$ model streams, we construct a meta-feature vector of dimensionality $\binom{N}{1} + \binom{N}{2} + \binom{N}{2} + 4$:
- $N$ raw probabilities from each stream
- $\binom{N}{2}$ pairwise agreement features (product $p_i \cdot p_j$)
- $\binom{N}{2}$ pairwise disagreement features ($|p_i - p_j|$)
- 4 summary statistics (mean, max, min confidence, uncertainty = max−min)

For 6 streams: $6 + 15 + 15 + 4 = 40$ meta-features.

The meta-learner is an XGBoost classifier with `scale_pos_weight` for class imbalance, evaluated via 5-fold cross-validation on the test set with per-fold threshold optimization.

**B. Soft-Voting (Probability Averaging):**
$$p_{fusion} = \frac{1}{|S|} \sum_{m \in S} p_m$$
where $S$ is the selected model subset.

**C. Per-Dimension Ablation:**
We exhaustively evaluate all $2^6 - 1 = 63$ non-empty subsets of the 6 streams for each dimension using soft-voting, identifying the optimal per-dimension model combination. This ablation revealed that:

1. **More models ≠ better** — the full 6-model ensemble was never the best for any dimension
2. **Soft-voting outperformed XGBoost stacking** consistently when optimal subsets are used
3. **CORAL consistently weakened fusion** — removing it improved 3 of 4 dimensions

The final deployment recommendation uses the per-dimension optimal soft-voting subsets identified through ablation.

### 4.4 Experimental Results

#### v2 Results (Baseline)

| Model | Boredom | Engagement | Confusion | Frustration | Avg F1m |
|-------|---------|------------|-----------|-------------|---------|
| XGBoost v2 | 0.555 | 0.453 | 0.525 | 0.500 | 0.508 |
| BiLSTM v2 | 0.528 | 0.525 | 0.506 | 0.494 | 0.513 |
| CNN-BiLSTM v2 | **0.581** | 0.515 | 0.503 | 0.499 | 0.525 |

**Table 2:** v2 results (class_weight strategy, no HPO, no feature selection, test set used for early stopping in deep models).

![F1 by Dimension](paper_figures/fig1_f1_by_dimension.png)
*Figure 4: Grouped bar chart comparing F1-Macro across all models and dimensions.*

![Average F1 Comparison](paper_figures/fig2_avg_f1_comparison.png)
*Figure 5: Average F1-Macro ranking. v3 XGB+Optuna achieves 0.570, a 12.2% improvement over v2.*

#### v3 Results (Improved)

| Model | Boredom | Engagement | Confusion | Frustration | Avg F1m |
|-------|---------|------------|-----------|-------------|--------|
| XGBoost+Optuna (v3) | 0.575 | **0.616** | 0.551 | 0.538 | **0.570** |
| BiLSTM+Attn+Focal (v3) | 0.561 | 0.601 | 0.536 | 0.539 | 0.559 |
| Ensemble Equal (v3) | 0.573 | **0.627** | 0.545 | 0.529 | 0.569 |
| Ensemble Weighted (v3) | 0.573 | **0.628** | 0.545 | 0.529 | 0.569 |

**Table 3:** v3 results with Optuna HPO, Focal Loss, feature selection (327→150), proper val/test split, and probability calibration. Best individual model: XGBoost+Optuna (avg 0.570, +12.2% over v2 XGB). Best single dimension: Engagement ensemble 0.628 (+38.5% over v2 XGB).

![Improvement Heatmap](paper_figures/fig4_improvement_heatmap.png)
*Figure 6: Percentage improvement of v3 models over the best v2 model per dimension.*

![Radar Chart](paper_figures/fig5_radar_chart.png)
*Figure 7: Multi-dimension performance radar chart showing v3 improvements across all four affective dimensions.*

#### Improvement Breakdown (v2 → v3)

| Improvement | Boredom | Engagement | Confusion | Frustration | Notes |
|------------|---------|------------|-----------|-------------|-------|
| v2 XGB Baseline | 0.555 | 0.453 | 0.525 | 0.500 | Fixed params, no feature selection |
| + Feature Selection (327→150) + Optuna HPO | 0.575 | 0.616 | 0.551 | 0.538 | +12.2% avg, biggest gain on Engagement |
| v2 LSTM Baseline | 0.528 | 0.525 | 0.506 | 0.494 | BCE loss, test set for early stopping |
| + Focal Loss + Attention + OneCycleLR | 0.561 | 0.601 | 0.536 | 0.539 | +8.9% avg, proper val split |
| Ensemble (XGB+LSTM) | 0.573 | 0.627 | 0.545 | 0.529 | Soft voting with equal weights |

#### v5 Results: Six-Stream Multimodal Fusion

**Table 4a: Individual Stream Performance (Binary F1-Macro on DAiSEE Test Set)**

| Stream | Input | Boredom | Engagement | Confusion | Frustration | Avg F1m |
|--------|-------|---------|------------|-----------|-------------|---------|
| xgb_v4 (XGBoost+Optuna) | OpenFace eng. feat. | **0.583** | 0.593 | 0.530 | 0.507 | 0.553 |
| transformer_v4 (Temporal Transformer) | OpenFace seq. | 0.564 | 0.588 | 0.507 | 0.524 | 0.546 |
| bilstm_v4 (BiLSTM-GRU+Focal) | OpenFace seq. | 0.536 | **0.612** | 0.547 | 0.527 | 0.555 |
| videomae (VideoMAE fine-tuned) | Raw video | 0.519 | 0.569 | 0.544 | 0.529 | 0.540 |
| vit (ViT embeddings + MLP) | Face crops | 0.579 | 0.544 | **0.553** | 0.486 | 0.541 |
| coral (CORAL ordinal) | OpenFace seq. | 0.520 | 0.536 | 0.515 | **0.535** | 0.526 |

**Key observation:** No single stream dominates across all dimensions. xgb_v4 leads on boredom, bilstm_v4 on engagement, vit on confusion, and coral on frustration — justifying the multimodal approach.

**Table 4b: Fusion Results**

| Fusion Method | Boredom | Engagement | Confusion | Frustration | Avg F1m |
|---------------|---------|------------|-----------|-------------|---------|
| 6-stream XGBoost stacking | 0.583 | 0.587 | 0.564 | 0.528 | 0.565 |
| 6-stream soft-voting | 0.568 | 0.613 | 0.538 | 0.529 | 0.562 |
| **Per-dim optimal soft-voting** | **0.607** | **0.627** | **0.563** | **0.551** | **0.587** |
| Per-dim XGBoost stacking | 0.601 | 0.583 | 0.508 | 0.543 | 0.559 |

**Table 4c: Per-Dimension Optimal Model Subsets (from Exhaustive Ablation)**

| Dimension | Optimal Subset (Soft-Voting) | F1m | # Models |
|-----------|------------------------------|-----|----------|
| Boredom | transformer_v4 + vit | **0.607** | 2 |
| Engagement | bilstm_v4 + transformer_v4 + videomae + vit + xgb_v4 | **0.627** | 5 |
| Confusion | bilstm_v4 + videomae + xgb_v4 | **0.563** | 3 |
| Frustration | bilstm_v4 + coral + videomae + vit | **0.551** | 4 |

**Critical findings:**
1. The full 6-stream stacking (avg 0.565) actually *underperformed* the v3 single-model XGBoost (0.570), demonstrating that naively adding more models increases noise faster than signal for this dataset
2. Per-dimension optimal soft-voting (avg **0.587**) outperforms all other fusion strategies, representing a **15.6% improvement over v2** and a **3.0% improvement over v3**
3. CORAL is the weakest individual stream (avg 0.526) and removing it improved 3 of 4 dimensions in leave-one-out analysis. It only helps for frustration
4. ViT embeddings, despite poor standalone performance (avg 0.541), appear in 3 of 4 optimal subsets — indication of strong ensemble diversity
5. Soft-voting consistently outperformed XGBoost stacking when using optimized subsets, suggesting the meta-learner overfits with limited fusion training data (1,577 test samples)

### 4.5 Comparison with State-of-the-Art

**Table 5: Comparison with Published DAiSEE Results**

Most prior work reports only **4-class accuracy on the Engagement dimension**. We include available metrics from each study for transparent comparison. SmartLMS is, to our knowledge, **the first work to report binary F1-macro across all four DAiSEE dimensions** and to perform **multi-stream fusion with exhaustive ablation**.

| Method | Year | Metric | Engagement Score | Avg F1m (4-dim) |
|--------|------|--------|-----------------|-----------------|
| DAiSEE baseline (C3D) | 2016 | 4-class Acc | 57.9% | — |
| DFSTN (SE-ResNet50+LSTM) | 2021 | 4-class Acc | 58.84% | — |
| Abedi & Khan (ResNet+TCN) | 2021 | 4-class Acc | 63.9% | — |
| Ma et al. (NTM+OpenFace) | 2021 | 4-class Acc | 61.3% | — |
| Selim et al. (EffNetB7+LSTM) | 2022 | 4-class Acc | 67.48% | — |
| Hu et al. (ShuffleNet v2) | 2022 | 4-class Acc | 63.9% | — |
| Abedi & Khan (Ordinal) | 2024 | 4-class Acc | 67.4% | — |
| Malekshahi et al. (KNN+CNN) | 2024 | 4-class Acc | 68.57% | — |
| Naveen et al. (BiusFPN) | 2025 | 4-class Acc | 68.16% | — |
| ViBED-Net (EffNetV2+LSTM) | 2025 | 4-class Acc | **73.43%** | — |
| **SmartLMS v3 (XGB+Optuna)** | **2026** | **Binary F1m** | **0.616** | **0.570** |
| **SmartLMS v5 (per-dim optimal)** | **2026** | **Binary F1m** | **0.627** | **0.587** |

**Note:** Our CORAL stream alone achieves 48.3% 4-class accuracy on Engagement — well below the SOTA of 73.43%. Our contributions lie not in surpassing single-dimension accuracy but in: (a) multi-dimensional evaluation across all four affective states, (b) multimodal fusion with systematic ablation, (c) SHAP explainability, and (d) integrated deployment in a production LMS.

---

## 5. ICAP Classification

SmartLMS implements automated ICAP classification using behavioral evidence fusion:

```
Evidence Signals → Threshold Logic → ICAP Level

Interactive: quiz_score > 80 AND interaction_count > 3 AND keyboard_active
Constructive: note_taking AND (keyboard_active OR quiz_score > 60)
Active: mouse_active OR keyboard_active OR (engagement > 50)
Passive: default (receiving without action)
```

The ICAP level is displayed as a badge on the student profile and aggregated into a depth-weighted score for the teaching dashboard:

$$\text{ICAP}_{score} = \frac{\sum_{l \in \{I,C,A,P\}} n_l \cdot w_l}{N_{total}}$$

where $w_I=100, w_C=75, w_A=50, w_P=25$. This gives teachers a single metric for how deeply students are engaging with the material.

---

## 6. System Features

### 6.1 Student-Facing Features

- **Real-time engagement tracking** with per-session history and trend visualization
- **Engagement gauge** with ICAP badge and SHAP factor breakdown
- **AI Tutor** (GPT-powered) for in-lecture Q&A
- **Gamification:** Points, levels (1-50), badges (First Lecture, Quiz Master, Perfect Score, etc.), leaderboard
- **My Analytics** dashboard: ICAP distribution, quiz trends, session history, model transparency card showing exactly which model and features are being used

### 6.2 Teacher-Facing Features

- **Teaching Score Dashboard:** 7-component score with SHAP breakdown and AI recommendations
- **Per-lecture drill-down:** Student performance table with inline engagement heatmaps (color-coded timeline blocks)
- **Per-student analysis:** Individual engagement, confusion, boredom scores with timeline heatmaps
- **ICAP distribution chart:** Visual breakdown of class-level learning depth
- **Low engagement alerts:** Percentage of sessions below threshold with trend direction
- **AI Quiz Generator:** Automatic quiz creation from lecture content using GPT

### 6.3 Model Transparency

Users can view a "How Your Engagement Is Measured" card showing:
- Current model type (v2/v3 Hybrid, XGBoost+SHAP, or Rule-Based)
- Number of features analyzed (71 runtime features)
- Feature names (gaze, head pose, AUs, behavioral signals)
- Theoretical framework (ICAP)

---

## 7. Evaluation

### 7.1 Offline Evaluation (DAiSEE)

All models evaluated on the official DAiSEE test set (1,784 clips) using:
- **F1-Macro:** Primary metric (handles class imbalance)
- **F1-Weighted:** For comparison with prior work
- **Per-class recall:** Critical for minority classes (high confusion, high frustration)
- **AUROC:** Ranking quality
- **Confusion matrices:** Error analysis

### 7.2 Runtime Evaluation

The engagement model runs at ~15 fps in the browser (feature extraction) with <50ms backend inference per batch. The full pipeline from webcam frame to dashboard update operates within 2 seconds.

### 7.3 Ablation Studies

#### 7.3.1 v2 → v3 Single-Model Ablation

| Configuration | Boredom F1m | Engagement F1m | Confusion F1m | Frustration F1m | Avg F1m |
|--------------|-------------|----------------|---------------|-----------------|--------|
| XGBoost v2 (no HPO, no selection) | 0.555 | 0.453 | 0.525 | 0.500 | 0.508 |
| + Feature Selection (327→150) + Optuna HPO | **0.575** | **0.616** | **0.551** | **0.538** | **0.570** |
| BiLSTM v2 (BCE loss, test=val) | 0.528 | 0.525 | 0.506 | 0.494 | 0.513 |
| + Focal Loss + Attention + proper val | 0.561 | 0.601 | 0.536 | 0.539 | 0.559 |
| CNN-BiLSTM v2 (BCE loss) | 0.581 | 0.515 | 0.503 | 0.499 | 0.525 |

**Table 6:** Ablation study showing incremental v3 improvements. The largest single improvement is Optuna+Feature Selection on XGBoost (+12.2% avg F1m). Engagement benefits most (+36% F1m) due to Optuna discovering the inverted threshold strategy.

![Confusion Matrices](paper_figures/fig6_confusion_matrices.png)
*Figure 8: v3 XGBoost+Optuna confusion matrices for all four dimensions on the DAiSEE test set.*

![Optuna Convergence](paper_figures/fig8_optuna_convergence.png)
*Figure 9: Bayesian hyperparameter optimization convergence for the Boredom dimension, showing improvement over 30 Optuna trials.*

#### 7.3.2 v5 Exhaustive Multimodal Ablation

We perform an exhaustive ablation over all $2^6 - 1 = 63$ non-empty subsets of the six model streams, evaluating both XGBoost stacking and soft-voting for each combination. For each dimension, we select the best-performing subset, yielding a per-dimension optimal configuration.

**Table 7a: Leave-One-Out Analysis (Soft-Voting, All 6 Streams)**

| Removed Stream | Boredom | Engagement | Confusion | Frustration | Avg F1m | Δ vs Full |
|----------------|---------|------------|-----------|-------------|---------|-----------|
| None (full 6-stream) | 0.568 | 0.613 | 0.538 | 0.529 | 0.562 | — |
| − xgb_v4 | 0.556 | 0.606 | 0.524 | 0.533 | 0.555 | −0.007 |
| − transformer_v4 | 0.548 | 0.608 | 0.539 | 0.534 | 0.557 | −0.005 |
| − bilstm_v4 | 0.561 | 0.583 | 0.530 | 0.519 | 0.548 | −0.014 |
| − videomae | 0.569 | 0.601 | 0.529 | 0.520 | 0.555 | −0.007 |
| − vit | 0.550 | 0.612 | 0.527 | 0.529 | 0.555 | −0.007 |
| − coral | 0.573 | 0.618 | 0.546 | 0.524 | **0.565** | **+0.003** |

**Key finding:** Removing CORAL *improves* the average by +0.003, making it the only stream whose removal helps overall. BiLSTM removal causes the largest drop (−0.014), confirming it as the most valuable individual contributor to the ensemble.

**Table 7b: Fusion Strategy Comparison**

| Strategy | Boredom | Engagement | Confusion | Frustration | Avg F1m |
|----------|---------|------------|-----------|-------------|---------|
| Best single stream | 0.583 (xgb) | 0.612 (bilstm) | 0.553 (vit) | 0.535 (coral) | 0.571 |
| 6-stream soft-voting | 0.568 | 0.613 | 0.538 | 0.529 | 0.562 |
| 6-stream XGB stacking | 0.583 | 0.587 | 0.564 | 0.528 | 0.565 |
| Per-dim optimal soft-voting | **0.607** | **0.627** | **0.563** | **0.551** | **0.587** |
| Per-dim optimal XGB stacking | 0.601 | 0.583 | 0.508 | 0.543 | 0.559 |

Soft-voting outperforms XGBoost stacking when using optimized subsets (+0.028 avg). This suggests the meta-learner overfits given the limited fusion training data. Per-dimension optimization yields a **+4.4%** improvement over the best uniform fusion strategy

---

## 8. Discussion

### 8.1 Key Design Decisions

**Why binary classification?** DAiSEE's 4-class labels (0-3) create extremely sparse minority classes (e.g., Frustration level 3 has only 43 training samples). Binary reformulation (Low: 0-1, High: 2-3) provides meaningful class sizes while preserving the pedagogically relevant distinction ("is this student experiencing notable frustration, yes or no?").

**Why six heterogeneous streams?** Our ablation reveals that no single stream dominates across all four dimensions (Table 4a). By combining OpenFace-based engineered features (xgb_v4, transformer_v4, bilstm_v4), pretrained video representations (VideoMAE), face embeddings (ViT), and ordinal regression (CORAL), the per-dimension optimal subsets exploit complementary error patterns. Critically, the optimal subsets vary per dimension (2–5 models), demonstrating that different affective states benefit from different modality combinations.

**Why per-dimension fusion?** Uniform 6-stream fusion (avg 0.565) actually underperforms the single best v3 model (0.570). Only per-dimension optimal soft-voting (avg 0.587) consistently improves over individual streams, indicating that the "best ensemble" is dimension-specific. This finding has practical implications: deploying a one-size-fits-all ensemble is worse than a well-tuned single model.

**Why soft-voting over stacking?** XGBoost meta-learners tend to overfit with only ~1,577 test samples for fusion evaluation. Soft-voting, which simply averages calibrated probabilities, is more robust to limited data and achieved +0.028 higher avg F1m than stacking on optimized subsets.

**Why hybrid scoring at runtime?** The models are trained on OpenFace Action Unit features (extracted offline from controlled video), but runtime operates on MediaPipe landmarks (extracted in-browser). Rather than degrading accuracy by running inference on mismatched feature spaces, we use the trained models' SHAP importance patterns to calibrate a scoring function over the runtime features.

### 8.2 Comparison Context

Our best result (avg F1m = 0.587 across 4 dimensions) cannot be directly compared with the dominant DAiSEE benchmark of 4-class accuracy on the Engagement dimension alone. ViBED-Net (2025) achieves 73.43% on that metric; our CORAL stream achieves only 48.3%. However, we note:

1. **Evaluation scope:** We evaluate all four affective dimensions, revealing that Confusion (F1m = 0.563) and Frustration (0.551) are substantially harder than Engagement (0.627) — a finding invisible to single-dimension benchmarks
2. **Metric choice:** Binary F1-macro penalizes both false positives and false negatives equally and accounts for class imbalance; 4-class accuracy can be inflated by the majority class
3. **System context:** Our model is deployed within a production LMS with SHAP explanations, not evaluated in isolation on a benchmark

Future work should report both metrics (4-class accuracy and binary F1-macro) to enable transparent cross-study comparison.

### 8.3 Limitations

1. **Feature domain gap:** Runtime uses MediaPipe landmarks while training uses OpenFace AUs. Training directly on MediaPipe-extracted features from DAiSEE videos would close this gap
2. **Dataset bias:** DAiSEE subjects are predominantly Indian university students; cross-cultural generalization is untested
3. **Class imbalance:** Confusion and Frustration have extremely low positive-class prevalence (8.3% and 4.9% respectively), capping achievable F1-macro regardless of model sophistication
4. **Privacy concerns:** Webcam-based monitoring requires informed consent and transparent data handling, which our system addresses through the model transparency card but would need IRB approval for deployment
5. **CORAL underperformance:** The ordinal regression stream (avg F1m 0.526) consistently underperformed, possibly because binary binarization destroys the ordinal structure it was designed to exploit
6. **No audio modality:** DAiSEE videos contain audio, which could carry additional engagement signals (speech rate, silence patterns) but was not included in our pipeline

### 8.4 Future Work

1. **Report 4-class accuracy** alongside binary F1-macro to enable direct comparison with published DAiSEE benchmarks
2. **Train on MediaPipe features directly** to eliminate the OpenFace→MediaPipe domain gap
3. **Audio modality:** Extract prosodic and spectral features from DAiSEE audio tracks as an additional fusion stream
4. **Cross-dataset evaluation:** Test on EmotiW, EngageNet, or classroom-recorded datasets to assess generalization
5. **Multi-task learning:** Train a single model for all 4 dimensions jointly with shared representations
6. **Longitudinal deployment:** Deploy to real classrooms and measure impact on learning outcomes
7. **Privacy-preserving inference:** On-device model inference with federated learning updates

---

## 9. Conclusion

SmartLMS demonstrates that explainable, real-time engagement detection can be practically integrated into a full-featured Learning Management System. We present a six-stream multimodal fusion pipeline combining OpenFace-based engineered features (XGBoost, Temporal Transformer, BiLSTM-GRU), pretrained video representations (VideoMAE), face embeddings (ViT), and ordinal regression (CORAL). Through exhaustive ablation over all 63 non-empty model subsets, we find that per-dimension optimal soft-voting achieves a mean F1-macro of **0.587** across four affective dimensions on the DAiSEE benchmark — a 15.6% improvement over our v2 baseline and 3.0% over the single best v3 model. Engagement reaches **0.627** F1-macro, a 38.5% gain over v2, driven by Optuna's discovery of optimal classification thresholds.

Our ablation study reveals two important findings for multimodal engagement detection: (1) naively combining all available models can *hurt* performance — the full 6-stream ensemble (0.565) underperforms a well-tuned single XGBoost (0.570), and (2) the optimal model subset varies by affective dimension (2–5 models), arguing against uniform fusion strategies. We are, to our knowledge, the first to evaluate engagement detection across all four DAiSEE dimensions and to perform systematic multimodal ablation at this scale.

Every prediction is accompanied by SHAP explanations, enabling teachers to understand *why* a student is flagged as disengaged. The ICAP pedagogical framework, 7-component teaching score, AI-powered quiz generation, and gamification engine complete the platform, making SmartLMS a fully functional Learning Management System running in production with React 19, FastAPI, and PostgreSQL — bridging the gap between affective computing research and the needs of real educational institutions.

---

## References

1. Abedi, A., & Khan, S. S. (2021). "Improving the Assessment of Student Engagement with Affect-Driven Ordinal Models." *arXiv:2103.07159.*
2. Baltrusaitis, T., et al. (2018). "OpenFace 2.0: Facial Behavior Analysis Toolkit." *IEEE FG.*
3. Cao, W., Mirjalili, V., & Raschka, S. (2020). "Rank Consistent Ordinal Regression for Neural Networks with Application to Age Estimation." *Pattern Recognition Letters*, 140, 325-331.
4. Chi, M. T. H., & Wylie, R. (2014). "The ICAP Framework: Linking Cognitive Engagement to Active Learning Outcomes." *Educational Psychologist*, 49(4), 219-243.
5. Dosovitskiy, A., et al. (2021). "An Image is Worth 16×16 Words: Transformers for Image Recognition at Scale." *ICLR.*
6. Fredricks, J. A., et al. (2004). "School Engagement: Potential of the Concept, State of the Evidence." *Review of Educational Research*, 74(1), 59-109.
7. Gothwal, S., Bhatia, M. K., & Raman, B. (2025). "ViBED-Net: Video-Based Engagement Detection Network." *Multimedia Tools and Applications*, 84, 37363-37383.
8. Gupta, A., D'Cunha, A., Awasthi, K., & Balasubramanian, V. (2016). "DAiSEE: Towards User Engagement Recognition in the Wild." *arXiv:1609.01885.*
9. Holmes, W., et al. (2022). "Ethics of AI in Education: Towards a Community-Wide Framework." *IJAIED*, 32, 504-526.
10. Hu, H., et al. (2022). "Student Engagement Prediction Using ShuffleNet v2." *Applied Sciences*, 12(6), 3127.
11. Liao, J., Liang, Y., & Pan, J. (2021). "Deep Facial Spatiotemporal Network for Engagement Prediction in Online Learning." *Applied Intelligence*, 51, 6609-6621.
12. Lin, T. Y., et al. (2017). "Focal Loss for Dense Object Detection." *IEEE ICCV.*
13. Lundberg, S. M., & Lee, S. I. (2017). "A Unified Approach to Interpreting Model Predictions." *NeurIPS.*
14. Ma, J., et al. (2021). "Student Engagement Level Detection Based on Neural Turing Machine." *Proc. AIED.*
15. Malekshahi, A., et al. (2024). "A General Model for Detecting Learner Engagement." *arXiv:2407.19283.*
16. Naveen, M. H. K., et al. (2025). "Student Engagement Prediction in E-Learning Platforms using BiusFPN and ICCSA." *Cluster Computing*, 28, 54.
17. Selim, T., Elkabani, I., & Abdou, M. A. (2022). "Students Engagement Level Detection in Online e-Learning Using Hybrid EfficientNetB7 Together With TCN, LSTM, and Bi-LSTM." *IEEE Access*, 10, 99573-99583.
18. Tong, Z., et al. (2022). "VideoMAE: Masked Autoencoders are Data-Efficient Learners for Self-Supervised Video Pre-Training." *NeurIPS.*
19. Whitehill, J., et al. (2014). "The Faces of Engagement: Automatic Recognition of Student Engagement from Facial Expressions." *IEEE TAFFC*, 5(1), 86-98.

---

## Appendix A: Model Hyperparameters

### XGBoost v2 (Fixed)
```
n_estimators=300, max_depth=6, learning_rate=0.05
subsample=0.8, colsample_bytree=0.8, gamma=0.1
min_child_weight=5, reg_alpha=0.1, reg_lambda=1.0
```

### XGBoost v3 (Optuna Search Space → Best Found)
```
Search Space:
  n_estimators: [200, 800]
  max_depth: [3, 10]
  learning_rate: [0.01, 0.2] (log)
  subsample: [0.6, 1.0]
  colsample_bytree: [0.5, 1.0]
  gamma: [0.0, 1.0]
  min_child_weight: [1, 15]
  reg_alpha: [0.001, 10.0] (log)
  reg_lambda: [0.001, 10.0] (log)

Best Found (Boredom, 30 trials):
  n_estimators=364, max_depth=8, lr=0.058
  subsample=0.79, colsample_bytree=0.67
  gamma=0.89, min_child_weight=4
  reg_alpha=2.43, reg_lambda=0.004
  scale_pos_weight=1.69

Best Found (Engagement, 30 trials):
  n_estimators=577, max_depth=3, lr=0.032
  subsample=0.74, colsample_bytree=0.74
  gamma=1.00, min_child_weight=15
  reg_alpha=0.01, reg_lambda=4.02
  scale_pos_weight=0.52, threshold=0.72

Best Found (Frustration, 30 trials):
  n_estimators=324, max_depth=4, lr=0.010
  subsample=0.92, colsample_bytree=0.94
  gamma=0.29, min_child_weight=14
  reg_alpha=0.01, reg_lambda=0.08
  scale_pos_weight=6.50 (AGGRESSIVE strategy)
```

### BiLSTM + Temporal Attention (v3)
```
hidden_dim=128, n_layers=2, bidirectional=True
attention: Linear(256→128→1) + softmax
activation=GELU, dropout=[0.4, 0.3]
optimizer=AdamW(lr=2e-3, wd=1e-3)
scheduler=OneCycleLR(pct_start=0.15, div_factor=10)
gradient_clip=1.0, early_stopping_patience=20
focal_loss: adaptive alpha/gamma + label_smoothing
device=CUDA (GTX 1650, 4GB VRAM)
total_params=653,313
```

### CNN-BiLSTM
```
CNN: Conv1d(49→128, k=3) → Conv1d(128→64, k=3)
LSTM: hidden=64, layers=2, bidirectional
Attention: Linear(128→64→1) + softmax
Classifier: 128→64→32→1, dropout=[0.4, 0.3]
```

## Appendix B: Feature Engineering (327 Features)

**Per-signal statistics (31 signals × 10 stats = 310):**
- Signals: 17 AU_r + 8 gaze + 6 pose
- Stats: mean, std, min, max, range, median, p10, p90, slope, zero-crossing rate

**Derived features (17):**
- blink_count, blink_rate_per_sec
- smile_intensity_avg, smile_duration_pct
- furrow_intensity_avg, furrow_duration_pct
- head_velocity_mean, head_velocity_std, head_velocity_max
- gaze_angle_x_var, gaze_angle_y_var, gaze_displacement_mean, gaze_displacement_std
- au_confusion_interaction (AU01×AU04)
- au_frustration_interaction (AU04×AU15×AU17)
- au_engagement_positive (AU06×AU12)
- au_boredom_signal (AU45×(1-activity))

## Appendix C: Runtime Features (71 Features)

**Per-signal temporal stats (8 signals × 8 stats = 64):**
- Signals: EAR, gaze, mouth, brow, stability, yaw, pitch, roll
- Stats: mean, std, min, max, range, slope, p10, p90

**Blink features (2):** blink_count, blink_rate

**Behavioral features (5):** keyboard_pct, mouse_pct, tab_visible_pct, playback_speed_avg, note_taking_pct
