# ⚡ Quick Deployment Checklist

## Pre-Launch Verification

- [ ] Frontend builds successfully
  ```bash
  npm run build
  # Result: ✅ No errors, 3013 modules
  ```

- [ ] Backend services running
  ```bash
  python run.py
  # Check: Port 8000 responding
  ```

- [ ] Database connected
  ```bash
  psql -U smartlms_user -d smartlms_prod -c "SELECT 1;"
  # Result: 1
  ```

- [ ] API endpoints accessible
  ```bash
  curl http://localhost:8000/api/health
  # Result: {"status": "ok"}
  ```

---

## First Test Run

### Step 1: Load Lecture Page
- [ ] Navigate to: `/course/[courseId]/lecture/[lectureId]`
- [ ] Page loads without errors
- [ ] Video player visible
- [ ] "Play" button available

### Step 2: Allow Camera Access
- [ ] Browser prompts: "Allow camera access?"
- [ ] Click "Allow"
- [ ] No errors in DevTools Console

### Step 3: Play Video
- [ ] Click "Play" button
- [ ] Video starts playing
- [ ] Verify within 2 seconds:
  - [ ] Camera PiP appears in bottom-right
  - [ ] Status badge shows "Camera Active"
  - [ ] Camera view shows your face/scene

### Step 4: Monitor Feature Submission (30 seconds)
- [ ] Open DevTools (F12) → Network tab
- [ ] Filter: "engagement"
- [ ] Should see: POST /api/engagement/submit
  - First request: ~15-20 seconds after play starts
  - Subsequent requests: Every 10-15 seconds
- [ ] Click request → Payload tab
- [ ] Verify contains:
  ```json
  {
    "session_id": "...",
    "lecture_id": "...",
    "features": [
      {
        "gaze_score": 0.XX,
        "blink_rate": XX.X,
        "head_pose_yaw": 0.XX,
        "au04_brow_lowerer": 0.XX,
        ...
      },
      ...
    ]  // Should be ~10 items
  }
  ```

### Step 5: Verify Response (Engagement Score)
- [ ] Response should contain:
  ```json
  {
    "engagement_score": XX,
    "icap_mode": "interactive|constructive|active|passive",
    "shap_explanations": {...},
    ...
  }
  ```
- [ ] Video player shows engagement panel with score
- [ ] Score updates after each submission

### Step 6: Test Auto-End on Lecture Completion
- [ ] Skip video to near end (or wait for completion)
- [ ] Let video finish or click "End Lecture"
- [ ] Verify within 2 seconds:
  - [ ] Camera PiP closes
  - [ ] Engagement data submitted (final request)
- [ ] Wait 3 seconds...
- [ ] Page auto-redirects to:
  - [ ] Quiz phase (if quizzes exist) → Answer questions
  - [ ] Or Feedback phase → Provide feedback
  - [ ] Verify auto-advance happens after each phase

### Step 7: Verify Database Storage
- [ ] Open terminal
- [ ] Query database:
  ```sql
  psql -U smartlms_user -d smartlms_prod << EOF
  SELECT COUNT(*) as engagement_count FROM engagement_log 
  WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND student_id = '[your_student_id]';
  EOF
  ```
- [ ] Result: `count > 0` (should be ~2-3 submissions for 30s video)

- [ ] View actual engagement data:
  ```sql
  psql -U smartlms_user -d smartlms_prod << EOF
  SELECT 
    engagement_score, 
    icap_mode, 
    features->>'gaze_score' as gaze,
    features->>'blink_rate' as blink_rate,
    created_at
  FROM engagement_log 
  WHERE student_id = '[your_student_id]'
  ORDER BY created_at DESC 
  LIMIT 3;
  EOF
  ```
- [ ] Verify engagement_score is between 0-100
- [ ] Verify icap_mode is one of: interactive, constructive, active, passive
- [ ] Verify gaze and blink_rate have numerical values

---

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Camera doesn't appear | Reset browser permissions → F12 Console → Check for errors |
| No API requests in Network tab | Check if `enabled={true}` condition met, verify video is playing |
| Blank engagement score | Reload page, ensure backend is running, check `/api/engagement/submit` response |
| Auto-redirect not working | Check DevTools for phase transition logs, verify components have `onComplete` callbacks |
| Database query returns 0 | Check table exists, verify student_id matches logged-in user, check table not empty |

---

## Performance Metrics

After 1-minute test lecture:

| Metric | Expected | Actual |
|--------|----------|--------|
| API submissions | ~4 | --- |
| Features in DB | ~40 | --- |
| Camera PiP lag | <100ms | --- |
| API response time | <500ms | --- |
| DB query time | <100ms | --- |

---

## Rollback Plan

If issues occur:

### Quick Disable
```javascript
// In LecturePage.jsx, temporarily disable feature:
<AutoEngagementCapture 
  enabled={false}  // Disables auto-camera
  ...
/>
```

### Remove Component
```javascript
// In LecturePage.jsx, comment out:
{/* 
<AutoEngagementCapture 
  enabled={...}
  ...
/>
*/}
```

### Restore Previous Build
```bash
# If build has issues:
git checkout HEAD -- src/
npm run build  # Rebuild with previous code
```

---

## Success Criteria

✅ All items checked above  
✅ No errors in browser console  
✅ Engagement data visible in DevTools Network tab  
✅ Database populated with engagement records  
✅ Auto-phases work (video end → quiz → feedback → summary)  
✅ Real-time engagement score displays on video player  

**Status: READY FOR PRODUCTION** 🚀

