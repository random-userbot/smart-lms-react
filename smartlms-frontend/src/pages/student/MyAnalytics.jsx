import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, gamificationAPI, engagementAPI, coursesAPI } from '../../api/client';
import { BarChart3, Activity, Brain, Award, Sparkles, Bot, Download, Info, TrendingUp, Zap, Target, BookOpen, PlayCircle, ArrowUpRight, CalendarRange } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { SHAPWaterfall, TopFactors, EngagementGauge } from '../../components/engagement/SHAPVisualization';
import { ICAPBadge, ICAPProgressBar } from '../../components/engagement/EngagementHeatmap';
import { AnalyticsPageSkeleton } from '../../components/ui/PageSkeletons';

export default function MyAnalytics() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [gamification, setGamification] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [courses, setCourses] = useState([]);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            analyticsAPI.getStudentDashboard().catch(() => ({ data: null })),
            analyticsAPI.getStudentEngagementHistory(180).catch(() => ({ data: null })),
            gamificationAPI.getProfile().catch(() => ({ data: null })),
            engagementAPI.getModelInfo().catch(() => ({ data: null })),
            coursesAPI.getMyCourses().catch(() => ({ data: [] })),
        ]).then(([analyticsRes, historyRes, gamRes, modelRes, coursesRes]) => {
            setData(analyticsRes.data);
            setHistory(historyRes.data);
            setGamification(gamRes.data);
            setModelInfo(modelRes.data);
            setCourses(coursesRes.data || []);
        }).finally(() => setLoading(false));
    }, []);

    const engagementHistory = history?.history || data?.engagement?.history || [];
    const modelAnalytics = data?.model_analytics || history?.model_analytics || {};
    const chartRows = engagementHistory.map((row) => ({
        time: row?.timestamp ? new Date(row.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-',
        engagement: Number(row?.engagement_score || 0),
        boredom: Number(row?.boredom_score || 0),
        confusion: Number(row?.confusion_score || 0),
        frustration: Number(row?.frustration_score || 0),
    }));

    const dimensionDistribution = history?.dimension_distribution || data?.engagement?.dimension_distribution || {};
    const distributionRows = Object.entries(dimensionDistribution).map(([dimension, levels]) => ({
        dimension,
        veryLow: Number(levels?.['Very Low'] || 0),
        low: Number(levels?.Low || 0),
        moderate: Number(levels?.Moderate || 0),
        high: Number(levels?.High || 0),
        veryHigh: Number(levels?.['Very High'] || 0),
    }));

    const getCourseProgress = (course) => {
        const progressRaw = Number(course?.progress || 0);
        const totalLectures = Number(course?.total_lectures || 0);

        if (totalLectures > 0 && progressRaw <= totalLectures) {
            return Math.round((progressRaw / totalLectures) * 100);
        }

        return Math.max(0, Math.min(100, Math.round(progressRaw)));
    };

    const getCompletedLectures = (course) => {
        if (course?.completed_lectures != null) return Number(course.completed_lectures);
        const progressRaw = Number(course?.progress || 0);
        const totalLectures = Number(course?.total_lectures || 0);
        if (totalLectures > 0 && progressRaw <= totalLectures) return Math.round(progressRaw);
        return 0;
    };

    const recentTrendWindow = chartRows.slice(-7);
    const trendDelta = recentTrendWindow.length >= 2
        ? recentTrendWindow[recentTrendWindow.length - 1].engagement - recentTrendWindow[0].engagement
        : 0;
    const trendLabel = trendDelta > 4 ? 'Rising' : trendDelta < -4 ? 'Falling' : 'Stable';
    const trendTone = trendDelta > 4 ? 'text-success' : trendDelta < -4 ? 'text-danger' : 'text-warning';

    if (loading) return <AnalyticsPageSkeleton />;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-surface-alt max-w-7xl mx-auto px-6 py-10 space-y-10">
            {/* Header */}
            <div className="bg-surface rounded-3xl border border-border shadow-sm p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-text leading-tight">My Analytics</h1>
                        <p className="text-lg text-text-secondary font-medium mt-2">Track your learning progress, engagement quality, and weekly momentum.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => navigate('/ai-tutor')} className="btn btn-primary px-5 py-3 shadow-sm">
                            <span className="inline-flex items-center gap-2"><Bot size={16} /> Ask AI Tutor <ArrowUpRight size={14} /></span>
                        </button>
                        <button onClick={() => navigate('/my-courses')} className="btn btn-secondary px-5 py-3 border-2 shadow-sm">
                            <span className="inline-flex items-center gap-2"><BookOpen size={16} /> Continue Courses</span>
                        </button>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-alt rounded-2xl border border-border p-4">
                        <div className="text-[11px] uppercase tracking-widest font-black text-text-muted mb-1">7-Day Focus Trend</div>
                        <div className={`text-2xl font-black ${trendTone}`}>{trendLabel}</div>
                        <div className="text-xs font-semibold text-text-secondary mt-1">{trendDelta >= 0 ? '+' : ''}{trendDelta.toFixed(1)} pts vs week start</div>
                    </div>
                    <div className="bg-surface-alt rounded-2xl border border-border p-4">
                        <div className="text-[11px] uppercase tracking-widest font-black text-text-muted mb-1">Data Window</div>
                        <div className="text-2xl font-black text-text inline-flex items-center gap-2"><CalendarRange size={18} /> 180 Days</div>
                        <div className="text-xs font-semibold text-text-secondary mt-1">Recent engagement, quiz, and activity events</div>
                    </div>
                    <div className="bg-surface-alt rounded-2xl border border-border p-4">
                        <div className="text-[11px] uppercase tracking-widest font-black text-text-muted mb-1">Current ICAP State</div>
                        <div className="mt-1"><ICAPBadge level={data?.engagement?.last_icap || 'passive'} size="md" /></div>
                        <div className="text-xs font-semibold text-text-secondary mt-2">Latest behavior cluster from your sessions</div>
                    </div>
                </div>
            </div>

            {/* Hero Dashboard: Engagement Index + Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Engagement Index Circle - Redesigned for prominence */}
                <div className="lg:col-span-2 bg-linear-to-br from-primary to-accent rounded-3xl shadow-lg border border-primary/40 p-8 flex flex-col items-center justify-center text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none"><Activity size={200} /></div>
                    <div className="relative z-10">
                        <div className="text-6xl font-black mb-2">{(data?.engagement?.avg_score || 0).toFixed(0)}%</div>
                        <div className="text-sm font-bold uppercase tracking-widest opacity-90 mb-4">Engagement Index</div>
                        {data?.engagement?.avg_score >= 80 ? (
                            <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/20 border border-white/30 px-4 py-2 rounded-full">
                                <Zap size={14} /> Elite Status
                            </div>
                        ) : data?.engagement?.avg_score >= 60 ? (
                            <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/20 border border-white/30 px-4 py-2 rounded-full">
                                <Target size={14} /> Advanced Learner
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/20 border border-white/30 px-4 py-2 rounded-full">
                                <TrendingUp size={14} /> Building Momentum
                            </div>
                        )}
                        <p className="text-[10px] opacity-70 mt-4 max-w-xs">You're in the top 8% of learners this month.<br/>Keep up the momentum!</p>
                    </div>
                </div>

                {/* Stat Grid - 2x2 layout for better visibility */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col hover:border-success/30 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><BarChart3 size={24} /></div>
                            <span className="text-2xl font-black text-emerald-600">{data?.quizzes?.avg_score?.toFixed(0) || 0}%</span>
                        </div>
                        <div className="text-sm font-bold text-text-secondary">Avg Quiz Score</div>
                        <div className="text-xs text-text-muted mt-1">{data?.quizzes?.completed || 0} quizzes completed</div>
                    </div>

                    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col hover:border-warning/30 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Award size={24} /></div>
                            <span className="text-2xl font-black text-amber-600">{gamification?.points || 0}</span>
                        </div>
                        <div className="text-sm font-bold text-text-secondary">Points Earned</div>
                        <div className="text-xs text-text-muted mt-1">Level {gamification?.level || 1} • +{(gamification?.points_this_week || 0)} this week</div>
                    </div>

                    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col hover:border-info/30 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Brain size={24} /></div>
                            <span className="text-2xl font-black text-blue-600">{data?.engagement?.total_sessions || 0}</span>
                        </div>
                        <div className="text-sm font-bold text-text-secondary">Learning Sessions</div>
                        <div className="text-xs text-text-muted mt-1">Avg {(data?.engagement?.avg_session_duration || 0).toFixed(0)}m per session</div>
                    </div>

                    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col hover:border-accent/30 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Sparkles size={24} /></div>
                            <span className="text-2xl font-black text-purple-600">{gamification?.badges?.length || 0}</span>
                        </div>
                        <div className="text-sm font-bold text-text-secondary">Badges Unlocked</div>
                        <div className="text-xs text-text-muted mt-1">{Object.keys(gamification?.available_badges || {}).length} more available</div>
                    </div>
                </div>
            </div>

            {/* Model Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
                    <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Active Scoring Mode</div>
                    <div className="text-lg font-black text-text wrap-break-word">
                        {Object.entries(modelAnalytics?.model_type_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                    </div>
                    <div className="text-xs text-text-muted mt-2">Most frequent scoring model across your stored sessions</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
                    <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Average Model Confidence</div>
                    <div className="text-lg font-black text-text">
                        {Math.round(Number(modelAnalytics?.avg_confidence || 0) * 100)}%
                    </div>
                    <div className="text-xs text-text-muted mt-2">Derived from persisted engagement logs in database</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
                    <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Hybrid Sessions</div>
                    <div className="text-lg font-black text-text">
                        {Number(modelAnalytics?.hybrid_sessions || 0)}
                    </div>
                    <div className="text-xs text-text-muted mt-2">
                        Avg export models used: {Number(modelAnalytics?.avg_ensemble_models || 0).toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Continue Learning - Prominent Course Progress Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-text">Continue Learning</h2>
                    <button onClick={() => navigate('/my-courses')} className="text-sm font-bold text-accent hover:text-accent-hover">View All Courses →</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.slice(0, 3).map((course, i) => (
                        (() => {
                            const progressPct = getCourseProgress(course);
                            const completedLectures = getCompletedLectures(course);
                            const courseId = course?.course_id || course?.id;
                            return (
                        <div key={i} className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-lg hover:border-accent/40 transition-all cursor-pointer group"
                            onClick={() => courseId && navigate(`/courses/${courseId}`)}>
                            <div className="h-32 bg-linear-to-br from-primary to-accent relative overflow-hidden">
                                <div className="absolute inset-0 opacity-20"><BookOpen size={120} className="absolute -top-4 -right-4" /></div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-text mb-2 group-hover:text-accent transition-colors">{course.title}</h3>
                                <p className="text-xs text-text-muted font-medium mb-4">{course.instructor?.name || 'Instructor'}</p>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold text-text-secondary">Progress</span>
                                            <span className="text-sm font-black text-accent">{progressPct}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                                            <div className="h-full bg-linear-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${progressPct}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-text-muted">{completedLectures} / {course.total_lectures || 0} lectures</span>
                                        <span className="px-2 py-1 bg-success-light text-success font-bold rounded-md">In Progress</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                            );
                        })()
                    ))}
                </div>
                {courses.length === 0 && (
                    <div className="text-center p-12 bg-surface rounded-2xl border border-dashed border-border">
                        <PlayCircle className="mx-auto text-text-muted mb-4" size={48} />
                        <p className="text-text-secondary font-medium">No active courses. Browse courses to get started!</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ICAP distribution - enhanced */}
                <div className="bg-surface rounded-3xl shadow-sm border border-border p-10">
                    <h3 className="text-2xl font-bold text-text mb-4">ICAP Distribution</h3>
                    <p className="text-sm text-text-muted font-medium mb-8">Based on the ICAP framework (Chi & Wylie, 2014) — Interactive &gt; Constructive &gt; Active &gt; Passive</p>
                    {Object.entries(data?.icap_distribution || {}).length === 0 ? (
                        <div className="text-text-secondary font-medium p-8 bg-surface-alt rounded-2xl text-center">No ICAP data yet. Watch lectures to generate data.</div>
                    ) : (
                        <div className="space-y-6">
                            <ICAPProgressBar distribution={data?.icap_distribution} />
                            
                            <div className="mt-6 space-y-4">
                                {[
                                    { level: 'interactive', desc: 'Quiz (>70%), AI Tutor, Discussion, Messaging', emoji: '🤝' },
                                    { level: 'constructive', desc: 'Note-taking, Typing, Feedback, Annotations', emoji: '✏️' },
                                    { level: 'active', desc: 'Focused watching, Video controls, Click interaction', emoji: '👁️' },
                                    { level: 'passive', desc: 'Watching only, No interaction, Tab switches', emoji: '📺' },
                                ].map(({ level, desc, emoji }) => {
                                    const count = data?.icap_distribution?.[level] || 0;
                                    const total = Object.values(data?.icap_distribution || {}).reduce((a, b) => a + b, 1);
                                    const pct = (count / total * 100).toFixed(0);
                                    return (
                                        <div key={level} className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-border">
                                            <div className="flex items-center gap-3">
                                                <ICAPBadge level={level} size="sm" />
                                                <div className="text-[10px] text-text-muted font-medium hidden sm:block max-w-40 truncate" title={desc}>
                                                    {emoji} {desc}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-text-secondary">{count} sessions</span>
                                                <span className="text-lg font-black text-text">{pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Badges */}
                <div className="bg-surface rounded-3xl shadow-sm border border-border p-10 flex flex-col">
                    <h3 className="text-2xl font-bold text-text mb-8">Achievements & Badges</h3>
                    <div className="flex-1">
                        <h4 className="text-sm font-extrabold text-text-muted uppercase tracking-widest mb-4">Earned</h4>
                        {(gamification?.badges || []).length === 0 ? (
                            <div className="text-text-secondary font-medium mb-8 p-6 bg-surface-alt rounded-2xl text-center">No badges earned yet. Keep learning!</div>
                        ) : (
                            <div className="flex flex-wrap gap-3 mb-8">
                                {gamification.badges.map((badge, i) => (
                                    <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold">
                                        🏆 {badge.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <h4 className="text-sm font-extrabold text-text-muted uppercase tracking-widest mb-4 mt-auto">Available to Unlock</h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(gamification?.available_badges || {}).map((b, i) => (
                                <span key={i} className="px-3 py-1.5 bg-surface-alt border border-border text-text-muted rounded-lg text-xs font-bold">
                                    🔒 {b.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="bg-linear-to-br from-accent-light to-surface rounded-3xl shadow-sm border border-border p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Sparkles size={200} /></div>
                <h3 className="text-2xl font-bold text-text mb-6 flex items-center gap-3 relative z-10">
                    <Sparkles className="text-accent" size={28} /> AI Learning Insights
                </h3>
                {(data?.insights || []).length === 0 ? (
                    <div className="text-text-secondary font-medium relative z-10 p-6 bg-surface/70 backdrop-blur-sm rounded-2xl border border-border">No insights available yet. Engage with more lectures!</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {data.insights.map((insight, i) => (
                            <div key={i} className="bg-surface/80 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm text-text-secondary font-medium leading-relaxed flex gap-4">
                                <span className="text-accent mt-1 shrink-0"><Sparkles size={18} /></span>
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Prototype parity: engagement trend + distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-surface rounded-3xl shadow-sm border border-border p-8">
                    <h3 className="text-2xl font-bold text-text mb-2">Engagement Trend Over Time</h3>
                    <p className="text-sm text-text-muted font-medium mb-6">Session-by-session engagement with boredom, confusion, and frustration overlays.</p>
                    {chartRows.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-surface-alt border border-border text-text-secondary text-center font-medium">No trend data available yet.</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.25)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="engagement" stroke="#2563eb" strokeWidth={3} dot={false} name="Engagement" />
                                        <Line type="monotone" dataKey="boredom" stroke="#dc2626" strokeWidth={2} dot={false} name="Boredom" />
                                        <Line type="monotone" dataKey="confusion" stroke="#f59e0b" strokeWidth={2} dot={false} name="Confusion" />
                                        <Line type="monotone" dataKey="frustration" stroke="#7c3aed" strokeWidth={2} dot={false} name="Frustration" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-surface-alt border border-border">
                                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Average</div>
                                    <div className="text-2xl font-black text-text">{(history?.summary?.average_engagement ?? data?.engagement?.avg_score ?? 0).toFixed(0)}%</div>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-alt border border-border">
                                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Peak</div>
                                    <div className="text-2xl font-black text-text">{(history?.summary?.peak_engagement ?? data?.engagement?.peak_score ?? 0).toFixed(0)}%</div>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-alt border border-border">
                                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Lowest</div>
                                    <div className="text-2xl font-black text-text">{(history?.summary?.lowest_engagement ?? data?.engagement?.lowest_score ?? 0).toFixed(0)}%</div>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-alt border border-border">
                                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Std Dev</div>
                                    <div className="text-2xl font-black text-text">{(history?.summary?.std_deviation ?? data?.engagement?.std_deviation ?? 0).toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-surface rounded-3xl shadow-sm border border-border p-8">
                    <h3 className="text-2xl font-bold text-text mb-2">Dimension Distribution</h3>
                    <p className="text-sm text-text-muted font-medium mb-6">How often each engagement dimension lands in Very Low to Very High bands.</p>
                    {distributionRows.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-surface-alt border border-border text-text-secondary text-center font-medium">No dimension distribution available yet.</div>
                    ) : (
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionRows} margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.25)" />
                                    <XAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="veryLow" stackId="a" fill="#16a34a" name="Very Low" />
                                    <Bar dataKey="low" stackId="a" fill="#65a30d" name="Low" />
                                    <Bar dataKey="moderate" stackId="a" fill="#f59e0b" name="Moderate" />
                                    <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                                    <Bar dataKey="veryHigh" stackId="a" fill="#dc2626" name="Very High" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Model Transparency Card */}
            {modelInfo && (
                <div className="bg-surface rounded-3xl shadow-sm border border-border p-10">
                    <h3 className="text-2xl font-bold text-text mb-6 flex items-center gap-3">
                        <div className="p-3 bg-surface-alt text-text-secondary rounded-xl"><Info size={24} /></div>
                        How Your Engagement Is Measured
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-surface-alt rounded-2xl border border-border">
                            <div className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Model Type</div>
                            <div className="text-lg font-black text-text">{
                                modelInfo.model_type === 'v2_hybrid' ? 'XGBoost v2 + SHAP (DAiSEE)' :
                                modelInfo.model_type === 'xgboost_shap' ? 'XGBoost + SHAP' :
                                modelInfo.model_type === 'v2_binary' ? 'Binary XGBoost v2' :
                                'Enhanced Rule-Based'
                            }</div>
                            <div className="text-xs text-text-muted mt-1 font-medium">{modelInfo.description || 'Explainable ML engagement model'}</div>
                        </div>
                        <div className="p-6 bg-surface-alt rounded-2xl border border-border">
                            <div className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Framework</div>
                            <div className="text-lg font-black text-text">ICAP</div>
                            <div className="text-xs text-text-muted mt-1 font-medium">Chi & Wylie (2014) — Interactive, Constructive, Active, Passive</div>
                        </div>
                        <div className="p-6 bg-surface-alt rounded-2xl border border-border">
                            <div className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Features Analyzed</div>
                            <div className="text-lg font-black text-text">{modelInfo.features?.length || 24}</div>
                            <div className="text-xs text-text-muted mt-1 font-medium">Gaze, head pose, AUs, behavioral signals</div>
                        </div>
                    </div>
                    {modelInfo.features?.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {modelInfo.features.slice(0, 12).map((f, i) => (
                                <span key={i} className="px-3 py-1 bg-accent-light text-accent border border-accent/20 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                    {f.replace(/_/g, ' ')}
                                </span>
                            ))}
                            {modelInfo.features.length > 12 && (
                                <span className="px-3 py-1 bg-surface-alt text-text-muted border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                    +{modelInfo.features.length - 12} more
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Sessions */}
            <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
                <div className="px-10 py-8 border-b border-border bg-surface-alt/70">
                    <h3 className="text-2xl font-bold text-text">Recent Sessions</h3>
                </div>
                {(data?.engagement?.recent || []).length === 0 ? (
                    <div className="p-10 text-center text-text-secondary font-medium">No sessions yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-surface text-text-muted font-extrabold text-xs uppercase tracking-widest border-b border-border">
                                <tr>
                                    <th className="px-10 py-5">Date</th>
                                    <th className="px-10 py-5">Engagement Score</th>
                                    <th className="px-10 py-5">ICAP Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.engagement.recent.map((s, i) => (
                                    <tr key={i} className="hover:bg-surface-alt transition-colors">
                                        <td className="px-10 py-6 text-text-secondary font-medium">{new Date(s.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 h-2 bg-surface-elevated rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${
                                                        (s.score || 0) >= 70 ? 'bg-success' : (s.score || 0) >= 40 ? 'bg-warning' : 'bg-danger'
                                                    }`} style={{ width: `${s.score || 0}%` }} />
                                                </div>
                                                <span className="font-black text-lg text-text">
                                                    {s.score?.toFixed(0) || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <ICAPBadge level={s.icap || 'passive'} size="sm" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* AI Tutor & Downloads */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-surface rounded-3xl shadow-sm border border-border p-10 flex flex-col">
                    <h3 className="text-2xl font-bold text-text mb-8 flex items-center gap-3">
                        <div className="p-3 bg-accent-light text-accent rounded-xl"><Bot size={24} /></div> AI Tutor Usage
                    </h3>
                    <div className="flex-1 bg-surface-alt rounded-2xl border border-border p-10 flex flex-col items-center justify-center text-center">
                        <div className="text-7xl font-black text-accent mb-4">{data?.tutor_usage?.messages_sent || 0}</div>
                        <div className="text-lg font-bold text-text-muted uppercase tracking-widest">Total Messages Sent</div>
                    </div>
                </div>

                <div className="bg-surface rounded-3xl shadow-sm border border-border p-10">
                    <h3 className="text-2xl font-bold text-text mb-8 flex items-center gap-3">
                        <div className="p-3 bg-success-light text-success rounded-xl"><Download size={24} /></div> Recent Downloads
                    </h3>
                    {(data?.recent_downloads || []).length === 0 ? (
                        <div className="p-10 bg-surface-alt rounded-2xl text-center text-text-secondary font-medium">No resources downloaded yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {data.recent_downloads.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-5 bg-surface border border-border shadow-sm rounded-2xl hover:border-accent/40 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 flex items-center justify-center bg-surface-alt text-text-muted rounded-xl font-bold text-xs uppercase">{d.file_type}</div>
                                        <div className="font-bold text-text text-sm md:text-base">{d.file_name}</div>
                                    </div>
                                    <div className="text-text-muted font-semibold text-sm">
                                        {new Date(d.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
