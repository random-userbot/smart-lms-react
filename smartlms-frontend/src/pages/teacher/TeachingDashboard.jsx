import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { coursesAPI, analyticsAPI, lecturesAPI, messagesAPI } from '../../api/client';
import { TrendingUp, BarChart3, Activity, Users, BookOpen, Target, Download, ArrowLeft, Play, Clock, Sparkles, Brain, MessageSquare, Send, AlertTriangle, Award } from 'lucide-react';

// Simple HTML/CSS block heatmap component
function EngagementHeatmap({ timeline }) {
    if (!timeline || timeline.length === 0) return <div className="text-text-muted text-sm font-bold py-3">No timeline data available.</div>;

    return (
        <div className="flex w-full h-12 rounded-xl overflow-hidden border border-border shadow-inner group cursor-crosshair">
            {timeline.map((point, i) => {
                const score = point.engagement || 0;
                let color = 'bg-danger text-danger border-danger';
                if (score >= 80) color = 'bg-success text-success border-success';
                else if (score >= 50) color = 'bg-warning text-warning border-warning';

                return (
                    <div
                        key={i}
                        className={`flex-1 ${color} hover:brightness-110 transition-all border-x border-black/5 relative`}
                    >
                        <div className="absolute inset-x-0 bottom-full mb-3 hidden group-hover:flex justify-center -translate-x-1/2 left-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-text text-surface text-xs font-black tracking-widest uppercase py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap">
                                Score: {score.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function TeachingDashboard() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [score, setScore] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [lectures, setLectures] = useState([]);

    const [viewLevel, setViewLevel] = useState('course'); // 'course' | 'lecture' | 'student'
    const [selectedLecture, setSelectedLecture] = useState(null);
    const [lectureDashboard, setLectureDashboard] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [loading, setLoading] = useState(true);
    
    // Messaging state
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [messageSubject, setMessageSubject] = useState('');
    const [messageCategory, setMessageCategory] = useState('general');
    const [messageSending, setMessageSending] = useState(false);
    const [messageTemplates, setMessageTemplates] = useState([]);
    const [studentAnalytics, setStudentAnalytics] = useState(null);

    useEffect(() => {
        coursesAPI.list().then(res => {
            const c = res.data || [];
            if (c.length > 0) {
                // Ensure we select a teacher-owned course here ideally.
                // Assuming c are the courses they teach.
                setCourses(c);
                setSelectedCourse(c[0].id);
            } else {
                setLoading(false);
            }
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!selectedCourse) return;
        setLoading(true);
        Promise.all([
            analyticsAPI.getTeachingScore(selectedCourse).catch(() => ({ data: null })),
            analyticsAPI.getCourseDashboard(selectedCourse).catch(() => ({ data: null })),
            lecturesAPI.getByCourse(selectedCourse).catch(() => ({ data: [] }))
        ]).then(([scoreRes, dashRes, lecRes]) => {
            setScore(scoreRes.data);
            setDashboard(dashRes.data);
            setLectures(lecRes.data || []);
            setViewLevel('course');
            setSelectedLecture(null);
            setSelectedStudent(null);
            setLectureDashboard(null);
        }).finally(() => setLoading(false));
    }, [selectedCourse]);

    const handleLectureClick = async (lecture) => {
        setSelectedLecture(lecture);
        setViewLevel('lecture');
        setSelectedStudent(null);
        try {
            const res = await analyticsAPI.getLectureDashboard(lecture.id);
            setLectureDashboard(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleStudentClick = (studentObj) => {
        setSelectedStudent(studentObj);
        setViewLevel('student');
    };

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
        </div>
    );

    const openMessageModal = async (studentId) => {
        setShowMessageModal(true);
        setMessageContent('');
        setMessageSubject('');
        setMessageCategory('general');
        setMessageTemplates([]);
        setStudentAnalytics(null);
        try {
            const res = await messagesAPI.getStudentAnalytics(studentId, selectedCourse);
            setStudentAnalytics(res.data);
            setMessageTemplates(res.data.message_templates || []);
        } catch { }
    };

    const handleSendMessage = async () => {
        if (!messageContent.trim() || !selectedStudent || messageSending) return;
        setMessageSending(true);
        try {
            await messagesAPI.send({
                receiver_id: selectedStudent.student_id,
                subject: messageSubject || undefined,
                content: messageContent.trim(),
                course_id: selectedCourse,
                category: messageCategory,
                analytics_context: studentAnalytics ? {
                    engagement_score: studentAnalytics.avg_engagement,
                    icap_level: studentAnalytics.latest_icap,
                    quiz_avg: studentAnalytics.quiz_avg,
                    risk_level: studentAnalytics.risk_level,
                } : undefined,
            });
            setShowMessageModal(false);
            setMessageContent('');
        } catch { }
        setMessageSending(false);
    };

    const applyTemplate = (template) => {
        setMessageSubject(template.subject);
        setMessageContent(template.content);
        setMessageCategory(template.category);
    };

    const renderCourseView = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {score ? (
                <>
                    {/* Overall score */}
                    <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-12 text-center relative overflow-hidden mb-10 group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 pointer-events-none"><Activity size={320} /></div>

                        <div className={`text-8xl font-black mb-4 tracking-tighter ${score.overall_score >= 70 ? 'text-success' : score.overall_score >= 50 ? 'text-warning' : 'text-danger'}`}>
                            {score.overall_score.toFixed(1)}
                        </div>
                        <div className="text-text-secondary text-2xl font-black uppercase tracking-widest mb-8">Overall Teaching Score</div>
                        <div className="flex flex-wrap gap-4 justify-center text-sm font-black text-text-muted">
                            <span className="bg-surface-elevated px-6 py-3 rounded-[1.5rem] border border-border shadow-inner">{score.num_students} enrolled</span>
                            <span className="bg-surface-elevated px-6 py-3 rounded-[1.5rem] border border-border shadow-inner">{score.num_lectures} published lectures</span>
                            {score.total_sessions > 0 && (
                                <span className="bg-surface-elevated px-6 py-3 rounded-[1.5rem] border border-border shadow-inner">{score.total_sessions} tracking sessions</span>
                            )}
                        </div>
                    </div>

                    {/* Component scores (v2) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {(() => {
                            const metricCards = [
                                { key: 'engagement', label: 'Engagement', icon: Activity, color: 'text-accent bg-accent-light' },
                                { key: 'engagement_trend', label: 'Engage Trend', icon: TrendingUp, color: 'text-info bg-info-light' },
                                { key: 'quiz_performance', label: 'Quiz Score', icon: BarChart3, color: 'text-success bg-success-light' },
                                { key: 'icap_score', label: 'ICAP Depth', icon: Brain, color: 'text-warning bg-warning-light' },
                                { key: 'teacher_responsiveness', label: 'Responsiveness', icon: MessageSquare, color: 'text-primary bg-primary-light' },
                                { key: 'attendance', label: 'Attendance', icon: Users, color: 'text-info bg-info-light' },
                                { key: 'feedback', label: 'Feedback', icon: Target, color: 'text-danger bg-danger-light' },
                                { key: 'completion_rate', label: 'Completion', icon: BookOpen, color: 'text-success bg-success-light' },
                            ];
                            return metricCards.map(({ key, label, icon: Icon, color }) => {
                                const value = score.components?.[key];
                                if (value === undefined || value === null) return null;
                                return (
                                    <div key={key} className="bg-surface rounded-[2rem] shadow-sm border border-border p-8 flex flex-col hover:border-accent/40 transition-colors group">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className={`p-3 ${color} rounded-[1rem] shadow-sm border border-current`}><Icon size={24} /></div>
                                            <div className="text-sm font-black text-text-muted uppercase tracking-wider">{label}</div>
                                        </div>
                                        <div className="text-4xl font-black text-text mb-2">{typeof value === 'number' ? value.toFixed(0) : 0}%</div>
                                        {key === 'engagement_trend' && score.components?.engagement_slope !== undefined && (
                                            <div className={`text-sm font-bold mt-1 ${score.components.engagement_slope >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {score.components.engagement_slope >= 0 ? 'Improving' : 'Declining'} ({score.components.engagement_slope > 0 ? '+' : ''}{score.components.engagement_slope.toFixed(2)}/session)
                                            </div>
                                        )}
                                        <div className="w-full bg-surface-elevated rounded-full h-3 mt-auto pt-4 relative shadow-inner">
                                            <div className="absolute top-4 left-0 bg-text h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min(value || 0, 100)}%` }} />
                                        </div>
                                    </div>
                                );
                            }).filter(Boolean);
                        })()}
                    </div>

                    {/* Low engagement & ICAP distribution highlights */}
                    {(score.components?.low_engagement_rate !== undefined || score.components?.icap_distribution) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                            {score.components?.low_engagement_rate !== undefined && (
                                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10">
                                    <h4 className="text-sm font-black text-text-muted uppercase tracking-widest mb-6 border-l-4 border-danger pl-4">Low Engagement Alert</h4>
                                    <div className="flex items-baseline gap-4 bg-surface-alt p-6 rounded-[1.5rem] border border-border">
                                        <span className={`text-6xl font-black ${score.components.low_engagement_rate > 30 ? 'text-danger' : score.components.low_engagement_rate > 15 ? 'text-warning' : 'text-success'}`}>
                                            {score.components.low_engagement_rate.toFixed(0)}%
                                        </span>
                                        <span className="text-text-secondary font-bold text-lg">of sessions sub-40% engagement</span>
                                    </div>
                                </div>
                            )}
                            {score.components?.icap_distribution && (
                                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col justify-between">
                                    <h4 className="text-sm font-black text-text-muted uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">ICAP Distribution</h4>
                                    <div className="flex gap-4 items-end h-[100px] bg-surface-alt p-6 rounded-[1.5rem] border border-border">
                                        {['interactive', 'constructive', 'active', 'passive'].map((level) => {
                                            const count = score.components.icap_distribution[level] || 0;
                                            const total = Object.values(score.components.icap_distribution).reduce((a, b) => a + b, 0) || 1;
                                            const pct = (count / total) * 100;
                                            const colors = { interactive: 'bg-success', constructive: 'bg-info', active: 'bg-warning', passive: 'bg-text-muted' };
                                            return (
                                                <div key={level} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                                                    <div className="text-sm font-black text-text">{pct.toFixed(0)}%</div>
                                                    <div className={`w-full rounded-md ${colors[level]} transition-all duration-700 shadow-sm`} style={{ height: `${Math.max(pct * 0.7, 8)}px` }} />
                                                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">{level.slice(0, 3)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Multi-Dimensional Engagement Insights (v3) */}
                    {score.multi_dimensional && (
                        <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 mb-10">
                            <h4 className="text-xl font-black text-text tracking-tight mb-8 flex items-center gap-3">
                                Multi-Dimensional Analysis
                                <span className="ml-2 text-[10px] bg-accent text-surface shadow-sm px-3 py-1 rounded-lg font-black tracking-widest uppercase">v3 Model</span>
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Boredom', value: score.multi_dimensional.boredom_avg, icon: '😴', color: 'warning-light', inverted: true },
                                    { label: 'Confusion', value: score.multi_dimensional.confusion_avg, icon: '🤔', color: 'warning-light', inverted: true },
                                    { label: 'Frustration', value: score.multi_dimensional.frustration_avg, icon: '😤', color: 'danger-light', inverted: true },
                                    { label: 'Consistency', value: score.multi_dimensional.engagement_consistency, icon: '📊', color: 'success-light', inverted: false },
                                ].map(({ label, value, icon, color, inverted }) => {
                                    if (value == null) return null;
                                    const isGood = inverted ? value < 30 : value > 70;
                                    const isBad = inverted ? value > 50 : value < 40;
                                    const statusColor = isGood ? 'text-success' : isBad ? 'text-danger' : 'text-warning';
                                    return (
                                        <div key={label} className={`bg-surface-elevated border border-border shadow-sm rounded-[1.5rem] p-6 text-center hover:border-text/20 transition-colors`}>
                                            <div className="text-4xl mb-3">{icon}</div>
                                            <div className={`text-4xl font-black mb-1 ${statusColor}`}>{value.toFixed(0)}%</div>
                                            <div className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1">{label}</div>
                                            <div className="text-[10px] font-bold text-text-muted mt-2 px-3 py-1 bg-surface rounded-full inline-block border border-border">
                                                {inverted ? (isGood ? 'Low — Good' : isBad ? 'High — Risk' : 'Moderate') : (isGood ? 'Consistent' : isBad ? 'Variable' : 'Moderate')}
                                            </div>
                                        </div>
                                    );
                                }).filter(Boolean)}
                            </div>
                        </div>
                    )}

                    {/* SHAP Breakdown & Recs */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-10">
                        <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10">
                            <h3 className="text-2xl font-black text-text mb-8 flex items-center gap-4 border-b border-border pb-6"><Sparkles className="text-warning" size={32} /> SHAP Score Breakdown</h3>
                            <div className="space-y-5">
                                {Object.entries(score.shap_breakdown || {}).sort((a, b) => b[1] - a[1]).map(([key, value]) => {
                                    const labels = {
                                        engagement: 'Live Engagement',
                                        engagement_trend: 'Engagement Trend',
                                        low_engagement_penalty: 'Low Eng. Penalty',
                                        quiz_performance: 'Quiz History',
                                        icap_distribution: 'ICAP Depth Analysis',
                                        attendance: 'Attendance',
                                        feedback_sentiment: 'Feedback',
                                        completion_rate: 'Completion Rate',
                                    };
                                    return (
                                        <div key={key} className="flex justify-between items-center bg-surface-alt p-5 rounded-[1.5rem] border border-border">
                                            <span className="text-text-secondary font-black tracking-wide text-sm">{labels[key] || key.replace(/_/g, ' ').toUpperCase()}</span>
                                            <span className={`px-4 py-2 rounded-xl text-base font-black shadow-sm tracking-tighter ${value > 0 ? 'bg-success-light text-success border border-success/20' : 'bg-surface-elevated text-text-muted border border-border'}`}>
                                                +{value?.toFixed(1)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-accent-light rounded-[2.5rem] shadow-sm border border-accent/20 p-10 relative overflow-hidden">
                            <h3 className="text-2xl font-black text-accent mb-8 flex items-center gap-4"><Target size={32} /> AI Recommendations</h3>
                            {(score.recommendations || []).length === 0 ? (
                                <div className="text-text-secondary font-bold text-lg bg-surface/50 p-8 rounded-[1.5rem] text-center border border-accent/10">No recommendations. Excellent work!</div>
                            ) : (
                                <ul className="space-y-4 relative z-10">
                                    {score.recommendations.map((r, i) => (
                                        <li key={i} className="flex gap-5 text-lg font-bold text-text bg-surface/80 p-6 rounded-[1.5rem] shadow-sm border border-accent/20 hover:-translate-y-1 transition-transform">
                                            <span className="text-accent mt-0.5 shrink-0"><Sparkles size={24} /></span> 
                                            <span className="leading-snug">{r}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-16 text-center">
                    <div className="w-20 h-20 bg-surface-alt rounded-3xl mx-auto flex items-center justify-center border border-border mb-6">
                        <Activity className="text-text-muted" size={40} />
                    </div>
                    <div className="text-2xl font-black text-text mb-2">No Analytics Data Yet</div>
                    <p className="text-text-secondary font-semibold text-lg max-w-lg mx-auto">There isn't enough student engagement data to generate a teaching score for this course. Ensure students view lectures and take quizzes.</p>
                </div>
            )}

            {/* Lectures List for Drill-Down */}
            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border overflow-hidden mb-10 mt-10">
                <div className="px-10 py-8 border-b border-border bg-surface-alt flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <h3 className="text-2xl font-black text-text flex items-center gap-4"><Play size={28} className="text-accent" /> Course Lectures</h3>
                    <span className="text-xs font-black bg-surface border border-border shadow-sm text-text-secondary px-5 py-2.5 rounded-full uppercase tracking-widest">Select to view Analytics</span>
                </div>
                <div className="divide-y divide-border">
                    {lectures.length === 0 ? (
                        <div className="p-16 text-center text-text-muted font-bold text-xl">No published lectures found for this course.</div>
                    ) : (lectures.map(l => (
                        <div key={l.id}
                            className="px-10 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-surface-alt cursor-pointer transition-colors group"
                            onClick={() => handleLectureClick(l)}>
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 flex-shrink-0 bg-accent-light border border-accent/20 text-accent rounded-[1.5rem] flex items-center justify-center group-hover:bg-accent group-hover:text-surface transition-colors shadow-sm">
                                    <Play size={24} />
                                </div>
                                <div>
                                    <h4 className="text-text text-xl font-black mb-1 group-hover:text-accent transition-colors">{l.title}</h4>
                                    <div className="text-xs font-black text-text-muted uppercase tracking-widest">
                                        ID: {l.id.slice(0, 8)}
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-secondary px-8 border-2 group-hover:bg-surface-elevated group-hover:text-accent transition-all shadow-sm">
                                View Dashboard &rarr;
                            </button>
                        </div>
                    )))}
                </div>
            </div>
        </div>
    );

    const renderLectureView = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button className="mb-8 flex items-center gap-3 text-sm font-black uppercase tracking-widest text-text-muted hover:text-accent transition-colors"
                onClick={() => setViewLevel('course')}>
                <ArrowLeft size={16} /> Back to Course Overview
            </button>

            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-12 mb-10 border-l-8 border-l-accent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={240} /></div>
                <div className="text-sm font-black text-accent uppercase tracking-widest mb-4">Lecture Dashboard</div>
                <h2 className="text-4xl md:text-5xl font-black text-text leading-tight tracking-tight pr-10 mb-8">{selectedLecture.title}</h2>
                <div className="flex flex-wrap gap-4 text-base">
                    <span className="bg-surface-alt border border-border shadow-sm text-text-secondary px-6 py-3 rounded-[1.5rem] font-black flex items-center gap-3 tracking-wide">
                        <Users size={20} className="text-accent" /> {lectureDashboard?.total_views || 0} Enrollments
                    </span>
                    <span className="bg-surface-alt border border-border shadow-sm text-text-secondary px-6 py-3 rounded-[1.5rem] font-black flex items-center gap-3 tracking-wide">
                        <Activity size={20} className="text-success" /> {lectureDashboard?.avg_engagement?.toFixed(1) || 0}% Avg Class Activity
                    </span>
                </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border overflow-hidden mb-10">
                <div className="px-10 py-8 border-b border-border bg-surface-alt">
                    <h3 className="text-2xl font-black text-text mb-2 tracking-tight">Student Timelines</h3>
                    <p className="text-xs font-black text-text-muted uppercase tracking-widest">Click a row to drill into a specific student</p>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-elevated text-text-muted font-black border-b border-border text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-10 py-6">Student</th>
                                <th className="px-10 py-6">ICAP State</th>
                                <th className="px-10 py-6">Avg Focus</th>
                                <th className="px-10 py-6">Quiz Score</th>
                                <th className="px-10 py-6 w-[40%]">Activity Heatmap</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {!lectureDashboard || lectureDashboard.student_stats?.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-text-muted font-bold text-lg">No students have recorded engagement for this lecture yet.</td>
                                </tr>
                            ) : (
                                lectureDashboard.student_stats.map(s => {
                                    const timelineData = lectureDashboard.engagement_timelines.find(t => t.student_id === s.student_id)?.timeline || [];

                                    return (
                                        <tr key={s.student_id} className="hover:bg-surface-alt transition-colors cursor-pointer group" onClick={() => handleStudentClick(s)}>
                                            <td className="px-10 py-6">
                                                <div className="font-bold text-lg text-text mb-1 group-hover:text-accent transition-colors">{s.name}</div>
                                                <div className="text-xs font-semibold text-text-secondary tracking-wide">{s.email}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border shadow-sm ${s.icap_level ? 'bg-accent-light text-accent border-accent/20' : 'bg-surface-elevated text-text-muted border-border'}`}>
                                                    {s.icap_level || 'Passive'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className={`font-black text-2xl tracking-tighter ${s.engagement_score >= 80 ? 'text-success' : s.engagement_score >= 50 ? 'text-warning' : 'text-danger'}`}>
                                                    {(s.engagement_score || 0).toFixed(0)}%
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                {s.quiz_score !== null ? (
                                                    <span className="font-black text-xl text-text">{s.quiz_score.toFixed(0)}%</span>
                                                ) : (
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-text-muted bg-surface-elevated px-3 py-1.5 rounded-md border border-border shadow-inner">Missing</span>
                                                )}
                                            </td>
                                            <td className="px-10 py-6 w-1/3">
                                                <EngagementHeatmap timeline={timelineData} />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderStudentView = () => {
        if (!selectedStudent) return null;
        const timelineData = lectureDashboard?.engagement_timelines.find(t => t.student_id === selectedStudent.student_id)?.timeline || [];

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button className="mb-8 flex items-center gap-3 text-sm font-black uppercase tracking-widest text-text-muted hover:text-accent transition-colors"
                    onClick={() => setViewLevel('lecture')}>
                    <ArrowLeft size={16} /> Back to {selectedLecture.title}
                </button>

                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12 mb-10 border-l-8 border-l-accent">
                    <div className="flex flex-col md:flex-row gap-8 md:items-center justify-between">
                        <div>
                            <div className="text-sm font-black text-accent uppercase tracking-widest mb-3">Student Deep Dive</div>
                            <h2 className="text-4xl font-black text-text leading-tight mb-2 tracking-tight">{selectedStudent.name}</h2>
                            <div className="text-text-secondary font-bold text-base">{selectedStudent.email}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-surface-alt border border-border p-6 rounded-[2rem] text-center min-w-[140px] shadow-sm">
                                <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Focus</div>
                                <div className={`text-4xl font-black ${selectedStudent.engagement_score >= 80 ? 'text-success' : selectedStudent.engagement_score >= 50 ? 'text-warning' : 'text-danger'}`}>
                                    {(selectedStudent.engagement_score || 0).toFixed(0)}%
                                </div>
                            </div>
                            <div className="bg-surface-alt border border-border p-6 rounded-[2rem] text-center min-w-[140px] shadow-sm">
                                <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Quiz</div>
                                <div className="text-4xl font-black text-accent">
                                    {selectedStudent.quiz_score !== null ? `${selectedStudent.quiz_score.toFixed(0)}%` : '—'}
                                </div>
                            </div>
                            <button
                                onClick={() => openMessageModal(selectedStudent.student_id)}
                                className="bg-text text-surface p-6 rounded-[2rem] flex flex-col items-center justify-center min-w-[140px] hover:bg-text-secondary transition-colors shadow-md border border-text"
                            >
                                <MessageSquare size={28} className="mb-2" />
                                <div className="text-xs font-black uppercase tracking-widest">Message</div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                    <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10">
                        <h3 className="text-2xl font-black text-text mb-8 border-b border-border pb-4">Detailed Metrics</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-surface-alt p-5 rounded-2xl border border-border">
                                <span className="font-bold text-text-secondary text-sm">ICAP Active State</span>
                                <span className="px-4 py-1.5 bg-accent-light text-accent font-black rounded-lg border border-accent/20 text-xs uppercase tracking-widest shadow-sm">{selectedStudent.icap_level || 'Passive'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-surface-alt p-5 rounded-2xl border border-border">
                                <span className="font-bold text-text-secondary text-sm">Avg Boredom</span>
                                <span className="font-black text-xl text-warning">{(selectedStudent.boredom_score || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center bg-surface-alt p-5 rounded-2xl border border-border">
                                <span className="font-bold text-text-secondary text-sm">Avg Confusion</span>
                                <span className="font-black text-xl text-danger">{(selectedStudent.confusion_score || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center bg-surface-alt p-5 rounded-2xl border border-border">
                                <span className="font-bold text-text-secondary text-sm text-danger flex items-center gap-3"><Target size={20} /> Browser Tab Switches</span>
                                <span className="font-black text-xl text-surface bg-danger px-4 py-1 rounded-full shadow-inner">{selectedStudent.tab_switches}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col">
                        <h3 className="text-2xl font-black text-text mb-4">Minute-by-Minute Map</h3>
                        <p className="text-sm font-medium text-text-secondary mb-10 leading-relaxed">
                            This timeline records exact engagement at every sampling point. Use it to cross-reference with specific lecture timestamps.
                        </p>
                        <div className="mt-auto">
                            <EngagementHeatmap timeline={timelineData} />
                            <div className="flex justify-between items-center mt-3 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                <span>Lecture Start</span>
                                <span>End</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight border-l-8 border-accent pl-6 py-1">Teaching Analytics</h1>
                    <p className="text-lg text-text-secondary font-medium mt-3 ml-6 flex items-center gap-3"><TrendingUp size={20} className="text-accent" /> Monitor live student engagement & class performance</p>
                </div>
                {viewLevel === 'course' && (
                    <div className="relative">
                        <select
                            className="input md:w-80 !py-4 pr-12 text-base font-black cursor-pointer shadow-sm"
                            value={selectedCourse || ''}
                            onChange={e => setSelectedCourse(e.target.value)}
                        >
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-accent">
                            <BookOpen size={24} />
                        </div>
                    </div>
                )}
            </div>

            {viewLevel === 'course' && renderCourseView()}
            {viewLevel === 'lecture' && renderLectureView()}
            {viewLevel === 'student' && renderStudentView()}

            {/* Message Student Modal */}
            {showMessageModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border">
                        <div className="p-8 border-b border-border flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-accent-light text-accent rounded-xl border border-accent/20">
                                    <MessageSquare size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-text tracking-tight">
                                        Message {selectedStudent.name}
                                    </h3>
                                    <p className="text-base text-text-secondary font-bold mt-1">Send personalized guidance</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMessageModal(false)} className="w-12 h-12 flex items-center justify-center hover:bg-surface-alt rounded-[1rem] text-text-muted hover:text-text border border-transparent hover:border-border transition-all">✕</button>
                        </div>

                        {/* Student Analytics Context */}
                        {studentAnalytics && (
                            <div className="px-8 pt-8">
                                <div className="bg-surface-alt rounded-[2rem] p-6 text-center border border-border shadow-inner">
                                    <div className="text-xs font-black text-text-secondary uppercase tracking-widest mb-4">Context Metrics</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-b border-border pb-1">Focus</div>
                                            <div className={`text-2xl font-black ${(studentAnalytics.avg_engagement || 0) >= 60 ? 'text-success' : (studentAnalytics.avg_engagement || 0) >= 40 ? 'text-warning' : 'text-danger'}`}>
                                                {studentAnalytics.avg_engagement?.toFixed(0) || 'N/A'}%
                                            </div>
                                        </div>
                                        <div className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-b border-border pb-1">ICAP</div>
                                            <div className="text-2xl font-black text-accent">{studentAnalytics.latest_icap || 'N/A'}</div>
                                        </div>
                                        <div className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-b border-border pb-1">Quiz Avg</div>
                                            <div className="text-2xl font-black text-text">{studentAnalytics.quiz_avg?.toFixed(0) || 'N/A'}%</div>
                                        </div>
                                        <div className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-b border-border pb-1">Risk Status</div>
                                            <div className={`text-sm font-black uppercase mt-1 ${studentAnalytics.risk_level === 'critical' ? 'text-danger bg-danger-light py-1 rounded-md' : studentAnalytics.risk_level === 'at_risk' ? 'text-warning bg-warning-light py-1 rounded-md' : 'text-success bg-success-light py-1 rounded-md'}`}>
                                                {(studentAnalytics.risk_level || 'normal').replace('_', ' ')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Templates */}
                        {messageTemplates.length > 0 && (
                            <div className="px-8 pt-6">
                                <div className="text-xs font-black text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles size={16} className="text-warning" /> 1-Click AI Templates
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {messageTemplates.map((t, i) => (
                                        <button
                                            key={i}
                                            onClick={() => applyTemplate(t)}
                                            className={`text-sm font-bold px-4 py-2.5 rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 ${
                                                t.category === 'engagement_alert' ? 'border-danger/30 bg-danger-light text-danger hover:border-danger hover:bg-danger hover:text-surface' :
                                                t.category === 'advice' ? 'border-info/30 bg-info-light text-info hover:border-info hover:bg-info hover:text-surface' :
                                                t.category === 'encouragement' ? 'border-success/30 bg-success-light text-success hover:border-success hover:bg-success hover:text-surface' :
                                                'border-border bg-surface text-text hover:bg-surface-elevated'
                                            }`}
                                        >
                                            {t.category === 'engagement_alert' && <AlertTriangle size={14} className="inline mr-2" />}
                                            {t.category === 'encouragement' && <Award size={14} className="inline mr-2" />}
                                            {t.subject}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Compose */}
                        <div className="p-8 space-y-6">
                            <div className="flex flex-col sm:flex-row gap-5">
                                <div className="flex-1">
                                    <label className="text-xs font-black text-text-muted uppercase tracking-widest mb-2 block">Subject</label>
                                    <input
                                        type="text"
                                        value={messageSubject}
                                        onChange={e => setMessageSubject(e.target.value)}
                                        placeholder="Optional subject line"
                                        className="input"
                                    />
                                </div>
                                <div className="sm:w-1/3">
                                    <label className="text-xs font-black text-text-muted uppercase tracking-widest mb-2 block">Category</label>
                                    <select
                                        value={messageCategory}
                                        onChange={e => setMessageCategory(e.target.value)}
                                        className="input font-bold cursor-pointer"
                                    >
                                        <option value="general">Generic</option>
                                        <option value="advice">Study Advice</option>
                                        <option value="encouragement">Encouragement</option>
                                        <option value="warning">Warning</option>
                                        <option value="engagement_alert">Engagement Alert</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-text-muted uppercase tracking-widest mb-2 block">Direct Message</label>
                                <textarea
                                    value={messageContent}
                                    onChange={e => setMessageContent(e.target.value)}
                                    placeholder="Type your message to the student..."
                                    rows={6}
                                    className="input resize-y min-h-[140px]"
                                />
                            </div>
                            <div className="flex justify-end gap-4 pt-4 border-t border-border">
                                <button
                                    onClick={() => setShowMessageModal(false)}
                                    className="btn btn-secondary px-8"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageContent.trim() || messageSending}
                                    className="btn btn-primary px-8 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                    {messageSending ? 'Dispatching...' : 'Send Message'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
