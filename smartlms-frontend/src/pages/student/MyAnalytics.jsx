import { useState, useEffect } from 'react';
import { analyticsAPI, gamificationAPI, engagementAPI } from '../../api/client';
import { BarChart3, Activity, Brain, Award, Sparkles, Bot, Download, Info, TrendingUp, Zap, Target } from 'lucide-react';
import { SHAPWaterfall, TopFactors, EngagementGauge } from '../../components/engagement/SHAPVisualization';
import { ICAPBadge, ICAPProgressBar } from '../../components/engagement/EngagementHeatmap';

export default function MyAnalytics() {
    const [data, setData] = useState(null);
    const [gamification, setGamification] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            analyticsAPI.getStudentDashboard().catch(() => ({ data: null })),
            gamificationAPI.getProfile().catch(() => ({ data: null })),
            engagementAPI.getModelInfo().catch(() => ({ data: null })),
        ]).then(([analyticsRes, gamRes, modelRes]) => {
            setData(analyticsRes.data);
            setGamification(gamRes.data);
            setModelInfo(modelRes.data);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 space-y-12 animate-in fade-in">
            {/* Header */}
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight border-l-8 border-accent pl-6 py-2">My Analytics</h1>
                <p className="text-lg text-text-secondary font-medium mt-2 ml-6">Track your learning progress, engagement, and achievements.</p>
            </div>

            {/* Hero Stats: Gauge + Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Engagement Gauge - takes 2 cols */}
                <div className="lg:col-span-2 bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 flex flex-col items-center justify-center text-center">
                    <EngagementGauge score={data?.engagement?.avg_score || 0} size={180} />
                    <div className="mt-8 text-sm font-black text-text-muted uppercase tracking-widest">Overall Engagement</div>
                    {data?.engagement?.avg_score >= 70 ? (
                        <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-success bg-success-light border border-success/20 px-4 py-2 rounded-xl shadow-sm">
                            <Zap size={16} /> Highly Engaged Learner
                        </div>
                    ) : data?.engagement?.avg_score >= 40 ? (
                        <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-warning bg-warning-light border border-warning/20 px-4 py-2 rounded-xl shadow-sm">
                            <Target size={16} /> Building Momentum
                        </div>
                    ) : (
                        <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-muted bg-surface-elevated border border-border px-4 py-2 rounded-xl shadow-sm">
                            <TrendingUp size={16} /> Room to Grow
                        </div>
                    )}
                </div>

                {/* Stat cards - 3 cols */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-surface rounded-[2rem] shadow-sm border border-border p-8 flex flex-col items-center text-center hover:border-success/40 transition-colors group">
                        <div className="p-5 bg-success-light text-success rounded-3xl mb-6 shadow-inner border border-success/10 group-hover:scale-110 transition-transform"><BarChart3 size={32} /></div>
                        <div className="text-5xl font-black text-text mb-3">{data?.quizzes?.avg_score?.toFixed(0) || 0}%</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Avg Quiz Score</div>
                    </div>
                    <div className="bg-surface rounded-[2rem] shadow-sm border border-border p-8 flex flex-col items-center text-center hover:border-warning/40 transition-colors group">
                        <div className="p-5 bg-warning-light text-warning rounded-3xl mb-6 shadow-inner border border-warning/10 group-hover:scale-110 transition-transform"><Award size={32} /></div>
                        <div className="text-5xl font-black text-text mb-3">{gamification?.points || 0}</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Points (Lvl {gamification?.level || 1})</div>
                    </div>
                    <div className="bg-surface rounded-[2rem] shadow-sm border border-border p-8 flex flex-col items-center text-center hover:border-accent/40 transition-colors group">
                        <div className="p-5 bg-accent-light text-accent rounded-3xl mb-6 shadow-inner border border-accent/10 group-hover:scale-110 transition-transform"><Brain size={32} /></div>
                        <div className="text-5xl font-black text-text mb-3">{data?.engagement?.total_sessions || 0}</div>
                        <div className="text-sm font-black text-text-muted uppercase tracking-widest">Total Sessions</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ICAP distribution - enhanced */}
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12">
                    <h3 className="text-3xl font-black text-text tracking-tight mb-4">ICAP Distribution</h3>
                    <p className="text-base text-text-secondary font-medium mb-10">Based on the ICAP framework — Interactive &gt; Constructive &gt; Active &gt; Passive</p>
                    {Object.entries(data?.icap_distribution || {}).length === 0 ? (
                        <div className="text-text-muted font-bold p-10 border-2 border-dashed border-border bg-surface-alt rounded-3xl text-center">No ICAP data yet. Watch lectures to generate data.</div>
                    ) : (
                        <div className="space-y-8">
                            <ICAPProgressBar distribution={data?.icap_distribution} />
                            
                            <div className="mt-8 space-y-4">
                                {[
                                    { level: 'interactive', desc: 'Quiz (>70%), AI Tutor, Discussion', emoji: '🤝' },
                                    { level: 'constructive', desc: 'Note-taking, Typing, Annotations', emoji: '📝' },
                                    { level: 'active', desc: 'Focused watching, Speed control', emoji: '👁️' },
                                    { level: 'passive', desc: 'Watching only, No interaction', emoji: '📺' },
                                ].map(({ level, desc, emoji }) => {
                                    const count = data?.icap_distribution?.[level] || 0;
                                    const total = Object.values(data?.icap_distribution || {}).reduce((a, b) => a + b, 1);
                                    const pct = total > 0 ? (count / total * 100).toFixed(0) : 0;
                                    return (
                                        <div key={level} className="flex items-center justify-between p-4 rounded-2xl bg-surface-alt border border-border hover:border-accent/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <ICAPBadge level={level} size="md" />
                                                <div className="text-xs font-bold text-text-secondary hidden sm:flex items-center gap-2 max-w-[200px] truncate" title={desc}>
                                                    <span className="text-lg">{emoji}</span> {desc}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-text-muted">{count} sessions</span>
                                                <span className="text-xl font-black text-text w-12 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Badges */}
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12 flex flex-col">
                    <h3 className="text-3xl font-black text-text tracking-tight mb-10">Achievements & Badges</h3>
                    <div className="flex-1 flex flex-col">
                        <h4 className="text-sm font-black text-text-muted uppercase tracking-widest mb-6">Earned</h4>
                        {(gamification?.badges || []).length === 0 ? (
                            <div className="text-text-muted font-bold mb-10 p-10 border-2 border-dashed border-border bg-surface-alt rounded-3xl text-center">No badges earned yet. Keep learning!</div>
                        ) : (
                            <div className="flex flex-wrap gap-4 mb-10">
                                {gamification.badges.map((badge, i) => (
                                    <span key={i} className="px-5 py-3 bg-success-light text-success border border-success/20 rounded-2xl text-base font-black shadow-sm flex items-center gap-2">
                                        <span className="text-xl">🏆</span> {badge.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <h4 className="text-sm font-black text-text-muted uppercase tracking-widest mb-6 mt-auto">Available to Unlock</h4>
                        <div className="flex flex-wrap gap-3">
                            {Object.values(gamification?.available_badges || {}).map((b, i) => (
                                <span key={i} className="px-4 py-2 bg-surface-elevated border border-border text-text-muted rounded-xl text-xs font-black uppercase tracking-wider shadow-inner flex items-center gap-2 max-w-[150px] truncate" title={b.name}>
                                    🔒 {b.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="bg-accent-light rounded-[2.5rem] shadow-sm border border-accent/20 p-10 md:p-14 relative overflow-hidden">
                <div className="absolute top-0 -right-10 p-8 opacity-10 rotate-12 pointer-events-none"><Sparkles size={300} /></div>
                <h3 className="text-3xl font-black text-accent tracking-tight mb-8 flex items-center gap-4 relative z-10">
                    <Sparkles className="text-accent" size={36} /> AI Learning Insights
                </h3>
                {(data?.insights || []).length === 0 ? (
                    <div className="text-text-muted font-bold relative z-10 p-10 bg-surface/50 backdrop-blur-md rounded-3xl border border-border text-center">No insights available yet. Engage with more lectures!</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {data.insights.map((insight, i) => (
                            <div key={i} className="bg-surface/80 backdrop-blur-xl border border-accent/20 p-8 rounded-3xl shadow-md text-text font-medium text-lg leading-relaxed flex gap-5 hover:scale-[1.02] transition-transform">
                                <span className="text-accent mt-0.5 flex-shrink-0"><Sparkles size={24} /></span>
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Model Transparency Card */}
            {modelInfo && (
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12">
                    <h3 className="text-3xl font-black text-text tracking-tight mb-10 flex items-center gap-4">
                        <div className="p-4 bg-surface-elevated text-text-secondary rounded-2xl border border-border shadow-inner"><Info size={28} /></div>
                        How Your Engagement Is Measured
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 bg-surface-alt rounded-[2rem] border-2 border-border shadow-sm">
                            <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Model Type</div>
                            <div className="text-xl font-black text-text tracking-tight">{
                                modelInfo.model_type === 'v2_hybrid' ? 'XGBoost v2 + SHAP (DAiSEE)' :
                                modelInfo.model_type === 'xgboost_shap' ? 'XGBoost + SHAP' :
                                modelInfo.model_type === 'v2_binary' ? 'Binary XGBoost v2' :
                                'Enhanced Rule-Based'
                            }</div>
                            <div className="text-sm text-text-secondary mt-3 font-medium leading-relaxed">{modelInfo.description || 'Explainable ML engagement model'}</div>
                        </div>
                        <div className="p-8 bg-surface-alt rounded-[2rem] border-2 border-border shadow-sm">
                            <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Framework</div>
                            <div className="text-xl font-black text-text tracking-tight">ICAP</div>
                            <div className="text-sm text-text-secondary mt-3 font-medium leading-relaxed">Chi & Wylie (2014) — Interactive, Constructive, Active, Passive categorization.</div>
                        </div>
                        <div className="p-8 bg-surface-alt rounded-[2rem] border-2 border-border shadow-sm">
                            <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Features Analyzed</div>
                            <div className="text-xl font-black text-text tracking-tight">{modelInfo.features?.length || 24} Data Points</div>
                            <div className="text-sm text-text-secondary mt-3 font-medium leading-relaxed">Gaze tracking, head pose, facial AUs, and behavioral signals captured via webcam.</div>
                        </div>
                    </div>
                    {modelInfo.features?.length > 0 && (
                        <div className="mt-10 flex flex-wrap gap-3 p-8 border border-border rounded-[2rem] bg-surface-elevated">
                            {modelInfo.features.slice(0, 15).map((f, i) => (
                                <span key={i} className="px-4 py-2 bg-surface border border-border shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/40 transition-colors cursor-default">
                                    {f.replace(/_/g, ' ')}
                                </span>
                            ))}
                            {modelInfo.features.length > 15 && (
                                <span className="px-4 py-2 bg-surface border border-border shadow-inner rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted">
                                    +{modelInfo.features.length - 15} more variables
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Sessions */}
            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border overflow-hidden">
                <div className="px-10 py-8 border-b border-border bg-surface-alt flex items-center justify-between">
                    <h3 className="text-3xl font-black text-text tracking-tight">Recent Sessions</h3>
                </div>
                {(data?.engagement?.recent || []).length === 0 ? (
                    <div className="p-16 text-center text-text-muted font-bold text-xl border-t border-border bg-surface/50">No sessions recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-surface-elevated text-text-muted font-black text-xs uppercase tracking-widest border-b border-border">
                                <tr>
                                    <th className="px-10 py-6">Date</th>
                                    <th className="px-10 py-6">Engagement Score</th>
                                    <th className="px-10 py-6">ICAP Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.engagement.recent.map((s, i) => (
                                    <tr key={i} className="hover:bg-surface-alt transition-colors">
                                        <td className="px-10 py-6 text-text-secondary font-bold text-base">{new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-3 flex-shrink-0 bg-surface-elevated rounded-full overflow-hidden border border-border shadow-inner">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${
                                                        (s.score || 0) >= 70 ? 'bg-success' : (s.score || 0) >= 40 ? 'bg-warning' : 'bg-danger'
                                                    }`} style={{ width: `${s.score || 0}%` }} />
                                                </div>
                                                <span className="font-black text-xl text-text">
                                                    {s.score?.toFixed(0) || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <ICAPBadge level={s.icap || 'passive'} size="md" />
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
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12 flex flex-col hover:border-accent/40 transition-colors">
                    <h3 className="text-3xl font-black text-text tracking-tight mb-10 flex items-center gap-4">
                        <div className="p-4 bg-accent-light text-accent rounded-2xl shadow-inner border border-accent/20"><Bot size={32} /></div> AI Tutor Usage
                    </h3>
                    <div className="flex-1 bg-surface-alt rounded-[2rem] border-2 border-border p-12 flex flex-col items-center justify-center text-center shadow-inner">
                        <div className="text-8xl font-black text-accent mb-6 tracking-tighter drop-shadow-sm">{data?.tutor_usage?.messages_sent || 0}</div>
                        <div className="text-sm font-black text-text-secondary uppercase tracking-widest">Total Messages Sent</div>
                    </div>
                </div>

                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12 flex flex-col hover:border-info/40 transition-colors">
                    <h3 className="text-3xl font-black text-text tracking-tight mb-10 flex items-center gap-4">
                        <div className="p-4 bg-info-light text-info rounded-2xl shadow-inner border border-info/20"><Download size={32} /></div> Recent Downloads
                    </h3>
                    {(data?.recent_downloads || []).length === 0 ? (
                        <div className="flex-1 p-12 bg-surface-alt border-2 border-dashed border-border rounded-[2rem] text-center text-text-muted font-bold flex items-center justify-center">No resources downloaded yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {data.recent_downloads.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-6 bg-surface-elevated border border-border shadow-sm rounded-2xl hover:border-info/30 hover:bg-surface transition-all group">
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 flex items-center justify-center bg-surface border border-border shadow-sm text-text-secondary rounded-xl font-black text-xs uppercase group-hover:text-info group-hover:border-info/20 transition-colors">{d.file_type}</div>
                                        <div className="font-bold text-text text-lg group-hover:text-info transition-colors truncate max-w-[200px] sm:max-w-xs">{d.file_name}</div>
                                    </div>
                                    <div className="text-text-muted font-bold text-xs uppercase tracking-widest shrink-0">
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
