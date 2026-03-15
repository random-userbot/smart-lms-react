import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, analyticsAPI, adminAPI } from '../api/client';
import {
    BookOpen, Users, BarChart3, TrendingUp,
    PlusCircle, Eye, Award, Activity, Brain, Sparkles, Zap
} from 'lucide-react';
import { EngagementGauge } from '../components/engagement/SHAPVisualization';
import { ICAPBadge, ICAPProgressBar } from '../components/engagement/EngagementHeatmap';

export default function Dashboard() {
    const { user } = useAuth();

    if (user?.role === 'student') return <StudentDashboard />;
    if (user?.role === 'teacher') return <TeacherDashboard />;
    if (user?.role === 'admin') return <AdminDashboard />;
    return null;
}

function StudentDashboard() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            coursesAPI.getMyCourses().catch(() => ({ data: [] })),
            analyticsAPI.getStudentDashboard().catch(() => ({ data: null })),
        ]).then(([coursesRes, analyticsRes]) => {
            setCourses(coursesRes.data || []);
            setAnalytics(analyticsRes.data);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3">My Dashboard</h1>
                    <p className="text-text-secondary font-medium text-xl">Track your learning progress and achievements.</p>
                </div>
                <button className="btn btn-primary btn-lg shadow-accent" onClick={() => navigate('/my-courses')}>
                    <BookOpen size={20} /> Browse Courses
                </button>
            </div>

            {/* Hero: Engagement Gauge + Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 mb-16">
                {/* Engagement Ring */}
                <div className="xl:col-span-2 bg-surface rounded-[2.5rem] p-10 shadow-sm border border-border flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <EngagementGauge score={analytics?.engagement?.avg_score || 0} size={180} />
                    <div className="mt-6 text-sm font-black text-text-muted uppercase tracking-widest">Global Engagement Score</div>
                    {analytics?.icap_distribution && Object.keys(analytics.icap_distribution).length > 0 && (
                        <div className="mt-8 w-full max-w-sm">
                            <ICAPProgressBar distribution={analytics.icap_distribution} />
                        </div>
                    )}
                </div>

                {/* Stat cards */}
                <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="bg-surface rounded-3xl p-8 shadow-sm border border-border flex flex-col justify-center hover:-translate-y-1 transition-transform">
                        <div className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-6">
                            <BookOpen size={28} />
                        </div>
                        <div className="text-4xl font-black text-text mb-2 tracking-tight">{courses.length}</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Enrolled Courses</div>
                    </div>
                    <div className="bg-surface rounded-3xl p-8 shadow-sm border border-border flex flex-col justify-center hover:-translate-y-1 transition-transform">
                        <div className="w-14 h-14 rounded-2xl bg-warning-light text-warning flex items-center justify-center mb-6">
                            <BarChart3 size={28} />
                        </div>
                        <div className="text-4xl font-black text-text mb-2 tracking-tight">{analytics?.quizzes?.avg_score?.toFixed(0) || 0}%</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Avg Quiz Score</div>
                    </div>
                    <div className="bg-surface rounded-3xl p-8 shadow-sm border border-border flex flex-col justify-center hover:-translate-y-1 transition-transform">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6">
                            <Award size={28} />
                        </div>
                        <div className="text-4xl font-black text-text mb-2 tracking-tight">{analytics?.engagement?.total_sessions || 0}</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Total Sessions</div>
                    </div>
                    <div className="bg-gradient-to-br from-accent/10 to-violet-500/10 rounded-3xl p-8 shadow-sm border border-accent/20 hover:border-accent hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-center"
                        onClick={() => navigate('/my-analytics')}>
                        <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center mb-6 shadow-md shadow-accent/40">
                            <Brain size={28} />
                        </div>
                        <div className="text-2xl font-black text-accent mb-2 tracking-tight">Full Analytics</div>
                        <div className="text-sm font-black text-accent/70 uppercase tracking-widest">SHAP + ICAP insights &rarr;</div>
                    </div>
                </div>
            </div>

            {/* My Courses */}
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-3xl font-black text-text tracking-tight">Continue Learning</h2>
              <div className="h-1 flex-1 bg-border rounded-full hidden sm:block"></div>
            </div>
            
            {courses.length === 0 ? (
                <div className="text-center py-20 px-6 bg-surface border border-border rounded-[2.5rem] shadow-sm">
                    <div className="w-24 h-24 bg-accent-light text-accent rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <BookOpen size={48} strokeWidth={2.5}/>
                    </div>
                    <h3 className="text-3xl font-black text-text mb-4">No courses yet</h3>
                    <p className="text-text-secondary mb-10 text-lg font-medium">Browse available courses and enroll to start learning.</p>
                    <button className="btn btn-primary btn-lg px-10" onClick={() => navigate('/my-courses')}>
                        Explore Courses
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {courses.map(course => (
                        <div key={course.course_id} className="course-card" onClick={() => navigate(`/courses/${course.course_id}`)}>
                            <div className="course-card-img">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} />
                                ) : (
                                    <BookOpen size={64} className="text-white/30" strokeWidth={1} />
                                )}
                            </div>
                            <div className="course-card-body">
                                <h3 className="course-card-title">{course.title}</h3>
                                <span className="text-xs font-black text-text-muted uppercase tracking-widest mb-6 block">{course.teacher_name}</span>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-xs font-black text-text-muted uppercase tracking-widest">Progress</span>
                                        <span className="text-base font-black text-accent">{Math.round(course.progress || 0)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-bar-fill" style={{ width: `${course.progress || 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TeacherDashboard() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        coursesAPI.list().then(res => setCourses(res.data || []))
            .catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3">Teacher Dashboard</h1>
                    <p className="text-text-secondary font-medium text-xl">Manage your content and view student engagement.</p>
                </div>
                <button className="btn btn-primary btn-lg shadow-accent" onClick={() => navigate('/manage-courses')}>
                    <PlusCircle size={20} /> Manage Courses
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <div className="stat-card">
                    <div className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-6">
                        <BookOpen size={28} />
                    </div>
                    <div className="stat-value">{courses.length}</div>
                    <div className="stat-label">Courses</div>
                </div>
                <div className="stat-card stat-card-success">
                    <div className="w-14 h-14 rounded-2xl bg-success-light text-success flex items-center justify-center mb-6">
                        <Users size={28} />
                    </div>
                    <div className="stat-value">{courses.reduce((s, c) => s + (c.student_count || 0), 0)}</div>
                    <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card stat-card-warning">
                    <div className="w-14 h-14 rounded-2xl bg-warning-light text-warning flex items-center justify-center mb-6">
                        <Eye size={28} />
                    </div>
                    <div className="stat-value">{courses.reduce((s, c) => s + (c.lecture_count || 0), 0)}</div>
                    <div className="stat-label">Total Lectures</div>
                </div>
                <div className="stat-card stat-card-accent">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6">
                        <TrendingUp size={28} />
                    </div>
                    <div className="stat-value">--</div>
                    <div className="stat-label">Teaching Score</div>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-3xl font-black text-text tracking-tight">Your Courses</h2>
              <div className="h-1 flex-1 bg-border rounded-full hidden sm:block"></div>
            </div>

            {courses.length === 0 ? (
                <div className="text-center py-20 px-6 bg-surface border border-border rounded-[2.5rem] shadow-sm">
                    <div className="w-24 h-24 bg-accent-light text-accent rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <BookOpen size={48} strokeWidth={2.5}/>
                    </div>
                    <h3 className="text-3xl font-black text-text mb-4">No courses yet</h3>
                    <p className="text-text-secondary mb-10 text-lg font-medium">Create your first course to get started.</p>
                    <button className="btn btn-primary btn-lg px-10" onClick={() => navigate('/manage-courses')}>
                        Create Course
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {courses.map(course => (
                        <div key={course.id} className="course-card" onClick={() => navigate(`/manage-courses/${course.id}`)}>
                            <div className="course-card-img">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} />
                                ) : (
                                    <BookOpen size={64} className="text-white/30" strokeWidth={1} />
                                )}
                            </div>
                            <div className="course-card-body">
                                <h3 className="course-card-title">{course.title}</h3>
                                <div className="flex items-center gap-5 text-sm font-black uppercase tracking-widest text-text-muted mb-6 mt-auto">
                                    <span className="flex items-center gap-2"><Eye size={16} className="text-accent" /> {course.lecture_count || 0}</span>
                                    <span className="flex items-center gap-2"><Users size={16} className="text-success" /> {course.student_count || 0}</span>
                                </div>
                                <span className={`inline-block px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${course.is_published ? 'bg-success-light text-success border border-success/30' : 'bg-warning-light text-warning border border-warning/30'} self-start`}>
                                    {course.is_published ? 'Published' : 'Draft'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminAPI.getSystemStats()
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3">Admin Dashboard</h1>
                    <p className="text-text-secondary font-medium text-xl">System overview and user management.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <div className="stat-card cursor-pointer group" onClick={() => navigate('/admin/users')}>
                    <div className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-6 group-hover:bg-accent group-hover:text-white transition-colors">
                        <Users size={28} />
                    </div>
                    <div className="stat-value">{stats?.total_users || 0}</div>
                    <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card stat-card-success">
                    <div className="w-14 h-14 rounded-2xl bg-success-light text-success flex items-center justify-center mb-6">
                        <Users size={28} />
                    </div>
                    <div className="stat-value">{stats?.students || 0}</div>
                    <div className="stat-label">Students</div>
                </div>
                <div className="stat-card stat-card-warning cursor-pointer group" onClick={() => navigate('/admin/teachers')}>
                    <div className="w-14 h-14 rounded-2xl bg-warning-light text-warning flex items-center justify-center mb-6 group-hover:bg-warning group-hover:text-white transition-colors">
                        <Users size={28} />
                    </div>
                    <div className="stat-value">{stats?.teachers || 0}</div>
                    <div className="stat-label">Teachers</div>
                </div>
                <div className="stat-card stat-card-accent">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6">
                        <BookOpen size={28} />
                    </div>
                    <div className="stat-value">{stats?.courses || 0}</div>
                    <div className="stat-label">Courses</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-surface rounded-3xl p-10 shadow-sm border border-border cursor-pointer hover:border-accent hover:shadow-xl transition-all group" onClick={() => navigate('/admin/teachers')}>
                    <h3 className="text-2xl font-black text-text mb-3 tracking-tight group-hover:text-accent transition-colors">Teacher Management</h3>
                    <p className="text-text-secondary font-medium text-lg leading-relaxed">
                        View all teachers, their teaching scores, and course analytics.
                    </p>
                </div>
                <div className="bg-surface rounded-3xl p-10 shadow-sm border border-border cursor-pointer hover:border-accent hover:shadow-xl transition-all group" onClick={() => navigate('/admin/users')}>
                    <h3 className="text-2xl font-black text-text mb-3 tracking-tight group-hover:text-accent transition-colors">User Management</h3>
                    <p className="text-text-secondary font-medium text-lg leading-relaxed">
                        Manage users, activate/deactivate accounts, and moderate content.
                    </p>
                </div>
            </div>
        </div>
    );
}
