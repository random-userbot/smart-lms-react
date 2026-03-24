# SmartLMS Stitch Brief: Analytics + Teaching Score

Use this brief in Stitch to redesign two existing pages while preserving current API contracts and behavior.

## Goal
Design two premium, data-dense dashboards that feel intentional and modern:
1. Student Analytics (`/my-analytics`)
2. Teacher Teaching Dashboard (`/teaching-dashboard`)

The visual direction should be clean and high-contrast with warm accent colors (teal/orange/blue), rounded containers, and confident typography. Avoid generic admin-template appearance.

## Existing Data Contracts (Do Not Break)

### Student Analytics
- `analyticsAPI.getStudentDashboard()`
  - engagement: avg_score, total_sessions, recent[]
  - quizzes: avg_score, completed
  - icap_distribution
  - model_analytics
  - tutor_usage
  - recent_downloads
- `analyticsAPI.getStudentEngagementHistory(180)`
  - history[] with timestamp, engagement_score, boredom_score, confusion_score, frustration_score
  - dimension_distribution
  - model_analytics
- `gamificationAPI.getProfile()`
  - points, level, badges, points_this_week
- `engagementAPI.getModelInfo()`
  - model_type, description, features[]
- `coursesAPI.getMyCourses()`
  - list of in-progress courses

### Teaching Dashboard
- `analyticsAPI.getTeachingScore(courseId)`
  - overall_score
  - components + optional multi_dimensional
  - recommendations[]
  - shap_breakdown
  - teacher_activity
- `analyticsAPI.getCourseDashboard(courseId)`
  - student_stats[]
- `lecturesAPI.getByCourse(courseId)`
  - lectures list
- `analyticsAPI.getLectureDashboard(lectureId)`
  - student_stats[]
  - engagement_timelines[]
- `engagementAPI.getLiveWatchers(lectureId, { window_seconds: 120 })`
  - live_count
- `feedbackAPI.getByLecture(lectureId)`
  - sentiment, keywords, ratings, text
- `messagesAPI.getStudentAnalytics(studentId, courseId)` and `messagesAPI.send(...)`
  - used by intervention messaging modal

## IA / Page Structure

### A) Student Analytics Page
1. Hero shell
- Large score tile (Engagement Index)
- Weekly momentum chip (7-day trend)
- Current ICAP chip
- Two CTAs: AI Tutor and Continue Courses

2. KPI grid
- Avg quiz score
- Points earned
- Learning sessions
- Badges unlocked

3. Course continuation rail
- 3 cards max with progress bars and completion counts

4. Chart row
- Engagement timeline (line chart)
- Dimension distribution (stacked bar)

5. Explainability row
- SHAP waterfall
- Top factors + gauge widgets

6. Behavior and recency row
- ICAP distribution component
- Recent sessions table

7. Utility row
- AI tutor usage
- Recent downloads

### B) Teaching Dashboard Page
1. Header shell
- Course selector
- Refresh action
- Open Live Test Lab action

2. KPI strip
- Teaching score
- Enrolled students
- Published lectures

3. Course Overview mode
- Hero score card with score quality label
- Component breakdown cards
- Recommendations panel
- SHAP contributors panel
- Teacher activity summary
- Student table with mini heatmaps
- Lecture list

4. Lecture mode
- Lecture hero with live watchers
- Student timelines table
- Feedback/NLP panel (sentiment split, keywords, examples)

5. Student deep-dive mode
- Focus/quiz/message actions
- Detailed metrics
- Minute-by-minute heatmap
- Intervention messaging modal

## Visual System
- Corner radius: 20-40 px cards, 12-18 px small controls
- Spacing rhythm: 8 px base; sections separated with 32-48 px
- Card treatment: soft border + subtle shadow + elevated hover states
- Palette direction:
  - Primary: deep blue / cyan
  - Positive: green
  - Warning: amber
  - Risk: red
  - Neutrals: warm slate
- Motion:
  - Page fade/slide-in
  - Card hover lift
  - Smooth progress/bar transitions

## Required States
- Loading skeletons
- Empty states with clear call-to-action
- Error states with retry action
- Dense-table mobile fallback (stacked cards under md breakpoint)

## Accessibility + Responsiveness
- WCAG-friendly contrast for text and badges
- Keyboard focus rings for interactive controls
- Mobile-first stacking for grids and analytics cards
- Minimum touch target 40x40

## Implementation Constraints
- Keep React + Tailwind structure
- Preserve API names, payload shapes, and route paths
- Do not remove analytics, SHAP, ICAP, or messaging capabilities
- Keep existing role-based access controls

## Stitch Prompt (Copy/Paste)
Create two cohesive, premium analytics dashboards for a learning platform: Student Analytics and Teacher Teaching Dashboard. Keep all current data sections and interactions, but redesign hierarchy and presentation for clarity and impact. Use a bright, modern palette with deep blue, cyan, amber, and green accents. Add large score hero areas, compact KPI cards, chart-first middle sections, and strong drill-down affordances. Include loading, empty, and error states. Design for desktop and mobile with clean card stacks and responsive tables. Preserve all existing features: engagement trend charts, dimension distribution, ICAP, SHAP explainability, recommendations, course/lecture/student drill-down, live watcher signal, feedback sentiment summaries, and intervention messaging modal.
