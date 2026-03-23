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
        let isMounted = true;
        coursesAPI.list().then(res => {
            if (!isMounted) return;
            const c = res.data || [];
            if (c.length > 0) {
                setCourses(c);
                setSelectedCourse(c[0].id);
            } else {
                setLoading(false);
            }
        }).catch(err => {
            console.error("Failed to fetch courses:", err);
            if (isMounted) setLoading(false);
        });
        return () => { isMounted = false; };
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

    const renderCourseView = () => {
        // Prepare helpers
        const overall = score?.overall_score || 0;
        let scoreLabel = 'Needs Improvement';
        let scoreColor = 'text-danger';
        let scoreBg = 'bg-danger-light border-danger/20';
        if (overall >= 70) { scoreLabel = 'Excellent'; scoreColor = 'text-success'; scoreBg = 'bg-success-light border-success/20'; }
        else if (overall >= 50) { scoreLabel = 'Good'; scoreColor = 'text-warning'; scoreBg = 'bg-warning-light border-warning/20'; }

        const primaryRec = score?.recommendations && score.recommendations.length > 0 
                           ? score.recommendations[0] 
                           : "Your teaching metrics are looking healthy. Keep up the great work!";

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {score ? (
                    <>
                        {/* 1. HERO SECTION */}
                        <div className={`rounded-[2.5rem] p-10 md:p-14 mb-10 border shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-10 ${scoreBg}`}>
                            <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none">
                                <Award size={400} />
                            </div>
                            <div className="flex-shrink-0 text-center relative z-10 bg-surface/80 backdrop-blur-md p-10 rounded-[2.5rem] border border-surface-alt shadow-sm min-w-[280px]">
                                <div className={`text-8xl md:text-9xl font-black tracking-tighter mb-2 ${scoreColor}`}>
                                    {overall.toFixed(1)}
                                </div>
                                <div className="text-text-secondary font-black uppercase tracking-widest text-sm mb-4">Teaching Score</div>
                                <div className={`inline-block px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest border shadow-inner ${scoreColor} border-current/20 bg-surface`}>
                                    {scoreLabel}
                                </div>
                            </div>
                            <div className="flex-1 relative z-10 text-center md:text-left">
                                <h2 className="text-3xl md:text-4xl font-black text-text tracking-tight mb-4 flex items-center justify-center md:justify-start gap-4">
                                    <Sparkles className="text-accent" size={32} /> AI Insight
                                </h2>
                                <p className="text-xl text-text-secondary font-medium leading-relaxed max-w-2xl mb-8">
                                    {primaryRec}
                                </p>
                                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                    <span className="bg-surface/80 backdrop-blur-sm px-6 py-3 rounded-[1.5rem] border border-border shadow-sm text-sm font-black text-text-muted flex items-center gap-2">
                                        <Users size={16} /> <span className="text-text">{score.num_students}</span> Enrolled
                                    </span>
                                    <span className="bg-surface/80 backdrop-blur-sm px-6 py-3 rounded-[1.5rem] border border-border shadow-sm text-sm font-black text-text-muted flex items-center gap-2">
                                        <Play size={16} /> <span className="text-text">{score.num_lectures}</span> Lectures
                                    </span>
                                    {score.total_sessions > 0 && (
                                        <span className="bg-surface/80 backdrop-blur-sm px-6 py-3 rounded-[1.5rem] border border-border shadow-sm text-sm font-black text-text-muted flex items-center gap-2">
                                            <Activity size={16} /> <span className="text-text">{score.total_sessions}</span> Sessions
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. CORE METRICS */}
                        <h3 className="text-2xl font-black text-text mb-6 flex items-center gap-3"><Target className="text-accent" /> Core Metrics</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            {(() => {
                                const coreCards = [
                                    { key: 'engagement', label: 'Engagement', icon: Activity, color: 'text-accent bg-accent-light border-accent/20' },
                                    { key: 'quiz_performance', label: 'Quiz Score', icon: BarChart3, color: 'text-success bg-success-light border-success/20' },
                                    { key: 'icap_score', label: 'ICAP Depth', icon: Brain, color: 'text-warning bg-warning-light border-warning/20' },
                                    { key: 'attendance', label: 'Attendance', icon: Users, color: 'text-primary bg-primary-light border-primary/20' },
                                ];
                                return coreCards.map(({ key, label, icon: Icon, color }) => {
                                    const value = score.components?.[key] || 0;
                                    return (
                                        <div key={key} className="bg-surface rounded-[2rem] shadow-sm border border-border p-8 flex flex-col hover:-translate-y-1 transition-transform group relative overflow-hidden">
                                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Icon size={140} /></div>
                                            <div className="flex justify-between items-start mb-8 relative z-10">
                                                <div className={`p-4 ${color} rounded-[1.2rem] shadow-sm border`}><Icon size={24} /></div>
                                                {key === 'engagement' && score.components?.engagement_slope !== undefined && (
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1 ${score.components.engagement_slope >= 0 ? 'bg-success-light text-success border-success/20' : 'bg-danger-light text-danger border-danger/20'}`}>
                                                        {score.components.engagement_slope >= 0 ? <TrendingUp size={14}/> : <TrendingUp size={14} className="rotate-180"/>}
                                                        {score.components.engagement_slope > 0 ? '+' : ''}{(score.components.engagement_slope || 0).toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-black text-text-muted uppercase tracking-widest mb-1 relative z-10">{label}</div>
                                            <div className="text-5xl font-black text-text mb-8 tracking-tighter relative z-10">{value.toFixed(0)}%</div>
                                            
                                            <div className="w-full bg-surface-elevated rounded-full h-2 mt-auto relative shadow-inner overflow-hidden z-10">
                                                <div className="absolute top-0 left-0 bg-text h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(value, 100)}%` }} />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* 3. VISUAL ANALYTICS & SECONDARY METRICS ROW */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
                            {/* ICAP Distribution */}
                            <div className="xl:col-span-1 bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col">
                                <h3 className="text-xl font-black text-text mb-8 border-l-4 border-warning pl-4 flex items-center justify-between">
                                    <span>ICAP Distribution</span>
                                </h3>
                                <div className="flex-1 flex gap-4 items-end bg-surface-alt p-6 rounded-[1.5rem] border border-border min-h-[220px]">
                                    {['interactive', 'constructive', 'active', 'passive'].map((level) => {
                                        const count = score.components?.icap_distribution?.[level] || 0;
                                        const total = Object.values(score.components?.icap_distribution || {}).reduce((a, b) => a + b, 0) || 1;
                                        const pct = (count / total) * 100;
                                        const colors = { interactive: 'bg-success', constructive: 'bg-info', active: 'bg-warning', passive: 'bg-text-muted' };
                                        return (
                                            <div key={level} className="flex-1 flex flex-col items-center justify-end h-full gap-3 group">
                                                <div className="text-sm font-black text-text opacity-0 group-hover:opacity-100 transition-opacity">{pct.toFixed(0)}%</div>
                                                <div className={`w-full rounded-xl ${colors[level]} transition-all duration-700 shadow-sm relative`} style={{ height: `${Math.max(pct * 1.2, 12)}px` }}>
                                                    <div className="absolute mb-2 bottom-full left-1/2 -translate-x-1/2 bg-text text-surface text-[10px] uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-bold whitespace-nowrap z-20">
                                                        {count} Sessions
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mt-1">{level.slice(0, 3)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="xl:col-span-2 bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col">
                                <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                                    <h3 className="text-xl font-black text-text flex items-center gap-3"><Clock className="text-text-muted" size={24} /> Deep Dive Analytics</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                                    <div className="bg-surface-alt rounded-[1.5rem] p-6 border border-border flex flex-col items-center justify-center text-center hover:border-text/20 transition-colors">
                                        <div className="text-4xl font-black text-text mb-2 tracking-tighter">{(score.components?.teacher_responsiveness || 0).toFixed(0)}%</div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-text-muted mb-3">Responsiveness</div>
                                        <div className="text-xs text-text-secondary font-bold bg-surface shadow-sm rounded-full px-4 py-1.5 border border-border">
                                            {score.components?.teacher_messages || 0} Msgs Sent
                                        </div>
                                    </div>
                                    <div className="bg-surface-alt rounded-[1.5rem] p-6 border border-border flex flex-col items-center justify-center text-center hover:border-text/20 transition-colors">
                                        <div className="text-4xl font-black text-text mb-2 tracking-tighter">{(score.components?.feedback || 0).toFixed(0)}%</div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-text-muted mb-3">Student Feedback</div>
                                        <div className="text-xs text-text-secondary font-bold bg-surface shadow-sm rounded-full px-4 py-1.5 border border-border">Satisfaction</div>
                                    </div>
                                    <div className="bg-surface-alt rounded-[1.5rem] p-6 border border-border flex flex-col items-center justify-center text-center hover:border-text/20 transition-colors">
                                        <div className="text-4xl font-black text-text mb-2 tracking-tighter">{(score.components?.completion_rate || 0).toFixed(0)}%</div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-text-muted mb-3">Completion</div>
                                        <div className="text-xs text-text-secondary font-bold bg-surface shadow-sm rounded-full px-4 py-1.5 border border-border">Rate</div>
                                    </div>
                                    <div className={`rounded-[1.5rem] p-6 border flex flex-col items-center justify-center text-center hover:brightness-95 transition-all ${score.components?.low_engagement_rate > 20 ? 'bg-danger-light border-danger/30 text-danger' : 'bg-success-light border-success/30 text-success'}`}>
                                        <div className="text-4xl font-black mb-2 tracking-tighter">{(score.components?.low_engagement_rate || 0).toFixed(0)}%</div>
                                        <div className="text-[10px] uppercase tracking-widest font-black opacity-80 mb-3">Low Eng. Alert</div>
                                        <div className="text-xs font-bold bg-surface/50 rounded-full px-4 py-1.5 border border-black/5 shadow-inner">Sessions</div>
                                    </div>
                                </div>
                                
                                {score.multi_dimensional && (
                                    <div className="mt-8 pt-8 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { l: 'Boredom', v: score.multi_dimensional.boredom_avg, i: '😴' },
                                            { l: 'Confusion', v: score.multi_dimensional.confusion_avg, i: '🤔' },
                                            { l: 'Frustration', v: score.multi_dimensional.frustration_avg, i: '😤' },
                                            { l: 'Consistency', v: score.multi_dimensional.engagement_consistency, i: '📊' }
                                        ].map(m => m.v != null && (
                                            <div key={m.l} className="flex flex-col items-center gap-1.5 bg-surface-alt/50 p-4 rounded-2xl border border-transparent hover:border-border transition-colors">
                                                <div className="text-2xl font-black text-text">{m.v.toFixed(0)}%</div>
                                                <div className="text-[10px] uppercase tracking-widest font-black text-text-muted flex items-center gap-1.5 bg-surface px-3 py-1 rounded-md shadow-sm border border-border">{m.i} {m.l}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. AI RECOMMENDATIONS & SHAP */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-12">
                            {/* Recommendations */}
                            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col">
                                <h3 className="text-2xl font-black text-text mb-8 flex items-center gap-4 border-b border-border pb-6">
                                    <Sparkles className="text-warning" size={28} /> Actionable Insights
                                </h3>
                                <div className="flex-1 space-y-5">
                                    {score.recommendations && score.recommendations.length > 0 ? (
                                        score.recommendations.map((rec, idx) => {
                                            // Assign priority styling
                                            let priorityClass = "bg-surface-alt border-border text-text";
                                            let badge = "Observation";
                                            let badgeClass = "bg-surface border-border text-text-muted";
                                            
                                            if (rec.toLowerCase().includes('low') || rec.toLowerCase().includes('declining') || rec.toLowerCase().includes('below') || rec.toLowerCase().includes('frustration')) {
                                                priorityClass = "bg-danger-light border-danger/20 text-danger-dark border";
                                                badge = "High Priority";
                                                badgeClass = "bg-danger text-surface border-danger";
                                            } else if (rec.toLowerCase().includes('improving') || rec.toLowerCase().includes('healthy') || rec.toLowerCase().includes('great') || rec.toLowerCase().includes('positive')) {
                                                priorityClass = "bg-success-light border-success/20 text-success-dark border";
                                                badge = "Positive";
                                                badgeClass = "bg-success text-surface border-success";
                                            } else {
                                                priorityClass = "bg-warning-light border-warning/20 text-warning-dark border";
                                                badge = "Insight";
                                                badgeClass = "bg-warning text-surface border-warning";
                                            }

                                            return (
                                                <div key={idx} className={`p-6 rounded-[1.5rem] flex flex-col gap-3 shadow-sm transition-transform hover:-translate-y-1 ${priorityClass}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-[10px] uppercase tracking-widest font-black border px-3 py-1 rounded-md shadow-sm ${badgeClass}`}>
                                                            {badge}
                                                        </span>
                                                    </div>
                                                    <p className="leading-relaxed font-bold text-sm md:text-base">{rec}</p>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center p-12 text-text-muted font-bold bg-surface-alt rounded-[2rem] border border-border border-dashed h-full flex items-center justify-center">
                                            No specific recommendations at this time.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SHAP */}
                            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col">
                                <h3 className="text-2xl font-black text-text mb-2 flex items-center gap-4">
                                    <Activity size={28} className="text-accent" /> Score Contributors
                                </h3>
                                <p className="text-text-secondary text-sm font-semibold mb-8 border-b border-border pb-6">
                                    Factors impacting your Overall Teaching Score (SHAP Values)
                                </p>
                                <div className="space-y-4 flex-1">
                                    {Object.entries(score.shap_breakdown || {}).sort((a, b) => b[1] - a[1]).map(([key, value]) => {
                                        const labels = {
                                            engagement: 'Live Engagement', engagement_trend: 'Engagement Trend', low_engagement_penalty: 'Low Eng. Penalty',
                                            quiz_performance: 'Quiz History', icap_distribution: 'ICAP Depth Analysis', attendance: 'Attendance',
                                            feedback_sentiment: 'Feedback', completion_rate: 'Completion Rate', teacher_responsiveness: 'Instructor Comm.',
                                            teacher_activity: 'Teacher Activity', engagement_consistency: 'Consistency'
                                        };
                                        const isPositive = value >= 0;
                                        return (
                                            <div key={key} className="relative bg-surface-alt p-5 rounded-[1.2rem] border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 group overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <span className="text-text font-black tracking-wide text-sm relative z-10 flex-shrink-0 w-36">
                                                    {labels[key] || key.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                                <div className="flex items-center gap-4 relative z-10 flex-1 justify-end">
                                                    <div className={`w-full max-w-[160px] h-2.5 rounded-full overflow-hidden bg-surface shadow-inner ${isPositive ? 'ml-auto' : ''}`}>
                                                        <div className={`h-full ${isPositive ? 'bg-success' : 'bg-danger'} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(Math.abs(value) * 3, 100)}%`, marginLeft: isPositive ? 'auto' : '0' }}></div>
                                                    </div>
                                                    <span className={`w-12 text-right text-base font-black ${isPositive ? 'text-success' : 'text-danger'}`}>
                                                        {isPositive ? '+' : ''}{value?.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 5. TEACHER ACTIVITY METRICS */}
                        {score.teacher_activity && (
                            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 mb-12">
                                <h3 className="text-2xl font-black text-text mb-8 flex items-center gap-4 border-b border-border pb-6">
                                    <Award className="text-accent" size={28} /> Teacher Activity Summary
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Total Activities', value: score.teacher_activity.total_activities, icon: '📋', unit: '' },
                                        { label: 'Materials Uploaded', value: score.teacher_activity.materials_uploaded, icon: '📎', unit: '' },
                                        { label: 'Messages Sent', value: score.teacher_activity.messages_sent, icon: '💬', unit: '' },
                                        { label: 'Activity Score', value: score.teacher_activity.activity_score, icon: '⚡', unit: '%' },
                                    ].map(m => (
                                        <div key={m.label} className="flex flex-col items-center gap-2 bg-surface-alt p-6 rounded-2xl border border-border hover:border-accent/30 transition-colors">
                                            <div className="text-3xl">{m.icon}</div>
                                            <div className="text-3xl font-black text-text">{m.value}{m.unit}</div>
                                            <div className="text-[10px] uppercase tracking-widest font-black text-text-muted">{m.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </>
                ) : (
                    /* 5. EMPTY STATE */
                    <div className="bg-surface rounded-[3rem] shadow-sm border border-border p-16 md:p-24 text-center relative overflow-hidden my-10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="w-28 h-28 bg-surface-alt rounded-[2.5rem] mx-auto flex items-center justify-center border border-border mb-10 relative z-10 shadow-sm rotate-3 hover:rotate-6 transition-transform">
                            <Activity className="text-accent" size={56} />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-text mb-6 tracking-tight relative z-10">No Analytics Data Yet</h2>
                        <p className="text-text-secondary font-medium text-xl max-w-2xl mx-auto mb-12 relative z-10 leading-relaxed">
                            There isn't enough student engagement data to generate a teaching score for this course. Ensure your students are viewing your lectures and engaging with quizzes.
                        </p>
                    </div>
                )}
            {/* Students List for Course Drill-Down */}
            {dashboard?.student_stats && (
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border overflow-hidden mb-10 mt-10">
                    <div className="px-10 py-8 border-b border-border bg-surface-alt flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <h3 className="text-2xl font-black text-text flex items-center gap-4"><Users size={28} className="text-accent" /> Course Students</h3>
                        <span className="text-xs font-black bg-surface border border-border shadow-sm text-text-secondary px-5 py-2.5 rounded-full uppercase tracking-widest">Select to view Analytics</span>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-elevated text-text-muted font-black border-b border-border text-xs uppercase tracking-widest">
                                <tr>
                                    <th className="px-10 py-6">Student</th>
                                    <th className="px-10 py-6">ICAP State</th>
                                    <th className="px-10 py-6">Avg Focus</th>
                                    <th className="px-10 py-6">Quiz Avg</th>
                                    <th className="px-10 py-6 w-[40%]">Activity Heatmap</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {dashboard.student_stats.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-16 text-center text-text-muted font-bold text-lg">No students found for this course.</td>
                                    </tr>
                                ) : (
                                    dashboard.student_stats.map(s => {
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
                                                    <div className={`font-black text-2xl tracking-tighter ${(s.engagement_score || 0) >= 80 ? 'text-success' : (s.engagement_score || 0) >= 50 ? 'text-warning' : 'text-danger'}`}>
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
                                                    <EngagementHeatmap timeline={s.timeline || []} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
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
    };

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
        const timelineData = selectedLecture 
            ? (lectureDashboard?.engagement_timelines.find(t => t.student_id === selectedStudent.student_id)?.timeline || [])
            : (selectedStudent.timeline || []);

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button className="mb-8 flex items-center gap-3 text-sm font-black uppercase tracking-widest text-text-muted hover:text-accent transition-colors"
                    onClick={() => setViewLevel(selectedLecture ? 'lecture' : 'course')}>
                    <ArrowLeft size={16} /> {selectedLecture ? `Back to ${selectedLecture.title}` : 'Back to Course Overview'}
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
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
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
