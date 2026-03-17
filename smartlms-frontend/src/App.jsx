import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActivityProvider } from './context/ActivityTracker';
import { ThemeProvider } from './context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudentCourses from './pages/student/MyCourses';
import CoursePage from './pages/student/CoursePage';
import LecturePage from './pages/student/LecturePage';
import StudentAnalytics from './pages/student/MyAnalytics';
import StudentProfile from './pages/student/MyProfile';
import Leaderboard from './pages/student/Leaderboard';
import AITutor from './pages/student/AITutor';
import TeacherCourses from './pages/teacher/ManageCourses';
import EditCourse from './pages/teacher/EditCourse';
import TeachingDashboard from './pages/teacher/TeachingDashboard';
import AdminUsers from './pages/admin/UserManagement';
import AdminTeachers from './pages/admin/TeacherOverview';
import Messages from './pages/Messages';
import './index.css';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppLayout({ children, showSidebar = true }) {
  const { user } = useAuth();
  const hasSidebar = user && showSidebar;
  return (
    <div className="min-h-screen bg-surface-alt flex flex-col">
      <Navbar />
      <div className={hasSidebar ? 'flex flex-1 overflow-hidden' : 'flex-1 flex flex-col'}>
        {hasSidebar && <Sidebar />}
        <main className={hasSidebar ? 'flex-1 min-w-0 overflow-y-auto w-full' : 'flex-1 w-full'}>
          {children}
        </main>
      </div>
    </div>
  );
}

function PageTransitionWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <PageTransitionWrapper><Navbar /><Landing /></PageTransitionWrapper>} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <PageTransitionWrapper><Login /></PageTransitionWrapper>} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <PageTransitionWrapper><Register /></PageTransitionWrapper>} />

        {/* Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout><PageTransitionWrapper><Dashboard /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />

        {/* Student */}
        <Route path="/my-courses" element={
          <ProtectedRoute roles={['student']}>
            <AppLayout><PageTransitionWrapper><StudentCourses /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId" element={
          <ProtectedRoute>
            <AppLayout><PageTransitionWrapper><CoursePage /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/lectures/:lectureId" element={
          <ProtectedRoute>
            <AppLayout showSidebar={false}><PageTransitionWrapper><LecturePage /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-analytics" element={
          <ProtectedRoute roles={['student']}>
            <AppLayout><PageTransitionWrapper><StudentAnalytics /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout><PageTransitionWrapper><StudentProfile /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute roles={['student']}>
            <AppLayout><PageTransitionWrapper><Leaderboard /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/ai-tutor" element={
          <ProtectedRoute roles={['student']}>
            <AppLayout><PageTransitionWrapper><AITutor /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <AppLayout><PageTransitionWrapper><Messages /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />

        {/* Teacher */}
        <Route path="/manage-courses" element={
          <ProtectedRoute roles={['teacher']}>
            <AppLayout><PageTransitionWrapper><TeacherCourses /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-courses/:courseId" element={
          <ProtectedRoute roles={['teacher']}>
            <AppLayout><PageTransitionWrapper><EditCourse /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/teaching-dashboard" element={
          <ProtectedRoute roles={['teacher']}>
            <AppLayout><PageTransitionWrapper><TeachingDashboard /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout><PageTransitionWrapper><AdminUsers /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/teachers" element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout><PageTransitionWrapper><AdminTeachers /></PageTransitionWrapper></AppLayout>
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ActivityProvider>
            <AppRoutes />
          </ActivityProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
