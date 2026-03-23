# Auto-Engagement Capture Implementation Guide

## Overview

Your SmartLMS platform now features **automated engagement tracking** that:

✅ **Auto-starts webcam when lecture plays**  
✅ **Captures MediaPipe facial features in real-time (AUs, gaze, head pose)**  
✅ **Automatically saves engagement data to database**  
✅ **Auto-closes camera when lecture ends**  
✅ **Auto-redirects through phases: Lecture → Quiz → Feedback → Summary**  
✅ **Persists all data permanently in database**  

---

## Architecture & Flow

### Session Flow Diagram

```
1. Student clicks lecture link
   ↓
2. LecturePage mounts
   ↓
3. Requests camera permission
   ↓
4. Video starts → AutoEngagementCapture ENABLED
   ↓
5. Webcam PiP starts in bottom-right corner
   ↓
6. MediaPipe extracts features every ~1500ms:
   - Gaze direction (x, y)
   - Blink rate, eye aspect ratio
   - Head pose (yaw, pitch, roll)
   - Facial action units (AU01-AU26)
   - Face detection confidence
   ↓
7. Features batched + buffered
   ↓
8. Every 10 features → AUTO-SUBMIT to backend
   POST /api/engagement/submit
   ↓
9. Backend processes:
   - Runs XGBoost/Hybrid model
   - Calculates engagement score (0-100)
   - Generates SHAP explanations
   - ICAP classification (Interactive/Constructive/Active/Passive)
   - Stores in EngagementLog table
   ↓
10. Lecture ends
    ↓
11. Camera AUTO-CLOSES
    ↓
12. Remaining features submitted
    ↓
13. AUTO-REDIRECT: Quiz Phase (if quizzes exist)
    ↓
14. Student answers → AUTO-SUBMIT
    ↓
15. AUTO-REDIRECT: Feedback Phase
    ↓
16. Student provides feedback → AUTO-SUBMIT
    ↓
17. AUTO-REDIRECT: Session Summary (shows engagement breakdown)
    ↓
18. Student can navigate back to course
```

---

## Components

### 1. AutoEngagementCapture.jsx (NEW)

**Purpose:** Auto-manages webcam lifecycle during lecture

**Location:** `src/components/engagement/AutoEngagementCapture.jsx`

**Key Features:**
- Auto-requests camera permission on component mount
- Auto-starts camera when `enabled={true}`
- Auto-stops camera when `enabled={false}`
- Shows real-time status badge (Active/Denied/Initializing)
- Displays camera feed as 280x(16:9) PiP in bottom-right corner
- Has close button and permission retry button
- Handles permission denial gracefully

**Props:**
```javascript
{
  enabled: boolean,           // Controls auto-start/stop
  onFeaturesReady: function,  // Called when features extracted
  lecturePlaying: boolean,    // For state awareness
  sessionId: string,          // Passed to EngagementCamera
  lectureId: string           // Passed to EngagementCamera
}
```

**Usage in LecturePage:**
```javascript
<AutoEngagementCapture 
  enabled={phase === 'lecture' && playing}  // Auto-enable during lecture
  onFeaturesReady={(features) => {
    // Features contain: gaze_score, blink_rate, head_pose_*, au_*, etc.
    featureBuffer.current.push(features);
    if (featureBuffer.current.length >= 10) submitEngagement();
  }}
  sessionId={sessionId}
  lectureId={lectureId}
/>
```

### 2. EngagementCamera.jsx (EXISTING)

**Purpose:** Wraps MediaPipe Face Mesh for real-time feature extraction

**Location:** `src/components/player/EngagementCamera.jsx`

**What it does:**
- Opens browser webcam using getUserMedia API
- Initializes MediaPipe Face Mesh model
- Detects face landmarks in real-time (~30fps)
- Extracts:
  - **Gaze:** Eye center position → normalized gaze score (0-1)
  - **Blinks:** Eye aspect ratio changes → blink count/rate
  - **Head Pose:** Landmark geometry → yaw/pitch/roll angles
  - **Facial AUs:** Action unit descriptors (AU01-AU26, 2FACS standard)
  - **Confidence:** Face detection confidence score
  - **Behavioral:**  Keyboard/mouse activity, tab visibility, note-taking

**Calls parent's `onFeaturesReady` callback** every extraction interval (~1500ms)

---

## Data Flow: Feature Capture to Database

### Step 1: Feature Extraction (Client-Side)
```javascript
// In EngagementCamera, every 1500ms:
const extractedFeatures = {
  gaze_score: 0.75,           // 0-1, higher = looking at screen
  blink_rate: 12.5,           // blinks per minute
  head_pose_yaw: 0.05,        // radians, ±π rotation
  head_pose_pitch: -0.02,     // vertical tilt
  head_pose_roll: 0.01,       // head tilt
  eye_aspect_ratio_left: 0.25,
  eye_aspect_ratio_right: 0.24,
  mouth_openness: 0.1,
  
  // Facial Action Units (FACS) - 26 units total
  au01_inner_brow_raise: 0.2,        // au01 intensity 0-1
  au02_outer_brow_raise: 0.15,
  au04_brow_lowerer: 0.3,            // indicates concentration
  au06_cheek_raiser: 0.25,           // smile indicator
  au12_lip_corner_puller: 0.4,       // smile strength
  au15_lip_corner_depressor: 0.1,    // sadness
  au25_lips_part: 0.05,              // mouth opening
  au26_jaw_drop: 0.0,                // strong mouth opening
  // ... au07-au24 ...
  
  face_detected: true,
  face_confidence: 0.95,             // MediaPipe confidence
  timestamp: 1711267845123           // client timestamp
};
```

### Step 2: Feature Vectorization (Client-Side)
```javascript
// In LecturePage.jsx, before sending to API:
const featureVector = {
  ...extractedFeatures,              // All MediaPipe features
  session_id: sessionId,             // Unique session ID
  lecture_id: lectureId,
  timestamp: Date.now(),
  keyboard_active: true,              // From behavior tracking
  mouse_active: false,
  tab_visible: true,
  playback_speed: 1.0,
  note_taking: true,                 // Inferred from keyboard activity
};

featureBuffer.current.push(featureVector);
```

### Step 3: Batch Submission (Client-Side)
```javascript
// When buffer reaches 10 features (~15 seconds of data):
const submitEngagement = async () => {
  if (featureBuffer.current.length === 0) return;
  
  const response = await engagementAPI.submit({
    session_id: sessionId,
    lecture_id: lectureId,
    features: featureBuffer.current,  // Array of 10 feature vectors
    playback_speeds: playbackSpeedHistory,
    watch_duration: watchDuration,    // seconds watched
    total_duration: lecture.duration  // total lecture length
  });
  
  // Response contains engagement score + SHAP explanation
  setEngagementScore(response.data);
  featureBuffer.current = [];  // Clear buffer for next batch
};
```

### Step 4: Backend Processing
```
POST /api/engagement/submit
Body: { session_id, lecture_id, features: [...], ... }

Backend Flow:
1. Parse features array (10 feature vectors)
2. Normalize all feature values to [0, 1] range
3. Build engagement feature tensor (10 rows × ~40 columns)
4. Run XGBoost model inference:
   - Input: [gaze_score, blink_rate, head_pose_*, au_*, keyboard_active, ...]
   - Output: [engagement_score, boredom_prob, confusion_prob, frustration_prob]
5. Run ICAP classifier:
   - Determine if student is: Interactive/Constructive/Active/Passive
6. Generate SHAP explanations:
   - Which features most impacted the engagement score?
7. Store in EngagementLog:
   INSERT INTO engagement_log (
     id, lecture_id, student_id, session_id,
     engagement_score, boredom_prob, confusion_prob, frustration_prob,
     icap_mode, features (JSONB), shap_explanations (JSONB),
     model_type, confidence, created_at
   ) VALUES (...)
8. Return to frontend with calculations
```

### Step 5: Database Schema (Backend)
```sql
-- Table: engagement_log
CREATE TABLE engagement_log (
  id UUID PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES lectures(id),
  student_id UUID NOT NULL REFERENCES users(user_id),
  session_id VARCHAR(255) NOT NULL,
  
  -- Raw features (JSONB - stores all extracted MediaPipe data)
  features JSONB NOT NULL,  -- e.g., {gaze_score, blink_rate, head_pose_*, au_*, ...}
  
  -- ML Scores
  engagement_score FLOAT NOT NULL,      -- 0-100
  boredom_probability FLOAT,             -- 0-1
  confusion_probability FLOAT,           -- 0-1
  frustration_probability FLOAT,         -- 0-1
  
  -- ICAP Classification
  icap_mode VARCHAR(50),                 -- 'interactive', 'constructive', 'active', 'passive'
  icap_confidence FLOAT,                 -- 0-1
  
  -- Model Metadata
  model_type VARCHAR(100),               -- 'xgboost_hybrid', 'rule_based'
  model_version VARCHAR(50),
  shap_explanations JSONB,               -- Feature importance breakdown
  fuzzy_rules JSONB,                     -- Triggered heuristics
  
  -- Behavioral Data
  keyboard_activity INT,
  mouse_activity INT,
  tab_visible BOOLEAN,
  video_progress FLOAT,
  note_taking BOOLEAN,
  
  -- Metadata
  playback_speed FLOAT,
  watch_duration INT,                    -- seconds watched in this submission
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (lecture_id) REFERENCES lectures(id),
  FOREIGN KEY (student_id) REFERENCES users(user_id),
  INDEX idx_session (session_id),
  INDEX idx_student_lecture (student_id, lecture_id)
);

-- Query to get all MediaPipe features for a lecture:
SELECT 
  features->>'gaze_score' as gaze,
  features->>'blink_rate' as blinks,
  features->>'head_pose_yaw' as head_yaw,
  features->>'au04_brow_lowerer' as concentration,
  engagement_score,
  icap_mode,
  created_at
FROM engagement_log
WHERE lecture_id = 'lecture-123'
ORDER BY created_at DESC;
```

---

## Frontend Components Involved

### 1. LecturePage.jsx
- **Manages:** Video playback, phase transitions, feature buffering
- **Auto-does:**
  - Enables AutoEngagementCapture when playing
  - Collects and buffers features
  - Submits every 10 features
  - Auto-transitions: lecture → quiz → feedback → done
  - Shows engagement score in real-time panel

### 2. YouTubePlayer.jsx
- **Manages:** YouTube video rendering, playback controls
- **Integrates:** EngagementCamera for feature extraction
- **Calls:** `onFeaturesReady` callback to parent (LecturePage)

### 3. EngagementCamera.jsx
- **Manages:** Webcam access, MediaPipe Face Mesh
- **Extracts:** All facial features and AUs
- **Calls:** `onFeaturesReady` every 1500ms

### 4. AutoEngagementCapture.jsx (NEW)
- **Manages:** Auto-start/stop of camera lifecycle
- **Shows:** PiP camera feed in bottom-right
- **Delegates:** Feature extraction to EngagementCamera

### 5. QuizPhase.jsx
- **Auto-submits:** Quiz answers on time limit or manual submit
- **Auto-redirects:** To feedback phase after 3-second result display

### 6. FeedbackPhase.jsx
- **Auto-submits:** Feedback on button click
- **Auto-redirects:** To session summary after 3-second NLP analysis display

---

## Environment & Database Setup

### Backend Requirements

**Python packages** (already in requirements.txt):
```
tensorflow-cpu==2.16.1       # For ML model inference
numpy>=1.20                  # Matrix operations
scikit-learn>=1.0            # Feature scaling, preprocessing
xgboost>=1.5                 # XGBoost model inference
shap>=0.41                   # SHAP explanations
```

**PostgreSQL connection** (already configured):
```python
# app/database.py
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/smartlms_prod"
```

**EngagementLog table** (auto-created by SQLAlchemy):
```python
# app/models/models.py includes EngagementLog ORM definition
```

### Frontend Requirements

**npm packages** (already in package.json):
```json
"@mediapipe/camera_utils": "^0.3.1675466862",
"@mediapipe/face_mesh": "^0.4.1633559619",
"react": "^19.2.0"
```

---

## Data Persistence Guarantee

### What Gets Saved to Database?

✅ **For EACH feature submission (~10 features, ~15 seconds):**
- Raw MediaPipe features (gaze, blink, head pose, AU01-AU26)
- Extracted engagement score (0-100)
- Behavioral data (keyboard, mouse, tab visibility, video progress)
- ICAP classification (Interactive/Constructive/Active/Passive)
- SHAP explanations (which features influenced the score)
- Session metadata (session_id, lecture_id, student_id, timestamp)

✅ **For EACH quiz submission:**
- Quiz ID, student ID, answers submitted
- Score, percentage, correct count
- Time spent
- Quiz violations (tab switches, copy-paste attempts, etc.)

✅ **For EACH feedback submission:**
- Ratings (overall, clarity, content quality, pacing, difficulty)
- Text feedback
- NLP sentiment analysis results
- Feedback timestamp

✅ **For EACH lecture session:**
- Total watch duration
- Playback speed history
- Final engagement score
- All intermediate scores aggregated

### How to Query Saved Data

```python
# Backend query examples:
from app.models import EngagementLog, QuizAttempt, FeedbackLog

# All engagement for a student
engagement = db.query(EngagementLog).filter(
    EngagementLog.student_id == student_id
).all()

# All MediaPipe features for a lecture:
features_list = [
    log.features  # JSONB column contains all MediaPipe data
    for log in engagement
    if log.lecture_id == lecture_id
]

# Calculate average engagement
avg_engagement = db.query(
    func.avg(EngagementLog.engagement_score)
).filter(
    EngagementLog.lecture_id == lecture_id
).scalar()
```

---

## Frontend Logging & Debugging

### Console Logs You'll See

```javascript
// When lecture starts and camera initializes:
🎬 Lecture ended, submitting engagement data...
✅ Engagement submitted successfully: {...}
✅ Lecture complete points awarded
📋 Transitioning to next phase...
✅ Quizzes available, moving to quiz phase

// When quiz completes:
✅ Quiz submitted successfully: {...}
✅ Quiz complete points awarded
📝 Quiz complete, moving to feedback...

// When feedback submitted:
✅ Feedback submitted successfully: {...}
✅ Feedback points awarded
✅ Session complete, moving to summary...
```

### How to Enable Feature Debugging

In AutoEngagementCapture.jsx, add this to see all extracted features:

```javascript
// In onFeaturesReady callback:
console.group('🎥 MediaPipe Features Extracted');
console.log('Gaze Score:', features.gaze_score);
console.log('Blink Rate:', features.blink_rate);
console.log('Head Pose:', {
  yaw: features.head_pose_yaw,
  pitch: features.head_pose_pitch,
  roll: features.head_pose_roll
});
console.log('Action Units:', {
  AU04_concentration: features.au04_brow_lowerer,
  AU12_smile: features.au12_lip_corner_puller,
  AU25_lips_part: features.au25_lips_part,
});
console.log('Confidence:', features.face_confidence);
console.groupEnd();
```

---

## Testing the Implementation

### Test Case 1: Auto-Camera Start/Stop

```
1. Load lecture page
2. Verify camera permission prompt appears
3. Allow camera
4. Verify camera PiP appears in bottom-right
5. Verify status badge shows "Camera Active"
6. Play video
7. Stop video
8. Verify camera PiP closes
9. Verify AutoEngagementCapture unmounts
```

### Test Case 2: Engagement Data Submission

```
1. Play lecture video
2. Open browser DevTools → Network tab
3. Watch for POST /api/engagement/submit requests
4. Verify requests happen every ~10-15 seconds
5. Check request body contains:
   - session_id
   - lecture_id
   - features array (should be ~10 items)
   - playback_speeds
   - watch_duration
6. Verify response contains:
   - engagement_score
   - icap_mode
   - shap_explanations
7. Check Database:
   SELECT * FROM engagement_log ORDER BY created_at DESC LIMIT 10;
```

### Test Case 3: Auto-Phase Transition

```
1. Watch lecture to completion
2. Verify auto-redirect to quiz phase
3. Answer quiz questions
4. Verify quiz auto-submits on timer or manual submit
5. Verify auto-redirect to feedback phase (3 sec delay)
6. Submit feedback
7. Verify auto-redirect to session summary (3 sec delay)
8. Verify summary shows:
   - Engagement score breakdown
   - Boredom/Confusion/Frustration %
   - ICAP classification
   - Top factors (SHAP)
   - Engagement heatmap
```

### Test Case 4: Data Persistence

```
1. Complete full lecture session (all phases)
2. Query database:
   
   -- Verify engagement data saved
   SELECT count(*) FROM engagement_log 
   WHERE student_id = 'your-id';
   
   -- Verify quiz attempt saved
   SELECT * FROM quiz_attempt 
   WHERE student_id = 'your-id' 
   ORDER BY created_at DESC LIMIT 1;
   
   -- Verify feedback saved
   SELECT * FROM feedback_log 
   WHERE student_id = 'your-id' 
   ORDER BY created_at DESC LIMIT 1;
   
   -- View raw MediaPipe features
   SELECT 
     features->'gaze_score' as gaze,
     features->'head_pose_yaw' as yaw,
     features->'au04_brow_lowerer' as concentration,
     engagement_score,
     created_at
   FROM engagement_log
   WHERE student_id = 'your-id'
   ORDER BY created_at DESC LIMIT 10;
```

---

## Troubleshooting

### Issue: Camera doesn't auto-start

**Solution:**
1. Check browser console for permission errors
2. Verify camera permissions allowed in browser settings
3. Check AutoEngagementCapture receives `enabled={true}`
4. Ensure video is playing (`playing={true}`)

**Debug:**
```javascript
// In AutoEngagementCapture:
useEffect(() => {
  console.log('Enabled state:', enabled);
  console.log('Camera active:', cameraActive);
  console.log('Permission granted:', permissionGranted);
}, [enabled, cameraActive, permissionGranted]);
```

### Issue: Features not being submitted

**Solution:**
1. Check if 10 features are being collected
2. Verify feature buffer is filling: `console.log(featureBuffer.current.length)`
3. Check network tab for POST /api/engagement/submit requests
4. Verify backend is running and accessible

**Debug:**
```javascript
// In LecturePage:
console.log('Feature buffer size:', featureBuffer.current.length);
if (featureBuffer.current.length >= 10) {
  console.log('Submitting features...');
  submitEngagement();
}
```

### Issue: Phase transition not happening

**Solution:**
1. Verify engagement data submitted successfully
2. Check if quizzes exist (or should go to feedback)
3. Verify `onComplete` callbacks are being called

**Debug:**
```javascript
// In handleVideoEnd:
console.log('Video ended, quiz count:', quizzes.length);
await submitEngagement();
if (quizzes.length > 0) setPhase('quiz');
else setPhase('feedback');
```

### Issue: Data not in database

**Solution:**
1. Verify backend `/api/engagement/submit` endpoint is working
2. Check PostgreSQL connection string
3. Verify EngagementLog table exists
4. Check backend logs for errors

**Debug:**
```sql
-- Check if table exists
SELECT EXISTS (SELECT 1 FROM information_schema.tables 
WHERE table_name = 'engagement_log');

-- Check recent entries
SELECT * FROM engagement_log 
ORDER BY created_at DESC LIMIT 5;
```

---

## Summary

The auto-engagement capture implementation provides:

✅ **Seamless experience** - No manual actions needed past clicking "Play"  
✅ **Continuous tracking** - MediaPipe features captured every 1.5 seconds  
✅ **Automatic persistence** - Data saved to database every 10 features (~15 seconds)  
✅ **ML-powered insights** - Engagement score, ICAP, SHAP explanations computed server-side  
✅ **Structured workflow** - Auto-transitions through quiz → feedback → summary phases  
✅ **Full data pipeline** - Raw features → ML processing → database → analytics  

All engagement, quiz, and feedback data is permanently persisted and queryable!
