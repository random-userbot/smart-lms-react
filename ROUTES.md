# SmartLMS Frontend Page Routes

All routes are served by the React SPA at `http://localhost:5173` (dev) or the production domain root.

---

## Public Routes
*(No authentication required)*

| Path | Page | Description |
|------|------|-------------|
| `/` | `Landing` | Home / marketing landing page |
| `/login` | `Login` | Email + password login form |
| `/register` | `Register` | Sign-up form with role selection (student / teacher / admin) |

---

## Shared Routes
*(Any authenticated role)*

| Path | Page | Description |
|------|------|-------------|
| `/dashboard` | `Dashboard` | Role-based home dashboard |
| `/courses/:courseId` | `CoursePage` | Course detail and lecture list |
| `/lectures/:lectureId` | `LecturePage` | Video player with live engagement tracking |
| `/profile` | `MyProfile` | User profile settings |
| `/messages` | `Messages` | Inbox / messaging between students and teachers |
| `/search` | `SearchResults` | Global search results |

---

## Student Routes
*(Role: `student`)*

| Path | Page | Description |
|------|------|-------------|
| `/my-courses` | `MyCourses` | Enrolled courses and course browser |
| `/my-quizzes` | `MyQuizzes` | All quizzes across enrolled courses |
| `/my-analytics` | `MyAnalytics` | Personal engagement and performance analytics |
| `/leaderboard` | `Leaderboard` | Points leaderboard |
| `/ai-tutor` | `AITutor` | AI-powered tutoring chat |

---

## Teacher Routes
*(Role: `teacher`)*

| Path | Page | Description |
|------|------|-------------|
| `/manage-courses` | `ManageCourses` | Course management list |
| `/manage-courses/:courseId` | `EditCourse` | Edit course details and lectures |
| `/manage-courses/:courseId/quiz-gen/:lectureId` | `AIQuizGenerator` | AI quiz generator for a lecture |
| **`/teaching-dashboard`** | **`TeachingDashboard`** | **Teaching analytics & teaching score** |
| `/teaching-dashboard/live-test` | *(redirect)* | Opens the live engagement test tool |

> **Teacher analytics / teaching score:** `/teaching-dashboard`

---

## Admin Routes
*(Role: `admin`)*

| Path | Page | Description |
|------|------|-------------|
| `/admin/users` | `UserManagement` | List, activate/deactivate, and delete users |
| `/admin/teachers` | `TeacherOverview` | Teacher list with teaching scores |

---

## Notes

- Authenticated routes redirect to `/login` when no valid JWT is present.
- Role-restricted routes redirect to `/dashboard` when the user's role does not match.
- Unknown paths (`*`) redirect to `/`.
- The `/teaching-dashboard` page calls `GET /api/analytics/teaching-score/{courseId}` and `GET /api/analytics/course-dashboard/{courseId}` — see [API_ENDPOINTS.md](./API_ENDPOINTS.md) for the full API reference.
