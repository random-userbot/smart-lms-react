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
            <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin glow-pulse"></div>
        </div>
    );

    return (
        <div className="w-full mx-auto px-6 lg:px-12 py-16 animate-in fade-in relative">
            {/* Subtle background glow effect behind dashboard */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                <div>
                    <h1 className="text-5xl md:text-6xl font-black text-text tracking-tight mb-4 select-none font-['Space_Grotesk']">My Dashboard</h1>
                    <p className="text-text-secondary font-medium text-2xl select-none">Track your learning progress and achievements.</p>
                </div>
                <button className="btn btn-primary btn-lg shadow-accent hover:shadow-[0_6px_20px_var(--color-primary)]" onClick={() => navigate('/my-courses')}>
                    <BookOpen size={20} /> Browse Courses
                </button>
            </div>

            {/* Hero: Engagement Gauge + Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-10 mb-20 relative z-10">
                {/* Engagement Ring - Deep Tech Style */}
                <div className="xl:col-span-2 glass-premium rounded-[3rem] p-12 shadow-accent flex flex-col items-center justify-center relative overflow-hidden group border border-border-light selection:bg-transparent">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <EngagementGauge score={analytics?.engagement?.avg_score || 0} size={220} color="var(--color-primary)" />
                    <div className="mt-8 text-base font-black text-text-muted uppercase tracking-widest font-mono">Global Engagement Score</div>
                    {analytics?.icap_distribution && Object.keys(analytics.icap_distribution).length > 0 && (
                        <div className="mt-10 w-full max-w-sm">
                            <ICAPProgressBar distribution={analytics.icap_distribution} />
                        </div>
                    )}
                </div>

                {/* Stat cards */}
                <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="bg-surface-elevated/70 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-sm border border-border/15 flex flex-col justify-center hover:-translate-y-2 transition-transform duration-300 hover:shadow-accent/20 group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-14 h-14 rounded-2xl bg-primary-light/20 text-primary flex items-center justify-center mb-6 ring-1 ring-primary/20">
                            <BookOpen size={28} />
                        </div>
                        <div className="text-4xl font-black text-text mb-2 tracking-tight font-mono">{courses.length}</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Enrolled Courses</div>
                    </div>
                    
                    <div className="bg-surface-elevated/70 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-sm border border-border/15 flex flex-col justify-center hover:-translate-y-2 transition-transform duration-300 hover:shadow-accent/20 group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-success opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-16 h-16 rounded-2xl bg-accent-light/20 text-accent flex items-center justify-center mb-8 ring-1 ring-accent/20">
                            <BarChart3 size={32} />
                        </div>
                        <div className="text-5xl font-black text-text mb-3 tracking-tight font-mono">{analytics?.quizzes?.avg_score?.toFixed(0) || 0}%</div>
                        <div className="text-base font-black text-text-muted uppercase tracking-widest">Avg Quiz Score</div>
                    </div>
                    
                    <div className="bg-surface-elevated/70 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-sm border border-border/15 flex flex-col justify-center hover:-translate-y-2 transition-transform duration-300 hover:shadow-accent/20 group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-tertiary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mb-8 ring-1 ring-primary/30">
                            <Activity size={32} />
                        </div>
                        <div className="text-5xl font-black text-text mb-3 tracking-tight font-mono">{analytics?.engagement?.total_sessions || 0}</div>
                        <div className="text-base font-black text-text-muted uppercase tracking-widest">Total Sessions</div>
                    </div>
                    
                    {/* Linear Gradient Action Card */}
                    <div className="bg-gradient-to-br from-primary-dark/40 to-primary/20 rounded-[2.5rem] p-10 shadow-accent border border-primary/20 cursor-pointer transition-all duration-300 hover:shadow-[0_12px_40px_rgba(204,151,255,0.4)] hover:-translate-y-2 flex flex-col justify-center glass-premium group"
                        onClick={() => navigate('/my-analytics')}>
                        <div className="w-16 h-16 rounded-2xl bg-primary text-surface-alt flex items-center justify-center mb-8 shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                            <Sparkles size={32} />
                        </div>
                        <div className="text-3xl font-black text-primary-light mb-3 tracking-tight">Full Analytics</div>
                        <div className="text-base font-black text-primary-light/70 uppercase tracking-widest group-hover:text-primary-light transition-colors">SHAP + ICAP insights &rarr;</div>
                    </div>
                </div>
            </div>

            {/* My Courses */}
            <div className="flex items-center gap-6 mb-10 mt-12 relative z-10">
              <h2 className="text-4xl font-black text-text tracking-tight font-['Space_Grotesk']">Continue Learning</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent hidden sm:block"></div>
            </div>
            
            {courses.length === 0 ? (
                <div className="text-center py-20 px-6 glass-premium rounded-[2.5rem] shadow-sm relative z-10">
                    <div className="w-24 h-24 bg-primary-light/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-primary/20">
                        <BookOpen size={48} strokeWidth={2}/>
                    </div>
                    <h3 className="text-3xl font-black text-text mb-4 font-['Space_Grotesk']">Zero Core Modules Found.</h3>
                    <p className="text-text-secondary mb-10 text-lg font-medium">Browse available sequences in the curriculum and enroll to initiate learning.</p>
                    <button className="btn btn-primary btn-lg px-10 shadow-accent" onClick={() => navigate('/my-courses')}>
                        Explore Library
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 relative z-10">
                    {courses.map(course => (
                        <div key={course.course_id} className="course-card bg-surface-elevated/70 backdrop-blur-xl border border-border/15 overflow-hidden group hover:border-primary/40 hover:shadow-accent transition-all duration-300 cursor-pointer rounded-[2rem]" onClick={() => navigate(`/courses/${course.course_id}`)}>
                            <div className="course-card-img h-[180px] bg-gradient-to-br from-surface-alt to-surface-elevated flex items-center justify-center relative border-b border-border/20">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                                ) : (
                                    <Zap size={64} className="text-text-muted/30 group-hover:text-primary/40 transition-colors duration-300" strokeWidth={1} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated to-transparent opacity-80"></div>
                            </div>
                            <div className="p-8 flex flex-col flex-grow relative bg-surface-elevated">
                                <h3 className="text-xl font-black text-text mb-2 line-clamp-2 tracking-tight group-hover:text-primary-light transition-colors font-['Space_Grotesk']">{course.title}</h3>
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-8 block font-mono">{course.teacher_name}</span>

                                <div className="mt-auto pt-4 border-t border-border-light/10">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest font-mono">Progress</span>
                                        <span className="text-lg font-black text-accent">{Math.round(course.progress || 0)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-border/10">
                                        <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out rounded-full" style={{ width: `${course.progress || 0}%` }}></div>
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
        let isMounted = true;
        coursesAPI.list().then(res => {
            if (isMounted) setCourses(res.data || []);
        }).catch(err => {
            console.error("Failed to fetch courses (Dashboard):", err);
        }).finally(() => {
            if (isMounted) setLoading(false);
        });
        return () => { isMounted = false; };
    }, []);

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="w-full mx-auto px-6 lg:px-12 py-16 animate-in fade-in relative">
            <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="absolute top-36 left-4 w-[360px] h-[360px] bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                <div>
                    <h1 className="text-5xl md:text-6xl font-black text-text tracking-tight mb-4 font-['Space_Grotesk']">Teacher Dashboard</h1>
                    <p className="text-text-secondary font-medium text-2xl">Manage your content and view student engagement.</p>
                </div>
                <button className="btn btn-primary btn-lg shadow-accent hover:shadow-[0_10px_28px_rgba(31,122,140,0.34)]" onClick={() => navigate('/manage-courses')}>
                    <PlusCircle size={20} /> Manage Courses
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 relative z-10">
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-5">
                        <BookOpen size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{courses.length}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Courses</div>
                </div>
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-success-light text-success flex items-center justify-center mb-5">
                        <Users size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{courses.reduce((s, c) => s + (c.student_count || 0), 0)}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Total Students</div>
                </div>
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-warning-light text-warning flex items-center justify-center mb-5">
                        <Eye size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{courses.reduce((s, c) => s + (c.lecture_count || 0), 0)}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Total Lectures</div>
                </div>
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                        <TrendingUp size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">--</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Teaching Score</div>
                </div>
            </div>

            <div className="flex items-center gap-6 mb-10">
              <h2 className="text-4xl font-black text-text tracking-tight font-['Space_Grotesk']">Your Courses</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent hidden sm:block"></div>
            </div>

            {courses.length === 0 ? (
                <div className="text-center py-20 px-6 glass-premium border border-border/50 rounded-[2.5rem] shadow-sm">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
                    {courses.map(course => (
                        <div key={course.id} className="course-card bg-surface border-border/60 hover:border-accent/35" onClick={() => navigate(`/manage-courses/${course.id}`)}>
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
            <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in relative">
            <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3 font-['Space_Grotesk']">Admin Dashboard</h1>
                    <p className="text-text-secondary font-medium text-xl">System overview and user management.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 relative z-10">
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50 cursor-pointer group" onClick={() => navigate('/admin/users')}>
                    <div className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                        <Users size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{stats?.total_users || 0}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Total Users</div>
                </div>
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-success-light text-success flex items-center justify-center mb-5">
                        <Users size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{stats?.students || 0}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Students</div>
                </div>
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50 cursor-pointer group" onClick={() => navigate('/admin/teachers')}>
                    <div className="w-14 h-14 rounded-2xl bg-warning-light text-warning flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                        <Users size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{stats?.teachers || 0}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Teachers</div>
                </div>
                <div className="glass-premium rounded-[2rem] p-8 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                        <BookOpen size={28} />
                    </div>
                    <div className="text-4xl font-black text-text tracking-tight font-mono">{stats?.courses || 0}</div>
                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mt-1">Courses</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-premium rounded-[2rem] p-10 border border-border/50 cursor-pointer hover:border-accent/35 hover:shadow-lg transition-all group" onClick={() => navigate('/admin/teachers')}>
                    <h3 className="text-2xl font-black text-text mb-3 tracking-tight group-hover:text-accent transition-colors">Teacher Management</h3>
                    <p className="text-text-secondary font-medium text-lg leading-relaxed">
                        View all teachers, their teaching scores, and course analytics.
                    </p>
                </div>
                <div className="glass-premium rounded-[2rem] p-10 border border-border/50 cursor-pointer hover:border-accent/35 hover:shadow-lg transition-all group" onClick={() => navigate('/admin/users')}>
                    <h3 className="text-2xl font-black text-text mb-3 tracking-tight group-hover:text-accent transition-colors">User Management</h3>
                    <p className="text-text-secondary font-medium text-lg leading-relaxed">
                        Manage users, activate/deactivate accounts, and moderate content.
                    </p>
                </div>
            </div>
        </div>
    );
}
