# SmartLMS Frontend Rebuild Prompt for AI Assistant (Stitch/Claude)

## CRITICAL CONSTRAINT
🚫 **DO NOT MODIFY BACKEND OR DATABASE** — Only regenerate the React/Vite frontend. The backend API at `http://localhost:8000` is already implemented and should work as-is.

---

## 1. PROJECT OVERVIEW

**Project Name:** SmartLMS (Smart Learning Management System)

**Purpose:** A comprehensive educational platform with engagement tracking, AI-powered quiz generation, multimodal learning analytics, and gamification. Targets students, teachers, and administrators.

**Key Differentiators:**
- Real-time engagement scoring via facial/behavioral analysis (MediaPipe)
- ICAP classification (Interactive, Constructive, Active, Passive learning modes)
- AI-powered quiz generation from lecture content (YouTube integration)
- SHAP-based explainability for engagement scores
- Gamification with leaderboards and points
- Multi-role access control (student/teacher/admin)

---

## 2. TECHNOLOGY STACK & BUILD SETUP

### Core Frontend Stack
- **Framework:** React 19.2.0 with React Router 7.13.0
- **Build Tool:** Vite 7.3.1
- **Styling:** Tailwind CSS 4.2.0 + custom CSS variables
- **UI Components:** Radix UI (extensive use for accessible dialogs, dropdowns, tabs, etc.)
- **Animations:** Framer Motion 12.38.0 + GSAP 3.14.2
- **HTTP Client:** Axios 1.13.5 with JWT interceptors
- **Charting:** Recharts 3.7.0 (bar, line, radar, area charts)
- **Icons:** Lucide React 0.575.0
- **Video Player:** React Player 3.4.0

### Development Dependencies
- ESLint with React-specific rules
- PostCSS + Autoprefixer (Tailwind integration)
- @vitejs/plugin-react for Fast Refresh

### Build & Dev Commands
```bash
npm run dev       # Start dev server on port 5173 with API proxy to localhost:8000
npm run build     # Production build → dist/
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

---

## 3. DESIGN SYSTEM & STYLING

### Design Philosophy
**Neo-Brutalist meets Premium SaaS:** Clean, modern, bold typography. High contrast. Accent-driven visual hierarchy. Dark mode support.

### Color Scheme (CSS Variables in index.css)
```
Primary Colors:
  --color-primary: hsl(252, 78%, 60%)              // Purple
  --color-accent: hsl(252, 78%, 60%)               // Purple (same as primary)
  --color-text: hsl(240, 10%, 12%)                 // Dark text
  --color-text-secondary: hsl(240, 5%, 40%)
  --color-text-muted: hsl(240, 5%, 55%)

Surface Colors:
  --color-surface: hsl(0, 0%, 100%)                // White
  --color-surface-alt: hsl(240, 20%, 98%)          // Light gray
  --color-surface-elevated: hsl(240, 14%, 96%)     // Medium light gray

Semantic Colors:
  --color-success: hsl(160, 84%, 39%)              // Green
  --color-warning: hsl(38, 92%, 50%)               // Amber/Orange
  --color-danger: hsl(0, 84%, 60%)                 // Red
  --color-info: hsl(217, 91%, 60%)                 // Blue

Shadows & Effects:
  --shadow-xs, --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl, --shadow-2xl
  --shadow-accent: 0 4px 16px hsla(252,78%,55%,0.25)

Gradients:
  --gradient-primary: linear-gradient(135deg, hsl(252, 78%, 55%), hsl(252, 78%, 65%))
  --gradient-hero: Dark gradient for landing page hero
  --gradient-glass: Glassmorphism effect
```

### Border Radius Scale (CSS Variables)
- --radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-2xl

### Font Configuration
- **Sans (body text):** Inter (system-ui fallback)
- **Mono (data/code):** JetBrains Mono (monospace fallback)

### Dark Mode
- Enabled via `data-theme="dark"` selector on root element
- ThemeContext manages theme state and localStorage persistence
- All colors auto-adjust; no need for separate dark mode CSS

### Key Animations (in tailwind.config.js)
- `animate-fade-in-up`, `animate-fade-in`, `animate-float`, `animate-glow-pulse`
- Framer Motion for component transitions and page enter/exit effects

### Tailwind Configuration
- Custom color palette using CSS variables
- Extended borderRadius with variable references
- Extended boxShadow with variable references
- Custom keyframe animations defined
- Content paths: `["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`

---

## 4. PROJECT STRUCTURE

```
smartlms-frontend/
├── public/                           # Static assets
├── src/
│   ├── api/
│   │   └── client.js                # Axios instance + all API endpoint bindings
│   ├── assets/                       # Images, logos, SVGs
│   ├── components/
│   │   ├── engagement/               # Engagement-related UI components
│   │   │   └── (various engagement tracking components)
│   │   ├── layout/
│   │   │   ├── Navbar.jsx           # Top navigation bar (logo, auth, notifications)
│   │   │   ├── Sidebar.jsx          # Left sidebar with role-based navigation
│   │   │   └── ThemeToggle.jsx      # Dark/light mode toggle
│   │   ├── player/                  # Video player related components
│   │   │   └── (player UI components)
│   │   └── ui/                       # Presentational/atomic components
│   │       ├── card.jsx              # Card wrapper with consistent styling
│   │       ├── AnimatedGradient.jsx
│   │       ├── GlowingBorder.jsx
│   │       ├── PageTransition.jsx
│   │       ├── spotlight.jsx
│   │       └── splite.jsx
│   ├── context/
│   │   ├── AuthContext.jsx          # User auth state + login/register logic
│   │   ├── ActivityTracker.jsx      # Event tracking for user interactions
│   │   └── ThemeContext.jsx         # Dark mode toggle state
│   ├── lib/                          # Utility functions and helpers
│   ├── pages/
│   │   ├── Landing.jsx              # Public landing page (pre-login)
│   │   ├── LandingHero.jsx          # Hero section with animations
│   │   ├── Login.jsx                # Login form page
│   │   ├── Register.jsx             # Registration form page
│   │   ├── Dashboard.jsx            # Role-based dashboard (student/teacher/admin)
│   │   ├── Messages.jsx             # Messaging/chat page
│   │   ├── SearchResults.jsx        # Global course/quiz search results
│   │   ├── admin/
│   │   │   ├── UserManagement.jsx  # Admin user list + toggle active status
│   │   │   └── TeacherOverview.jsx # Admin teacher management page
│   │   ├── student/
│   │   │   ├── MyCourses.jsx       # Student enrolled courses browsing
│   │   │   ├── MyQuizzes.jsx       # Student quiz discovery (new grid-based page)
│   │   │   ├── CoursePage.jsx      # Course overview + lectures list
│   │   │   ├── LecturePage.jsx     # Full lecture experience (video + phases)
│   │   │   ├── QuizPhase.jsx       # Quiz attempt interface (tabs: questions, results, feedback)
│   │   │   ├── MaterialsTab.jsx    # Course materials/resources tab
│   │   │   ├── FeedbackPhase.jsx   # Feedback submission form
│   │   │   ├── MyAnalytics.jsx     # Student personal engagement analytics
│   │   │   ├── MyProfile.jsx       # User profile edit page
│   │   │   ├── AITutor.jsx         # AI chatbot tutor interface
│   │   │   └── Leaderboard.jsx     # Gamification leaderboard with ranks/points
│   │   └── teacher/
│   │       ├── ManageCourses.jsx   # Teacher course CRUD interface
│   │       ├── EditCourse.jsx      # Course details editor (lectures, settings)
│   │       ├── TeachingDashboard.jsx # Analytics dashboard for teachers
│   │       └── AIQuizGenerator.jsx # AI quiz generator from lecture content
│   ├── App.jsx                      # Main app routing + layout wrappers
│   ├── App.css                      # App-specific styles
│   ├── index.css                    # Global design tokens + CSS variables
│   ├── main.jsx                     # React entry point
│   ├── engagement-live-test.jsx    # Test page for live engagement tracking
│   └── youtube-player-test.jsx     # Test page for YouTube video + inference
├── index.html                        # HTML entry point
├── package.json                      # Dependencies
├── tailwind.config.js               # Tailwind CSS configuration
├── vite.config.js                   # Vite configuration
└── eslint.config.js                 # ESLint rules
```

---

## 5. AUTHENTICATION & CONTEXT PROVIDERS

### AuthContext (src/context/AuthContext.jsx)
Manages user authentication state throughout the app.

**Exports:**
- `useAuth()` hook returning: `{ user, loading, token, login, register, logout, updateProfile }`
- `AuthProvider` component (wraps app root)

**User Object Structure:**
```javascript
{
  user_id: string,
  email: string,
  full_name: string,
  role: 'student' | 'teacher' | 'admin',
  avatar_url?: string,
  created_at: ISO8601 timestamp
}
```

**Key Features:**
- Persistent login via localStorage (token + user JSON)
- Auto-redirect to /login on 401 responses (via Axios interceptor)
- Loading state during auth check
- Token attached to all API requests via Axios interceptor

### ActivityTracker (src/context/ActivityTracker.jsx)
Event tracking for user interactions (usage analytics, not engagement ML).

**Exports:**
- `useActivity()` hook returning: `{ trackEvent(name, metadata?) }`
- `ActivityProvider` component

**Events Tracked:**
- Page views: `my_courses_viewed`, `dashboard_viewed`, `lecture_viewed`
- User actions: `course_enrolled`, `quiz_attempted`, `lecture_completed`

### ThemeContext (src/context/ThemeContext.jsx)
Dark mode toggle state management.

**Exports:**
- `useTheme()` hook returning: `{ theme, toggleTheme }`
- `ThemeProvider` component
- Persists theme preference in localStorage
- Updates `data-theme` attribute on document root

---

## 6. API ENDPOINTS & CONTRACTS

**Base URL:** `http://localhost:8000` (proxied in dev via vite.config.js)

**Authentication:** All endpoints (except /auth/register and /auth/login) require `Authorization: Bearer {token}` header (automatically added by Axios interceptor in client.js)

### Authentication API
```
POST /api/auth/register
  Body: { email: string, full_name: string, password: string, role: 'student'|'teacher'|'admin' }
  Response: { user: UserObject, token: string }

POST /api/auth/login
  Body: { email: string, password: string }
  Response: { user: UserObject, token: string }

GET /api/auth/me
  Response: { user_id, email, full_name, role, avatar_url, created_at }

PUT /api/auth/me
  Body: { full_name?: string, avatar_url?: string, email?: string }
  Response: { success: bool, user: UserObject }

POST /api/auth/change-password
  Body: { old_password: string, new_password: string }
  Response: { success: bool }
```

### Courses API
```
GET /api/courses
  Query: { skip?: int, limit?: int, published_only?: bool }
  Response: { data: [{ id, title, description, instructor_id, instructor_name, created_at, updated_at, is_published, image_url }] }

GET /api/courses/{courseId}
  Response: { id, title, description, instructor_id, instructor_name, lectures: [...], created_at, updated_at }

GET /api/courses/enrolled/my-courses
  Response: { data: [{ course_id, title, description, instructor_name, progress: float, enrollment_date }] }

POST /api/courses
  Body: { title: string, description: string, published: bool }
  Response: { id, title, description, instructor_id, created_at }

PUT /api/courses/{courseId}
  Body: { title?: string, description?: string, published?: bool, image_url?: string }
  Response: { success: bool, course: CourseObject }

DELETE /api/courses/{courseId}
  Response: { success: bool }

POST /api/courses/{courseId}/enroll
  Response: { success: bool, enrollment_id: string }

GET /api/courses/{courseId}/students
  Response: { students: [{ user_id, full_name, email, enrollment_date, last_active }] }
```

### Lectures API
```
GET /api/lectures/course/{courseId}
  Response: { lectures: [{ id, title, description, video_url, duration, order, created_at }] }

GET /api/lectures/{lectureId}
  Response: { id, title, description, video_url, duration, order, course_id, created_at }

POST /api/lectures
  Body: { course_id: string, title: string, description: string }
  Response: { id, course_id, title, description, order, created_at }

PUT /api/lectures/{lectureId}
  Body: { title?: string, description?: string, video_url?: string, order?: int }
  Response: { success: bool, lecture: LectureObject }

DELETE /api/lectures/{lectureId}
  Response: { success: bool }

POST /api/lectures/{lectureId}/upload-video
  Body: FormData with video file
  Response: { success: bool, video_url: string }

POST /api/lectures/youtube-import
  Body: { course_id: string, youtube_url: string, title?: string }
  Response: { lecture_id, title, video_url, duration }

GET /api/lectures/{lectureId}/materials
  Response: { materials: [{ id, file_url, file_name, mime_type, uploaded_at }] }

GET /api/lectures/course/{courseId}/materials
  Response: { materials: [{ id, lecture_id, lecture_title, file_url, file_name, uploaded_at }] }

POST /api/lectures/materials
  Body: FormData with file + lecture_id, file_name
  Response: { id, lecture_id, file_url, file_name, mime_type, uploaded_at }

DELETE /api/lectures/materials/{materialId}
  Response: { success: bool }
```

### Engagement API
```
POST /api/engagement/submit
  Body: {
    lecture_id: string,
    session_id: string,
    features: {
      gaze_score: float [0-1],
      blink_rate: float,
      head_pose_x: float,
      head_pose_y: float,
      head_pose_z: float,
      action_units: object,
      timestamp: ISO8601,
      face_detected: bool,
      screen_time_ms: int,
      keyboard_activity: int,
      mouse_activity: int,
      video_progress: float [0-1]
    },
    icap_labels?: ['interactive' | 'constructive' | 'active' | 'passive'],
    comments?: string
  }
  Response: {
    engagement_score: float [0-100],
    boredom_probability: float,
    confusion_probability: float,
    frustration_probability: float,
    icap_mode: string,
    shap_explanation: { base_value: float, values: [...], feature_names: [...] },
    suggestions: [string]
  }

GET /api/engagement/history/{lectureId}
  Query: { student_id?: string, skip?: int, limit?: int }
  Response: {
    entries: [{
      id, lecture_id, student_id, session_id, engagement_score, boredom_prob,
      confusion_prob, frustration_prob, icap_mode, features, timestamp
    }]
  }

GET /api/engagement/student-summary/{studentId}
  Response: {
    average_engagement: float,
    total_sessions: int,
    average_boredom: float,
    average_confusion: float,
    average_frustration: float,
    icap_distribution: { interactive: int, constructive: int, active: int, passive: int },
    trend: 'improving' | 'stable' | 'degrading'
  }

GET /api/engagement/heatmap/{lectureId}
  Query: { interval?: int (seconds), student_id?: string }
  Response: {
    heatmap_data: [
      { timestamp: ISO8601, segment: int, average_engagement: float, student_count: int }
    ],
    video_duration: int
  }

GET /api/engagement/heatmap/{lectureId}/me
  Response: (same as heatmap but for current user only)

GET /api/engagement/model-info
  Response: {
    model_name: string,
    version: string,
    accuracy: float,
    deployment_status: string,
    features_expected: [string]
  }

GET /api/engagement/models
  Response: [
    {
      model_id: string (e.g., 'builtin::xgboost' or 'export::lstm_v1'),
      name: string,
      family: string,
      status: 'available' | 'requires_tensorflow',
      source: string,
      recommended: bool,
      notes: string,
      accuracy_hint: string | float
    }
  ]

POST /api/engagement/models/infer
  Body: {
    model_id: string,
    features: [
      { gaze_score, blink_rate, head_pose_x, head_pose_y, head_pose_z, action_units, ... }
    ]
  }
  Response: {
    model_id: string,
    inference_output: object | [float],
    processing_time_ms: int
  }
```

### Quizzes API
```
GET /api/quizzes/lecture/{lectureId}
  Response: { quizzes: [{ id, lecture_id, title, questions: [...], published: bool, auto_grade: bool, created_at }] }

GET /api/quizzes/mine
  Response: {
    quizzes: [
      {
        id, title, description, lecture_id, lecture_title, course_id, course_title,
        attempt_count: int, best_percentage: float, latest_percentage: float,
        published: bool, created_at
      }
    ]
  }

POST /api/quizzes
  Body: {
    lecture_id: string,
    title: string,
    questions: [
      { question_text: string, options: [string], correct_answer_index: int, explanation?: string }
    ],
    published: bool,
    auto_grade: bool,
    time_limit?: int (seconds)
  }
  Response: { id, lecture_id, title, questions, created_at }

PUT /api/quizzes/{quizId}
  Body: { title?: string, questions?: [...], published?: bool, auto_grade?: bool, time_limit?: int }
  Response: { success: bool, quiz: QuizObject }

DELETE /api/quizzes/{quizId}
  Response: { success: bool }

POST /api/quizzes/attempt
  Body: {
    quiz_id: string,
    answers: [{ question_index: int, selected_option_index: int }],
    time_spent_seconds?: int
  }
  Response: {
    attempt_id: string,
    score: float [0-100],
    percentage: float,
    correct_count: int,
    total_questions: int,
    feedback: [{ question_index: int, is_correct: bool, explanation: string }]
  }

GET /api/quizzes/attempts/{quizId}
  Query: { student_id?: string, skip?: int, limit?: int }
  Response: {
    attempts: [
      { attempt_id, quiz_id, student_id, score, percentage, correct_count, timestamp, time_spent_seconds }
    ]
  }

POST /api/quizzes/generate-ai
  Body: { lecture_id: string, lecture_title: string, lecture_transcript?: string, num_questions?: int }
  Response: {
    questions: [
      { question_text: string, options: [string], difficulty: 'easy'|'medium'|'hard', topic: string }
    ],
    suggestions: [string]
  }

POST /api/quizzes/generate-ai-refine
  Body: {
    questions: [...],
    feedback: string (user feedback on quality)
  }
  Response: { refined_questions: [...] }
```

### Feedback API
```
POST /api/feedback
  Body: { lecture_id: string, student_id?: string, clarity: int [1-5], content_quality: int [1-5], comments: string }
  Response: { id, lecture_id, student_id, clarity, content_quality, comments, timestamp }

GET /api/feedback/lecture/{lectureId}
  Response: { feedback: [{ id, student_name, clarity, content_quality, comments, timestamp }] }

GET /api/feedback/course/{courseId}
  Response: { average_clarity: float, average_quality: float, total_responses: int, comments: [...] }
```

### Notifications API
```
GET /api/notifications
  Query: { skip?: int, limit?: int, unread_only?: bool }
  Response: { notifications: [{ id, user_id, title, message, type, read: bool, created_at }] }

GET /api/notifications/unread-count
  Response: { unread_count: int }

PUT /api/notifications/{notificationId}/read
  Response: { success: bool }

PUT /api/notifications/read-all
  Response: { success: bool }

POST /api/notifications/announce
  Body: { title: string, message: string, recipient_ids: [string], type: string }
  Response: { success: bool }
```

### Analytics API
```
GET /api/analytics/course-dashboard/{courseId}
  Response: {
    course_title: string,
    total_students: int,
    average_engagement: float,
    engagement_by_lecture: [{ lecture_id, lecture_title, avg_engagement, student_count }],
    top_performers: [{ student_id, full_name, avg_engagement }],
    icap_distribution: { interactive: int, constructive: int, active: int, passive: int }
  }

GET /api/analytics/lecture-dashboard/{lectureId}
  Response: {
    lecture_title: string,
    total_watches: int,
    average_watch_time: int (seconds),
    average_engagement: float,
    student_engagement: [{ student_id, full_name, engagement_score, watch_time }],
    engagement_timeline: [{ timestamp, avg_engagement, critical_moments: [...] }]
  }

GET /api/analytics/student-dashboard
  Response: {
    total_courses: int,
    average_engagement: float,
    courses: [
      { course_id, course_title, engagement_score, watch_time, quiz_avg_score }
    ],
    engagement_trend: [{ date, engagement_score }],
    achievements: [{ name, description, unlocked_at }]
  }

GET /api/analytics/teaching-score/{courseId}
  Response: {
    overall_score: float [0-100],
    clarity_score: float,
    engagement_impact: float,
    student_satisfaction: float,
    improvement_suggestions: [string]
  }
```

### Admin API
```
GET /api/admin/teachers
  Query: { skip?: int, limit?: int, search?: string }
  Response: { teachers: [{ user_id, full_name, email, total_courses, total_students, rating: float }] }

GET /api/admin/teacher/{teacherId}
  Response: { user_id, full_name, email, courses: [...], total_students, rating, created_at }

GET /api/admin/users
  Query: { skip?: int, limit?: int, role?: string, search?: string }
  Response: {
    users: [
      { user_id, full_name, email, role, is_active: bool, created_at, last_login }
    ],
    total: int
  }

PUT /api/admin/users/{userId}/toggle-active
  Response: { success: bool, user_id, is_active: bool }

DELETE /api/admin/users/{userId}
  Response: { success: bool }

DELETE /api/admin/courses/{courseId}
  Response: { success: bool }

GET /api/admin/system-stats
  Response: {
    total_users: int,
    total_courses: int,
    total_lectures: int,
    active_students: int,
    average_engagement: float,
    system_health: 'healthy' | 'warning' | 'critical'
  }
```

### Users API
```
GET /api/users/activity-history
  Response: { activities: [{ timestamp, action, details }] }

GET /api/users/engagement-history
  Response: { engagement_entries: [{ lecture_id, lecture_title, engagement_score, timestamp }] }

GET /api/users/feedback-history
  Response: { feedback: [{ lecture_id, clarity, quality, comments, timestamp }] }

GET /api/users/export-data
  Response: Downloadable JSON file with user's data export
```

### Gamification API
```
GET /api/gamification/profile
  Response: {
    user_id, full_name, points: int, level: int, rank: string, achievements: [{ name, icon, unlocked_at }],
    streak: int, badges: [...]
  }

POST /api/gamification/award-points
  Query: { activity: string, amount: int }
  Response: { success: bool, new_points: int, new_level: int }

GET /api/gamification/leaderboard
  Query: { period?: 'weekly'|'monthly'|'all_time', limit?: int }
  Response: {
    leaderboard: [
      { rank: int, user_id, full_name, points: int, level: int, avatar_url }
    ],
    user_rank: int,
    user_points: int
  }
```

### Assignments API
```
GET /api/assignments/lecture/{lectureId}
GET /api/assignments/my-assignments
POST /api/assignments
PUT /api/assignments/{assignmentId}
DELETE /api/assignments/{assignmentId}
POST /api/assignments/{assignmentId}/submit
GET /api/assignments/{assignmentId}/submissions
```

---

## 7. PAGES & ROUTES

### Public Routes (no authentication required)
```
/ → Landing.jsx (hero section, feature showcase, call-to-action)
/login → Login.jsx (email/password form)
/register → Register.jsx (signup form with role selection)
```

### Protected Routes (authenticated users)
```
/dashboard → Dashboard.jsx
  Role-based: Shows student dashboard, teacher dashboard, or admin dashboard
  
/my-courses → MyCourses.jsx (student only)
  Enrolled courses + available-to-enroll courses
  Tabs: "Enrolled" | "Browse All Courses"
  Search/filter functionality
  
/my-quizzes → MyQuizzes.jsx (student only)
  All quizzes from all enrolled courses
  Grid layout, search, sort by attempt count
  Click to launch quiz attempt via /lectures/{lectureId}?phase=quiz&quizId={id}
  
/courses/{courseId} → CoursePage.jsx
  Course details, lectures list, enrollment info, instructor info
  
/lectures/{lectureId} → LecturePage.jsx (fullscreen, no sidebar)
  Query params: ?phase=quiz&quizId={id} for direct quiz launch
  Embedded YouTube video player with engagement tracking
  Four phases (tabs): Lecture | Quiz | Feedback | Materials
  MediaPipe-based face tracking + real-time feature capture
  
/my-analytics → MyAnalytics.jsx (student only)
  Personal engagement timeline, quiz performance summary
  Engagement trends, achievements
  
/profile → MyProfile.jsx
  User info edit, avatar upload, password change
  
/leaderboard → Leaderboard.jsx (student only)
  Gamification leaderboard with points, levels, ranks
  
/ai-tutor → AITutor.jsx (student only)
  AI chatbot interface for subject help
  
/messages → Messages.jsx
  Messaging interface (teacher/student communication)
  
/manage-courses → ManageCourses.jsx (teacher only)
  Course CRUD interface, course cards with edit/delete
  
/manage-courses/{courseId} → EditCourse.jsx (teacher only)
  Course details editor
  Lectures management (add/edit/reorder/delete lectures)
  
/manage-courses/{courseId}/quiz-gen/{lectureId} → AIQuizGenerator.jsx (teacher only)
  AI-powered quiz generation from lecture transcript/content
  Generate → Review → Refine → Save to quiz
  
/teaching-dashboard → TeachingDashboard.jsx (teacher only)
  Engagement analytics for all courses/lectures
  Student performance breakdown, ICAP distribution
  
/search → SearchResults.jsx
  Global course/quiz search results
  
/admin/users → UserManagement.jsx (admin only)
  User list with pagination, search, toggle active status, delete
  
/admin/teachers → TeacherOverview.jsx (admin only)
  Teacher overview with rating, course count, student count
```

---

## 8. KEY COMPONENTS & PATTERNS

### Layout Components
**Navbar.jsx**
- Sticky top navigation bar
- Left: Logo + app name
- Center: Search bar (global search)
- Right: User menu (profile, logout), notifications bell, theme toggle
- Responsive: Hamburger menu on mobile

**Sidebar.jsx**
- Left collapsible sidebar
- Role-based navigation links:
  - **Student:** Dashboard, My Courses, My Quizzes, My Analytics, Leaderboard, AI Tutor, Messages
  - **Teacher:** Dashboard, Manage Courses, Teaching Dashboard, Messages
  - **Admin:** Dashboard, User Management, Teacher Overview, System Stats
- Active link highlighting
- Smooth collapse/expand animation

**ThemeToggle.jsx**
- Sun/Moon icon toggle
- Color mode: light (default) | dark
- Calls `useTheme()` to toggle + persist

### UI Components
**card.jsx**
- Wrapper component with consistent padding, border, shadow
- Props: className, children, hover effect option
- Used for course cards, quiz cards, stat cards, etc.

**AnimatedGradient.jsx**
- Background gradient animation (moving colors)
- Used in hero sections

**GlowingBorder.jsx**
- Container with animated glowing border effect
- Used for accent highlights

**PageTransition.jsx**
- Framer Motion fade+slide animation on page enter/exit
- Applied to all major route changes

**spotlight.jsx**
- Spotlight/ball-of-light animation effect
- Used in hero sections

---

## 9. SPECIAL FEATURES & INTEGRATIONS

### MediaPipe Engagement Tracking
**Where Used:** LecturePage.jsx, youtube-player-test.jsx, engagement-live-test.jsx

**What It Does:**
- Opens webcam in browser (user permission required)
- Captures facial landmarks using MediaPipe Face Mesh
- Extracts engagement features every ~1500ms:
  - Gaze direction (gaze_score)
  - Blink rate & eyes aspect ratio
  - Head pose (x, y, z rotation)
  - Facial action units (AU)
  - Behavioral telemetry (keyboard/mouse activity)
- Batches features + sends to backend `/api/engagement/submit`

**Implementation Pattern:**
```javascript
// In component:
import { MediaPipeExtractor } from './path/to/utils';

// On mount or user action:
const extractor = new MediaPipeExtractor();
await extractor.startCamera();  // Opens webcam stream

// Periodically (1500ms):
const features = extractor.extractFeatures();  // Returns {gaze_score, blink_rate, ...}

// On quiz/lecture end:
engagementAPI.submit({ lecture_id, session_id, features });
```

### YouTube Video Embedding
**Where Used:** LecturePage.jsx, youtube-player-test.jsx

**Library:** React Player

**Pattern:**
```javascript
import ReactPlayer from 'react-player';

<ReactPlayer
  url={videoUrl}
  controls
  width="100%"
  height="100%"
  onProgress={(state) => {...}}
  onDuration={(duration) => {...}}
/>
```

### AI Quiz Generator Integration
**Where Used:** AIQuizGenerator.jsx

**Endpoints Used:**
- `POST /api/quizzes/generate-ai` - initial generation
- `POST /api/quizzes/generate-ai-refine` - refinement based on feedback

**Flow:**
1. User selects lecture + num_questions
2. Click "Generate"
3. Show loading state while AI generates
4. Display questions with edit/delete buttons per question
5. User provides feedback ("Too easy", "Clarify", etc.)
6. Click "Refine" for improved questions
7. Save to database

### SHAP Explainability Display
**Where Used:** engagement-live-test.jsx, analytics pages

**What It Shows:**
- Feature importance breakdown for engagement scores
- Which features contributed most to the score
- Visual bar chart or feature contribution list

### Heatmap Visualization
**Where Used:** MyAnalytics.jsx, TeachingDashboard.jsx

**Data:**
- Timeline of engagement scores across lecture duration
- Color intensity = engagement level
- Interactive tooltips showing exact scores

**Library:** Recharts (AreaChart with multiple data series)

---

## 10. DEVELOPMENT SETUP & BUILD

### Installation
```bash
cd smartlms-frontend
npm install
```

### Environment Variables
Create `.env` or `.env.local`:
```
VITE_API_URL=http://localhost:8000        # Backend API URL (dev)
VITE_APP_NAME=SmartLMS
VITE_ANALYTICS_ENABLED=true
```

In production:
```
VITE_API_URL=https://api.smartlms.example.com
```

### Development Server
```bash
npm run dev
# Starts on http://localhost:5173
# API requests to /api/... proxy to http://localhost:8000
```

### Production Build
```bash
npm run build
# Outputs to dist/
# Run preview with: npm run preview
```

### Code Quality
```bash
npm run lint
# Checks ESLint rules
```

### Vite Configuration Details
- **Port:** 5173 (dev server)
- **API Proxy:** /api → http://localhost:8000 (dev only)
- **React Plugin:** Fast Refresh enabled
- **Tailwind:** Integrated via @tailwindcss/vite

---

## 11. CRITICAL IMPLEMENTATION NOTES

### Authentication Flow
1. User submits login form → calls `authAPI.login(email, password)`
2. Backend returns `{ user: UserObject, token: string }`
3. Frontend stores token in localStorage
4. Axios interceptor automatically adds `Authorization: Bearer {token}` to all requests
5. On 401 response → clear localStorage, redirect to /login

### Protected Routes Pattern
```javascript
// In App.jsx
<Route
  path="/my-courses"
  element={
    <ProtectedRoute roles={['student']}>
      <AppLayout>
        <PageTransitionWrapper>
          <MyCourses />
        </PageTransitionWrapper>
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

### Page Transitions
- All pages wrapped in `<Framer Motion>` with fade + 8px slide animation
- Transition config: duration 0.25s, easing [0.4, 0, 0.2, 1]
- Used via `<PageTransitionWrapper>` in routes

### Engagement Feature Capture
When `/api/engagement/submit` is called:
- Features should be an array of feature objects (1+ per submission)
- Each feature object contains: gaze_score, blink_rate, head_pose_x/y/z, action_units, timestamp, face_detected, etc.
- Backend runs engagement scoring + ICAP classification + returns scores + SHAP explanation
- Frontend displays results in analytics/test pages

### Error Handling Pattern
```javascript
try {
  const response = await someAPI.call();
  setData(response.data);
} catch (err) {
  const message = err.response?.data?.detail || 'Failed to load';
  setError(message);
}
```

### Loading States
- Use skeleton loaders or spinner overlays during data fetching
- Show loading spinner: `<div className="animate-spin w-12 h-12 border-4 border-accent-light border-t-accent rounded-full"></div>`

---

## 12. DEPENDENCIES SUMMARY

```json
{
  "dependencies": {
    "@mediapipe/camera_utils": "^0.3.1675466862",
    "@mediapipe/face_mesh": "^0.4.1633559619",
    "@radix-ui/*": "for accessible dialogs, dropdowns, tabs, etc.",
    "@splinetool/react-spline": "^4.1.0",
    "axios": "^1.13.5",
    "framer-motion": "^12.38.0",
    "gsap": "^3.14.2",
    "lucide-react": "^0.575.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-markdown": "^10.1.0",
    "react-player": "^3.4.0",
    "react-router-dom": "^7.13.0",
    "recharts": "^3.7.0"
  }
}
```

---

## 13. TESTING SCENARIOS

Before handing off:

1. **Auth Flow:** Register new user → Login → Logout → Auto-redirect to /login on expired token
2. **Student Navigation:** Click through all student routes (courses, quizzes, analytics, etc.)
3. **Quiz Attempt:** Launch quiz from MyQuizzes or CoursePage → answer questions → submit → see score
4. **Engagement Tracking:** Start lecture video → MediaPipe opens webcam → features captured → submit → see results
5. **Teacher Course Creation:** Create course → Add lectures → Generate AI quizzes → Publish
6. **Admin Operations:** View users → toggle active status → view system stats
7. **Dark Mode:** Toggle theme → persists on page reload
8. **Responsive:** Test on mobile/tablet breakpoints

---

## 14. KNOWN INTEGRATIONS WITH BACKEND

- **No changes needed to backend database schema** (all data persists as-is)
- Frontend ONLY consumes existing API endpoints
- New features (quiz quizzes, model selection) require **no DB changes**, only endpoint usage
- MediaPipe feature extraction happens **client-side only**, then sent to backend
- All ML models already trained/deployed on backend; frontend just calls `/api/engagement/submit` and `/api/engagement/models/infer`

---

## 15. DELIVERY CHECKLIST

Before marking as complete:

- [ ] All routes registered and protected correctly
- [ ] All API bindings in client.js match backend endpoints
- [ ] Pages load without console errors
- [ ] Authentication flow works (login → token storage → protected routes)
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Dark mode toggles correctly
- [ ] All Tailwind styles apply correctly
- [ ] Page transitions animate smoothly
- [ ] MediaPipe webcam integration works (if included in test pages)
- [ ] Build completes: `npm run build`
- [ ] No ESLint warnings/errors: `npm run lint`
- [ ] All imports resolve correctly

---

**END OF PROMPT**

This frontend should integrate seamlessly with the existing backend at `http://localhost:8000` without any modifications to the database or backend logic.
