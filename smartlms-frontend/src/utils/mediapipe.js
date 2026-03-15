/**
 * MediaPipe Face Mesh Feature Extraction for SmartLMS
 * 
 * Extracts real facial engagement features from webcam frames:
 * - Gaze score (iris position relative to eye)
 * - Head pose (yaw, pitch, roll from landmarks)
 * - Eye aspect ratio (EAR for blink detection)
 * - Blink rate (blinks per minute)
 * - Mouth openness
 * - Action Unit proxies (AU01, AU02, AU04, AU06, AU12, AU15, AU25, AU26)
 * - Head pose stability (variance over recent frames)
 * 
 * Uses @mediapipe/face_mesh v0.4 with 478 landmarks + iris refinement
 */

import { FaceMesh } from '@mediapipe/face_mesh';

// ─── Landmark Indices ─────────────────────────────────
const LANDMARKS = {
    // Eyes (6-point for EAR)
    LEFT_EYE: [33, 160, 158, 133, 153, 144],
    RIGHT_EYE: [362, 385, 387, 263, 373, 380],
    // Iris centers (with refineLandmarks)
    LEFT_IRIS: 468,
    RIGHT_IRIS: 473,
    // Eye corners
    LEFT_EYE_INNER: 133,
    LEFT_EYE_OUTER: 33,
    RIGHT_EYE_INNER: 362,
    RIGHT_EYE_OUTER: 263,
    // Key face points
    NOSE_TIP: 1,
    CHIN: 152,
    FOREHEAD: 10,
    // Mouth
    UPPER_LIP: 13,
    LOWER_LIP: 14,
    LEFT_MOUTH: 61,
    RIGHT_MOUTH: 291,
    // Brows
    LEFT_BROW_INNER: 107,
    RIGHT_BROW_INNER: 336,
    LEFT_BROW_OUTER: 70,
    RIGHT_BROW_OUTER: 300,
    LEFT_BROW_MID: 105,
    RIGHT_BROW_MID: 334,
    // Cheeks
    LEFT_CHEEK: 234,
    RIGHT_CHEEK: 454,
    // Nose bridge (for AU reference distances)
    NOSE_BRIDGE: 6,
};

// ─── Utility Functions ─────────────────────────────────
function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z || 0) - (b.z || 0)) ** 2);
}

function dist2D(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// ─── Feature Extraction Functions ──────────────────────

/**
 * Gaze score: how centered are the irises within the eyes
 * Returns 0.0 (looking away) to 1.0 (looking at screen)
 */
function computeGazeScore(lm) {
    try {
        const leftIris = lm[LANDMARKS.LEFT_IRIS];
        const leftInner = lm[LANDMARKS.LEFT_EYE_INNER];
        const leftOuter = lm[LANDMARKS.LEFT_EYE_OUTER];

        const rightIris = lm[LANDMARKS.RIGHT_IRIS];
        const rightInner = lm[LANDMARKS.RIGHT_EYE_INNER];
        const rightOuter = lm[LANDMARKS.RIGHT_EYE_OUTER];

        // Horizontal position of iris within eye (0 = outer corner, 1 = inner corner)
        const leftEyeWidth = dist2D(leftInner, leftOuter);
        const leftIrisPos = leftEyeWidth > 0 ? dist2D(leftIris, leftOuter) / leftEyeWidth : 0.5;

        const rightEyeWidth = dist2D(rightInner, rightOuter);
        const rightIrisPos = rightEyeWidth > 0 ? dist2D(rightIris, rightOuter) / rightEyeWidth : 0.5;

        // Gaze is best when iris is centered (~0.5)
        const leftGaze = 1.0 - Math.abs(leftIrisPos - 0.5) * 2.0;
        const rightGaze = 1.0 - Math.abs(rightIrisPos - 0.5) * 2.0;

        // Also check vertical centering
        const leftEyeTop = lm[LANDMARKS.LEFT_EYE[1]];
        const leftEyeBot = lm[LANDMARKS.LEFT_EYE[4]];
        const leftEyeHeight = dist2D(leftEyeTop, leftEyeBot);
        const leftVertPos = leftEyeHeight > 0 ? dist2D(leftIris, leftEyeTop) / leftEyeHeight : 0.5;
        const leftVertGaze = 1.0 - Math.abs(leftVertPos - 0.5) * 2.0;

        const hGaze = clamp((leftGaze + rightGaze) / 2, 0, 1);
        const vGaze = clamp(leftVertGaze, 0, 1);

        return clamp(hGaze * 0.7 + vGaze * 0.3, 0, 1);
    } catch {
        return 0.5;
    }
}

/**
 * Head pose estimation from 2D landmark positions
 * Returns { yaw, pitch, roll } in approximate degrees
 */
function computeHeadPose(lm) {
    try {
        const nose = lm[LANDMARKS.NOSE_TIP];
        const chin = lm[LANDMARKS.CHIN];
        const leftEye = lm[LANDMARKS.LEFT_EYE_OUTER];
        const rightEye = lm[LANDMARKS.RIGHT_EYE_OUTER];
        const forehead = lm[LANDMARKS.FOREHEAD];

        // Eye midpoint
        const eyeMidX = (leftEye.x + rightEye.x) / 2;
        const eyeMidY = (leftEye.y + rightEye.y) / 2;

        // Yaw: nose horizontal offset from eye center (scaled to ~degrees)
        const faceWidth = dist2D(leftEye, rightEye);
        const yaw = faceWidth > 0 ? ((nose.x - eyeMidX) / faceWidth) * 60 : 0;

        // Pitch: nose vertical offset from forehead-chin center
        const faceHeight = dist2D(forehead, chin);
        const vertCenter = (forehead.y + chin.y) / 2;
        const pitch = faceHeight > 0 ? ((nose.y - vertCenter) / faceHeight) * 50 : 0;

        // Roll: angle of eye line
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

        return {
            yaw: clamp(yaw, -45, 45),
            pitch: clamp(pitch, -45, 45),
            roll: clamp(roll, -30, 30),
        };
    } catch {
        return { yaw: 0, pitch: 0, roll: 0 };
    }
}

/**
 * Eye Aspect Ratio (EAR) for each eye
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 * Typical: ~0.25-0.35 open, <0.2 blink
 */
function computeEAR(lm, eyeIndices) {
    try {
        const [p1, p2, p3, p4, p5, p6] = eyeIndices.map(i => lm[i]);
        const vertical1 = dist2D(p2, p6);
        const vertical2 = dist2D(p3, p5);
        const horizontal = dist2D(p1, p4);
        return horizontal > 0 ? (vertical1 + vertical2) / (2.0 * horizontal) : 0.25;
    } catch {
        return 0.25;
    }
}

/**
 * Mouth openness normalized by mouth width
 */
function computeMouthOpenness(lm) {
    try {
        const upper = lm[LANDMARKS.UPPER_LIP];
        const lower = lm[LANDMARKS.LOWER_LIP];
        const left = lm[LANDMARKS.LEFT_MOUTH];
        const right = lm[LANDMARKS.RIGHT_MOUTH];
        const mouthWidth = dist2D(left, right);
        const mouthHeight = dist2D(upper, lower);
        return mouthWidth > 0 ? clamp(mouthHeight / mouthWidth, 0, 1) : 0;
    } catch {
        return 0;
    }
}

/**
 * Approximate Action Units from landmark distances
 * Normalized relative to face size for scale invariance
 */
function computeActionUnits(lm) {
    try {
        const faceHeight = dist2D(lm[LANDMARKS.FOREHEAD], lm[LANDMARKS.CHIN]);
        if (faceHeight === 0) return defaultAUs();

        const normalize = (d) => d / faceHeight;

        // Reference distances
        const noseBridge = lm[LANDMARKS.NOSE_BRIDGE];

        // AU01 - Inner Brow Raise: inner brow distance from nose bridge increases
        const leftBrowInner = lm[LANDMARKS.LEFT_BROW_INNER];
        const rightBrowInner = lm[LANDMARKS.RIGHT_BROW_INNER];
        const browInnerDist = (dist2D(leftBrowInner, noseBridge) + dist2D(rightBrowInner, noseBridge)) / 2;
        const au01 = clamp(normalize(browInnerDist) * 3.0, 0, 1);

        // AU02 - Outer Brow Raise: outer brow moves up relative to eye corners
        const leftBrowOuter = lm[LANDMARKS.LEFT_BROW_OUTER];
        const rightBrowOuter = lm[LANDMARKS.RIGHT_BROW_OUTER];
        const leftEyeOuter = lm[LANDMARKS.LEFT_EYE_OUTER];
        const rightEyeOuter = lm[LANDMARKS.RIGHT_EYE_OUTER];
        const browOuterDist = (dist2D(leftBrowOuter, leftEyeOuter) + dist2D(rightBrowOuter, rightEyeOuter)) / 2;
        const au02 = clamp(normalize(browOuterDist) * 4.0, 0, 1);

        // AU04 - Brow Lowerer: inner brow distance narrows
        const browSpan = dist2D(leftBrowInner, rightBrowInner);
        const eyeSpan = dist2D(lm[LANDMARKS.LEFT_EYE_INNER], lm[LANDMARKS.RIGHT_EYE_INNER]);
        const au04 = eyeSpan > 0 ? clamp(1.0 - (browSpan / eyeSpan), 0, 1) : 0;

        // AU06 - Cheek Raiser: cheek landmarks move toward eyes
        const leftCheek = lm[LANDMARKS.LEFT_CHEEK];
        const rightCheek = lm[LANDMARKS.RIGHT_CHEEK];
        const leftEyeBot = lm[LANDMARKS.LEFT_EYE[4]];
        const rightEyeBot = lm[LANDMARKS.RIGHT_EYE[4]];
        const cheekEyeDist = (dist2D(leftCheek, leftEyeBot) + dist2D(rightCheek, rightEyeBot)) / 2;
        const au06 = clamp(1.0 - normalize(cheekEyeDist) * 3.0, 0, 1);

        // AU12 - Lip Corner Puller (smile): mouth corners move up and out
        const leftMouth = lm[LANDMARKS.LEFT_MOUTH];
        const rightMouth = lm[LANDMARKS.RIGHT_MOUTH];
        const mouthCenter = { x: (leftMouth.x + rightMouth.x) / 2, y: (leftMouth.y + rightMouth.y) / 2 };
        const noseTip = lm[LANDMARKS.NOSE_TIP];
        const mouthNoseDist = normalize(dist2D(mouthCenter, noseTip));
        const mouthWidth = normalize(dist2D(leftMouth, rightMouth));
        const au12 = clamp(mouthWidth * 2.5, 0, 1);

        // AU15 - Lip Corner Depressor: mouth corners lower than center
        const upperLip = lm[LANDMARKS.UPPER_LIP];
        const cornerAvgY = (leftMouth.y + rightMouth.y) / 2;
        const au15 = clamp((cornerAvgY - upperLip.y) * faceHeight * 2.0, 0, 1);

        // AU25 - Lips Part: vertical separation between lips
        const lipSep = dist2D(lm[LANDMARKS.UPPER_LIP], lm[LANDMARKS.LOWER_LIP]);
        const au25 = clamp(normalize(lipSep) * 5.0, 0, 1);

        // AU26 - Jaw Drop: chin drops relative to nose
        const chinNoseDist = normalize(dist2D(lm[LANDMARKS.CHIN], noseTip));
        const au26 = clamp((chinNoseDist - 0.3) * 3.0, 0, 1);

        return { au01, au02, au04, au06, au12, au15, au25, au26 };
    } catch {
        return defaultAUs();
    }
}

function defaultAUs() {
    return { au01: 0, au02: 0, au04: 0, au06: 0, au12: 0, au15: 0, au25: 0, au26: 0 };
}


// ─── MediaPipe Manager Class ──────────────────────────

export class MediaPipeExtractor {
    constructor() {
        this.faceMesh = null;
        this.ready = false;
        this.lastLandmarks = null;
        this.lastFeatures = null;

        // Blink tracking
        this.blinkHistory = [];      // timestamps of detected blinks
        this.earHistory = [];         // recent EAR values for blink detection
        this.blinkThreshold = 0.19;
        this.wasBlinking = false;

        // Head pose history for stability
        this.poseHistory = [];        // last N head poses
        this.maxPoseHistory = 30;     // ~5 seconds at 6fps

        // Processing state
        this.processing = false;
        this.onFeaturesReady = null;
    }

    /**
     * Initialize MediaPipe Face Mesh
     * @returns {Promise<boolean>} success
     */
    async initialize() {
        try {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,  // Enables iris landmarks (468-477)
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            this.faceMesh.onResults((results) => {
                this._processResults(results);
            });

            // Warm up with a small canvas to load WASM
            const warmupCanvas = document.createElement('canvas');
            warmupCanvas.width = 10;
            warmupCanvas.height = 10;
            await this.faceMesh.send({ image: warmupCanvas });

            this.ready = true;
            console.log('[MediaPipe] Face Mesh initialized successfully');
            return true;
        } catch (err) {
            console.error('[MediaPipe] Failed to initialize:', err);
            this.ready = false;
            return false;
        }
    }

    /**
     * Process a video frame from the webcam
     * @param {HTMLVideoElement} videoElement
     * @returns {Promise<Object|null>} extracted features or null
     */
    async processFrame(videoElement) {
        if (!this.ready || !this.faceMesh || this.processing) return this.lastFeatures;
        if (!videoElement || videoElement.readyState < 2) return this.lastFeatures;

        this.processing = true;
        try {
            await this.faceMesh.send({ image: videoElement });
            return this.lastFeatures;
        } catch (err) {
            console.warn('[MediaPipe] Frame processing error:', err);
            return this.lastFeatures;
        } finally {
            this.processing = false;
        }
    }

    /**
     * Internal: process FaceMesh results callback
     */
    _processResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            // No face detected — return zeroed features with face_detected = false
            this.lastFeatures = {
                face_detected: false,
                gaze_score: 0,
                head_pose_yaw: 0,
                head_pose_pitch: 0,
                head_pose_roll: 0,
                head_pose_stability: 0,
                eye_aspect_ratio_left: 0,
                eye_aspect_ratio_right: 0,
                blink_rate: 0,
                mouth_openness: 0,
                ...defaultAUs('au'),
            };
            this.lastLandmarks = null;
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        this.lastLandmarks = landmarks;

        // Extract all features
        const gaze = computeGazeScore(landmarks);
        const headPose = computeHeadPose(landmarks);
        const earLeft = computeEAR(landmarks, LANDMARKS.LEFT_EYE);
        const earRight = computeEAR(landmarks, LANDMARKS.RIGHT_EYE);
        const mouthOpen = computeMouthOpenness(landmarks);
        const aus = computeActionUnits(landmarks);

        // Update blink detection
        const avgEAR = (earLeft + earRight) / 2;
        this.earHistory.push(avgEAR);
        if (this.earHistory.length > 10) this.earHistory.shift();

        // Detect blink: EAR drops below threshold then recovers
        const isBlinking = avgEAR < this.blinkThreshold;
        if (this.wasBlinking && !isBlinking) {
            // Blink completed
            this.blinkHistory.push(Date.now());
        }
        this.wasBlinking = isBlinking;

        // Clean up old blinks (keep last 60 seconds)
        const oneMinuteAgo = Date.now() - 60000;
        this.blinkHistory = this.blinkHistory.filter(t => t > oneMinuteAgo);
        const blinkRate = this.blinkHistory.length; // blinks per minute

        // Update head pose stability (lower variance = more stable)
        this.poseHistory.push(headPose);
        if (this.poseHistory.length > this.maxPoseHistory) this.poseHistory.shift();

        let stability = 0.5;
        if (this.poseHistory.length >= 5) {
            const yaws = this.poseHistory.map(p => p.yaw);
            const pitches = this.poseHistory.map(p => p.pitch);
            const yawVar = variance(yaws);
            const pitchVar = variance(pitches);
            // Lower variance → higher stability (0-1 scale)
            // Typical variance: 0 = perfectly still, >50 = very shaky
            stability = clamp(1.0 - (yawVar + pitchVar) / 100, 0, 1);
        }

        this.lastFeatures = {
            face_detected: true,
            gaze_score: roundTo(gaze, 4),
            head_pose_yaw: roundTo(headPose.yaw, 2),
            head_pose_pitch: roundTo(headPose.pitch, 2),
            head_pose_roll: roundTo(headPose.roll, 2),
            head_pose_stability: roundTo(stability, 4),
            eye_aspect_ratio_left: roundTo(earLeft, 4),
            eye_aspect_ratio_right: roundTo(earRight, 4),
            blink_rate: blinkRate,
            mouth_openness: roundTo(mouthOpen, 4),
            au01_inner_brow_raise: roundTo(aus.au01, 4),
            au02_outer_brow_raise: roundTo(aus.au02, 4),
            au04_brow_lowerer: roundTo(aus.au04, 4),
            au06_cheek_raiser: roundTo(aus.au06, 4),
            au12_lip_corner_puller: roundTo(aus.au12, 4),
            au15_lip_corner_depressor: roundTo(aus.au15, 4),
            au25_lips_part: roundTo(aus.au25, 4),
            au26_jaw_drop: roundTo(aus.au26, 4),
        };

        if (this.onFeaturesReady) {
            this.onFeaturesReady(this.lastFeatures);
        }
    }

    /**
     * Get the latest extracted features
     */
    getLatestFeatures() {
        return this.lastFeatures;
    }

    /**
     * Check if face is currently detected
     */
    isFaceDetected() {
        return this.lastFeatures?.face_detected || false;
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.faceMesh) {
            this.faceMesh.close();
            this.faceMesh = null;
        }
        this.ready = false;
        this.lastLandmarks = null;
        this.lastFeatures = null;
        this.blinkHistory = [];
        this.earHistory = [];
        this.poseHistory = [];
        console.log('[MediaPipe] Extractor destroyed');
    }
}

// ─── Helper Utilities ──────────────────────────────────

function variance(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
}

function roundTo(value, decimals) {
    const f = Math.pow(10, decimals);
    return Math.round(value * f) / f;
}

/**
 * Create a feature vector for engagement submission
 * Combines MediaPipe facial features with behavioral signals
 */
export function createMediaPipeFeatureVector(sessionId, lectureId, facialFeatures, behaviorState) {
    const features = facialFeatures || {};
    return {
        session_id: sessionId,
        lecture_id: lectureId,
        timestamp: Date.now(),
        // Facial features (real from MediaPipe)
        gaze_score: features.gaze_score ?? 0,
        head_pose_yaw: features.head_pose_yaw ?? 0,
        head_pose_pitch: features.head_pose_pitch ?? 0,
        head_pose_roll: features.head_pose_roll ?? 0,
        head_pose_stability: features.head_pose_stability ?? 0,
        eye_aspect_ratio_left: features.eye_aspect_ratio_left ?? 0,
        eye_aspect_ratio_right: features.eye_aspect_ratio_right ?? 0,
        blink_rate: features.blink_rate ?? 0,
        mouth_openness: features.mouth_openness ?? 0,
        au01_inner_brow_raise: features.au01_inner_brow_raise ?? 0,
        au02_outer_brow_raise: features.au02_outer_brow_raise ?? 0,
        au04_brow_lowerer: features.au04_brow_lowerer ?? 0,
        au06_cheek_raiser: features.au06_cheek_raiser ?? 0,
        au12_lip_corner_puller: features.au12_lip_corner_puller ?? 0,
        au15_lip_corner_depressor: features.au15_lip_corner_depressor ?? 0,
        au25_lips_part: features.au25_lips_part ?? 0,
        au26_jaw_drop: features.au26_jaw_drop ?? 0,
        face_detected: features.face_detected ?? false,
        // Behavioral signals (always real)
        keyboard_active: behaviorState.keyboardActive,
        mouse_active: behaviorState.mouseActive,
        tab_visible: !document.hidden,
        playback_speed: behaviorState.playbackSpeed,
        note_taking: behaviorState.keyboardActive,
    };
}
