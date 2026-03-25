# SmartLMS API Endpoints Reference

**Base URL:** `http://localhost:8000`

In development, requests to `/api/*` are proxied to `http://localhost:8000` via `vite.config.js`.

**Authentication:** All endpoints except `POST /api/auth/register` and `POST /api/auth/login` require an `Authorization: Bearer {token}` header. The Axios client in `smartlms-frontend/src/api/client.js` attaches this header automatically via an interceptor.

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in and receive a JWT token |
| `GET` | `/api/auth/me` | Get the current user's profile |
| `PUT` | `/api/auth/me` | Update the current user's profile |
| `POST` | `/api/auth/change-password` | Change the current user's password |

### POST /api/auth/register
```json
// Request body
{ "email": "string", "full_name": "string", "password": "string", "role": "student|teacher|admin" }

// Response
{ "user": { "user_id": "...", "email": "...", "full_name": "...", "role": "..." }, "token": "string" }
```

### POST /api/auth/login
```json
// Request body
{ "email": "string", "password": "string" }

// Response
{ "user": { "user_id": "...", "email": "...", "full_name": "...", "role": "..." }, "token": "string" }
```

### GET /api/auth/me
```json
// Response
{ "user_id": "...", "email": "...", "full_name": "...", "role": "...", "avatar_url": "...", "created_at": "..." }
```

### PUT /api/auth/me
```json
// Request body (all fields optional)
{ "full_name": "string", "avatar_url": "string", "email": "string" }

// Response
{ "success": true, "user": { ... } }
```

### POST /api/auth/change-password
```json
// Request body
{ "old_password": "string", "new_password": "string" }

// Response
{ "success": true }
```

---

## Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/courses` | List all courses |
| `GET` | `/api/courses/enrolled/my-courses` | Get the current student's enrolled courses |
| `GET` | `/api/courses/{courseId}` | Get a single course |
| `POST` | `/api/courses` | Create a course (teacher/admin) |
| `PUT` | `/api/courses/{courseId}` | Update a course |
| `DELETE` | `/api/courses/{courseId}` | Delete a course |
| `POST` | `/api/courses/{courseId}/enroll` | Enroll the current user in a course |
| `GET` | `/api/courses/{courseId}/students` | List students enrolled in a course |

### GET /api/courses
```
Query params: skip (int), limit (int), published_only (bool)

Response: { "data": [{ "id", "title", "description", "instructor_id", "instructor_name", "created_at", "updated_at", "is_published", "image_url" }] }
```

### GET /api/courses/{courseId}
```
Response: { "id", "title", "description", "instructor_id", "instructor_name", "lectures": [...], "created_at", "updated_at" }
```

### GET /api/courses/enrolled/my-courses
```
Response: { "data": [{ "course_id", "title", "description", "instructor_name", "progress": float, "enrollment_date" }] }
```

### POST /api/courses
```json
// Request body
{ "title": "string", "description": "string", "published": false }

// Response
{ "id": "...", "title": "...", "description": "...", "instructor_id": "...", "created_at": "..." }
```

### PUT /api/courses/{courseId}
```json
// Request body (all fields optional)
{ "title": "string", "description": "string", "published": true, "image_url": "string" }

// Response
{ "success": true, "course": { ... } }
```

### POST /api/courses/{courseId}/enroll
```json
// Response
{ "success": true, "enrollment_id": "string" }
```

### GET /api/courses/{courseId}/students
```
Response: { "students": [{ "user_id", "full_name", "email", "enrollment_date", "last_active" }] }
```

---

## Lectures

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lectures/course/{courseId}` | List lectures for a course |
| `GET` | `/api/lectures/{lectureId}` | Get a single lecture |
| `POST` | `/api/lectures` | Create a lecture |
| `PUT` | `/api/lectures/{lectureId}` | Update a lecture |
| `DELETE` | `/api/lectures/{lectureId}` | Delete a lecture |
| `POST` | `/api/lectures/{lectureId}/upload-video` | Upload a video file for a lecture |
| `POST` | `/api/lectures/youtube-import` | Import a YouTube video as a lecture |
| `GET` | `/api/lectures/{lectureId}/materials` | List materials for a lecture |
| `GET` | `/api/lectures/course/{courseId}/materials` | List all materials for a course |
| `POST` | `/api/lectures/materials` | Upload a material file |
| `DELETE` | `/api/lectures/materials/{materialId}` | Delete a material |

### GET /api/lectures/course/{courseId}
```
Response: { "lectures": [{ "id", "title", "description", "video_url", "duration", "order", "created_at" }] }
```

### POST /api/lectures
```json
// Request body
{ "course_id": "string", "title": "string", "description": "string" }

// Response
{ "id": "...", "course_id": "...", "title": "...", "description": "...", "order": 1, "created_at": "..." }
```

### PUT /api/lectures/{lectureId}
```json
// Request body (all fields optional)
{ "title": "string", "description": "string", "video_url": "string", "order": 1 }

// Response
{ "success": true, "lecture": { ... } }
```

### POST /api/lectures/{lectureId}/upload-video
```
Content-Type: multipart/form-data
Body: video file

Response: { "success": true, "video_url": "string" }
```

### POST /api/lectures/youtube-import
```json
// Request body
{ "course_id": "string", "youtube_url": "string", "title": "string (optional)" }

// Response
{ "lecture_id": "...", "title": "...", "video_url": "...", "duration": 0 }
```

### POST /api/lectures/materials
```
Content-Type: multipart/form-data
Body: file + lecture_id (string) + file_name (string)

Response: { "id", "lecture_id", "file_url", "file_name", "mime_type", "uploaded_at" }
```

---

## Engagement

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/engagement/submit` | Submit engagement data for a lecture session |
| `GET` | `/api/engagement/history/{lectureId}` | Get engagement history for a lecture |
| `GET` | `/api/engagement/student-summary/{studentId}` | Get engagement summary for a student |
| `GET` | `/api/engagement/heatmap/{lectureId}` | Get engagement heatmap for a lecture |
| `GET` | `/api/engagement/heatmap/{lectureId}/me` | Get heatmap for the current user |
| `GET` | `/api/engagement/live-watchers/{lectureId}` | Get currently active watchers |
| `GET` | `/api/engagement/model-info` | Get ML model metadata |
| `GET` | `/api/engagement/models` | List available inference models |
| `POST` | `/api/engagement/models/infer` | Run inference with a specific model |

### POST /api/engagement/submit
```json
// Request body
{
  "lecture_id": "string",
  "session_id": "string",
  "features": {
    "gaze_score": 0.85,
    "blink_rate": 0.3,
    "head_pose_x": 0.1,
    "head_pose_y": -0.05,
    "head_pose_z": 0.02,
    "action_units": {},
    "timestamp": "2024-01-01T12:00:00Z",
    "face_detected": true,
    "screen_time_ms": 5000,
    "keyboard_activity": 2,
    "mouse_activity": 5,
    "video_progress": 0.45
  },
  "icap_labels": ["active"],
  "comments": "string (optional)"
}

// Response
{
  "engagement_score": 78.5,
  "boredom_probability": 0.12,
  "confusion_probability": 0.08,
  "frustration_probability": 0.05,
  "icap_mode": "active",
  "shap_explanation": { "base_value": 0.5, "values": [...], "feature_names": [...] },
  "suggestions": ["string"]
}
```

### GET /api/engagement/history/{lectureId}
```
Query params: student_id (string), skip (int), limit (int)

Response: { "entries": [{ "id", "lecture_id", "student_id", "session_id", "engagement_score", "boredom_prob", "confusion_prob", "frustration_prob", "icap_mode", "features", "timestamp" }] }
```

### GET /api/engagement/student-summary/{studentId}
```
Response: {
  "average_engagement": float,
  "total_sessions": int,
  "average_boredom": float,
  "average_confusion": float,
  "average_frustration": float,
  "icap_distribution": { "interactive": int, "constructive": int, "active": int, "passive": int },
  "trend": "improving|stable|degrading"
}
```

### GET /api/engagement/heatmap/{lectureId}
```
Query params: interval (seconds, default 30), student_id (string)

Response: {
  "heatmap_data": [{ "timestamp": "ISO8601", "segment": int, "average_engagement": float, "student_count": int }],
  "video_duration": int
}
```

### GET /api/engagement/models
```
Response: [
  {
    "model_id": "builtin::xgboost",
    "name": "string",
    "family": "string",
    "status": "available|requires_tensorflow",
    "source": "string",
    "recommended": true,
    "notes": "string",
    "accuracy_hint": 0.85
  }
]
```

### POST /api/engagement/models/infer
```json
// Request body
{
  "model_id": "builtin::xgboost",
  "features": [{ "gaze_score": 0.85, "blink_rate": 0.3, "head_pose_x": 0.1, "..." : "..." }]
}

// Response
{ "model_id": "string", "inference_output": {}, "processing_time_ms": 12 }
```

---

## Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quizzes/lecture/{lectureId}` | Get quizzes for a lecture |
| `GET` | `/api/quizzes/mine` | Get all quizzes for the current student |
| `POST` | `/api/quizzes` | Create a quiz (teacher) |
| `PUT` | `/api/quizzes/{quizId}` | Update a quiz |
| `DELETE` | `/api/quizzes/{quizId}` | Delete a quiz |
| `POST` | `/api/quizzes/attempt` | Submit a quiz attempt |
| `GET` | `/api/quizzes/attempts/{quizId}` | Get attempts for a quiz |
| `POST` | `/api/quizzes/generate-ai` | Generate quiz questions with AI |
| `POST` | `/api/quizzes/generate-ai-refine` | Refine AI-generated questions |

### POST /api/quizzes
```json
// Request body
{
  "lecture_id": "string",
  "title": "string",
  "questions": [
    { "question_text": "string", "options": ["A", "B", "C", "D"], "correct_answer_index": 0, "explanation": "string" }
  ],
  "published": true,
  "auto_grade": true,
  "time_limit": 300
}
```

### POST /api/quizzes/attempt
```json
// Request body
{
  "quiz_id": "string",
  "answers": [{ "question_index": 0, "selected_option_index": 2 }],
  "time_spent_seconds": 120
}

// Response
{
  "attempt_id": "string",
  "score": 80.0,
  "percentage": 80.0,
  "correct_count": 4,
  "total_questions": 5,
  "feedback": [{ "question_index": 0, "is_correct": true, "explanation": "string" }]
}
```

### POST /api/quizzes/generate-ai
```json
// Request body
{ "lecture_id": "string", "lecture_title": "string", "lecture_transcript": "string", "num_questions": 5 }

// Response
{ "questions": [{ "question_text": "string", "options": [...], "difficulty": "easy|medium|hard", "topic": "string" }], "suggestions": [...] }
```

---

## Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/feedback` | Submit feedback for a lecture |
| `GET` | `/api/feedback/lecture/{lectureId}` | Get feedback for a lecture |
| `GET` | `/api/feedback/course/{courseId}` | Get aggregated feedback for a course |

### POST /api/feedback
```json
// Request body
{ "lecture_id": "string", "clarity": 4, "content_quality": 5, "comments": "string" }

// Response
{ "id": "...", "lecture_id": "...", "student_id": "...", "clarity": 4, "content_quality": 5, "comments": "...", "timestamp": "..." }
```

### GET /api/feedback/course/{courseId}
```
Response: { "average_clarity": float, "average_quality": float, "total_responses": int, "comments": [...] }
```

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List notifications for the current user |
| `GET` | `/api/notifications/unread-count` | Get the unread notification count |
| `PUT` | `/api/notifications/{notificationId}/read` | Mark a notification as read |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read |
| `POST` | `/api/notifications/announce` | Send an announcement notification |

### GET /api/notifications
```
Query params: skip (int), limit (int), unread_only (bool)

Response: { "notifications": [{ "id", "user_id", "title", "message", "type", "read": bool, "created_at" }] }
```

### POST /api/notifications/announce
```json
// Request body
{ "title": "string", "message": "string", "recipient_ids": ["userId1", "userId2"], "type": "string" }
```

---

## Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/course-dashboard/{courseId}` | Course-level analytics dashboard |
| `GET` | `/api/analytics/lecture-dashboard/{lectureId}` | Lecture-level analytics dashboard |
| `GET` | `/api/analytics/student-dashboard` | Current student's analytics dashboard |
| `GET` | `/api/analytics/student-engagement-history` | Current student's engagement history |
| `GET` | `/api/analytics/teaching-score/{courseId}` | Teaching quality score for a course |

### GET /api/analytics/course-dashboard/{courseId}
```
Response: {
  "course_title": "string",
  "total_students": int,
  "average_engagement": float,
  "engagement_by_lecture": [{ "lecture_id", "lecture_title", "avg_engagement", "student_count" }],
  "top_performers": [{ "student_id", "full_name", "avg_engagement" }],
  "icap_distribution": { "interactive": int, "constructive": int, "active": int, "passive": int }
}
```

### GET /api/analytics/student-dashboard
```
Response: {
  "total_courses": int,
  "average_engagement": float,
  "courses": [{ "course_id", "course_title", "engagement_score", "watch_time", "quiz_avg_score" }],
  "engagement_trend": [{ "date", "engagement_score" }],
  "achievements": [{ "name", "description", "unlocked_at" }]
}
```

### GET /api/analytics/student-engagement-history
```
Query params: limit (int, default 120)

Response: [{ "lecture_id", "lecture_title", "engagement_score", "timestamp" }]
```

### GET /api/analytics/teaching-score/{courseId}
```
Response: {
  "overall_score": float,
  "clarity_score": float,
  "engagement_impact": float,
  "student_satisfaction": float,
  "improvement_suggestions": ["string"]
}
```

---

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/teachers` | List all teachers |
| `GET` | `/api/admin/teacher/{teacherId}` | Get a specific teacher's details |
| `GET` | `/api/admin/users` | List all users |
| `PUT` | `/api/admin/users/{userId}/toggle-active` | Activate or deactivate a user |
| `DELETE` | `/api/admin/users/{userId}` | Delete a user |
| `DELETE` | `/api/admin/courses/{courseId}` | Delete a course (admin override) |
| `GET` | `/api/admin/system-stats` | Get system-wide statistics |

### GET /api/admin/teachers
```
Query params: skip (int), limit (int), search (string)

Response: { "teachers": [{ "user_id", "full_name", "email", "total_courses", "total_students", "rating": float }] }
```

### GET /api/admin/users
```
Query params: skip (int), limit (int), role (string), search (string)

Response: { "users": [{ "user_id", "full_name", "email", "role", "is_active": bool, "created_at", "last_login" }], "total": int }
```

### GET /api/admin/system-stats
```
Response: {
  "total_users": int,
  "total_courses": int,
  "total_lectures": int,
  "active_students": int,
  "average_engagement": float,
  "system_health": "healthy|warning|critical"
}
```

---

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/activity-history` | Get the current user's activity history |
| `GET` | `/api/users/engagement-history` | Get the current user's engagement history |
| `GET` | `/api/users/feedback-history` | Get the current user's feedback history |
| `GET` | `/api/users/export-data` | Export the current user's data as JSON |

### GET /api/users/activity-history
```
Response: { "activities": [{ "timestamp", "action", "details" }] }
```

### GET /api/users/engagement-history
```
Response: { "engagement_entries": [{ "lecture_id", "lecture_title", "engagement_score", "timestamp" }] }
```

---

## Gamification

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/gamification/profile` | Get the current user's gamification profile |
| `POST` | `/api/gamification/award-points` | Award points to the current user |
| `GET` | `/api/gamification/leaderboard` | Get the points leaderboard |

### GET /api/gamification/profile
```
Response: {
  "user_id": "...",
  "full_name": "...",
  "points": int,
  "level": int,
  "rank": "string",
  "achievements": [{ "name", "icon", "unlocked_at" }],
  "streak": int,
  "badges": [...]
}
```

### POST /api/gamification/award-points
```
Query params: activity (string), amount (int)

Response: { "success": true, "new_points": int, "new_level": int }
```

### GET /api/gamification/leaderboard
```
Query params: period ("weekly|monthly|all_time"), limit (int)

Response: {
  "leaderboard": [{ "rank": int, "user_id", "full_name", "points": int, "level": int, "avatar_url" }],
  "user_rank": int,
  "user_points": int
}
```

---

## Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assignments/course/{courseId}` | List assignments for a course |
| `POST` | `/api/assignments` | Create an assignment (teacher) |
| `POST` | `/api/assignments/submit` | Submit an assignment (student) |
| `GET` | `/api/assignments/{assignmentId}/submissions` | List submissions for an assignment |
| `PUT` | `/api/assignments/submissions/{submissionId}/grade` | Grade a submission (teacher) |

### POST /api/assignments
```json
// Request body
{
  "course_id": "string",
  "title": "string",
  "description": "string",
  "file_url": "string",
  "max_score": 100.0,
  "due_date": "2024-12-31T23:59:59Z"
}
```

### POST /api/assignments/submit
```json
// Request body
{ "assignment_id": "string", "file_url": "string", "text": "string" }
```

### PUT /api/assignments/submissions/{submissionId}/grade
```json
// Request body
{ "grade": 85.0, "teacher_feedback": "string" }
```

---

## Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/messages` | Send a message |
| `GET` | `/api/messages/conversations` | List the current user's conversations |
| `GET` | `/api/messages/with/{userId}` | Get messages in a conversation |
| `GET` | `/api/messages/unread-count` | Get the unread message count |
| `GET` | `/api/messages/search` | Search messages |
| `PUT` | `/api/messages/{messageId}/read` | Mark a message as read |
| `GET` | `/api/messages/student-analytics/{studentId}` | Get analytics context for a student conversation |
| `POST` | `/api/messages/bulk-send` | Send a message to multiple recipients |
| `GET` | `/api/messages/at-risk-students/{courseId}` | Get at-risk students for a course |

### POST /api/messages
```json
// Request body
{
  "receiver_id": "string",
  "subject": "string",
  "content": "string",
  "course_id": "string",
  "category": "general|academic|support",
  "parent_id": "string (for replies)",
  "analytics_context": {}
}
```

### GET /api/messages/with/{userId}
```
Query params: skip (int), limit (int)
```

### GET /api/messages/search
```
Query params: q (string), course_id (string)
```

### POST /api/messages/bulk-send
```json
// Request body
{ "receiver_ids": ["userId1", "userId2"], "subject": "string", "content": "string", "course_id": "string" }
```

---

## Tutor (AI Chat)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tutor/sessions` | List the current user's tutor sessions |
| `POST` | `/api/tutor/sessions` | Create a new tutor session |
| `GET` | `/api/tutor/sessions/{sessionId}/messages` | Get messages in a session |
| `DELETE` | `/api/tutor/sessions/{sessionId}` | Delete a tutor session |
| `POST` | `/api/tutor/chat` | Send a chat message (streaming response) |

### POST /api/tutor/sessions
```
Query params: title (string), mode (string, e.g. "general" or "quiz")
```

### POST /api/tutor/chat
```json
// Request body
{ "session_id": "string", "message": "string", "context": {} }

// Response: Server-Sent Events (SSE) stream of text chunks
```

> The `/api/tutor/chat` endpoint returns a streaming (chunked) response. The frontend reads it using the Fetch API's `ReadableStream` rather than Axios.

---

## Error Responses

All endpoints return standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Unauthorized — token missing or expired |
| `403` | Forbidden — insufficient role permissions |
| `404` | Resource not found |
| `422` | Unprocessable entity (FastAPI validation) |
| `500` | Internal server error |

On a `401` response the frontend automatically clears the stored token and redirects to `/login`.
