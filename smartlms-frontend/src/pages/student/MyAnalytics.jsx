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

    if (loading) return <div className="page-container flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">My Analytics</h1>
                <p className="text-lg text-slate-500 font-medium mt-2">Track your learning progress, engagement, and achievements.</p>
            </div>

            {/* Hero Stats: Gauge + Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Engagement Gauge - takes 2 cols */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                    <EngagementGauge score={data?.engagement?.avg_score || 0} size={180} />
                    <div className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Overall Engagement</div>
                    {data?.engagement?.avg_score >= 70 ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            <Zap size={12} /> Highly Engaged Learner
                        </div>
                    ) : data?.engagement?.avg_score >= 40 ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                            <Target size={12} /> Building Momentum
                        </div>
                    ) : (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                            <TrendingUp size={12} /> Room to Grow
                        </div>
                    )}
                </div>

                {/* Stat cards - 3 cols */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center hover:border-emerald-300 transition-colors">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-4"><BarChart3 size={28} /></div>
                        <div className="text-4xl font-black text-slate-800 mb-2">{data?.quizzes?.avg_score?.toFixed(0) || 0}%</div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Avg Quiz Score</div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center hover:border-amber-300 transition-colors">
                        <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl mb-4"><Award size={28} /></div>
                        <div className="text-4xl font-black text-slate-800 mb-2">{gamification?.points || 0}</div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Points (Lvl {gamification?.level || 1})</div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center hover:border-violet-300 transition-colors">
                        <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl mb-4"><Brain size={28} /></div>
                        <div className="text-4xl font-black text-slate-800 mb-2">{data?.engagement?.total_sessions || 0}</div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Sessions</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ICAP distribution - enhanced */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">ICAP Distribution</h3>
                    <p className="text-sm text-slate-400 font-medium mb-8">Based on the ICAP framework (Chi & Wylie, 2014) — Interactive &gt; Constructive &gt; Active &gt; Passive</p>
                    {Object.entries(data?.icap_distribution || {}).length === 0 ? (
                        <div className="text-slate-500 font-medium p-8 bg-slate-50 rounded-2xl text-center">No ICAP data yet. Watch lectures to generate data.</div>
                    ) : (
                        <div className="space-y-6">
                            <ICAPProgressBar distribution={data?.icap_distribution} />
                            
                            <div className="mt-6 space-y-4">
                                {[
                                    { level: 'interactive', desc: 'Quiz (>70%), AI Tutor, Discussion, Messaging', emoji: '🤝' },
                                    { level: 'constructive', desc: 'Note-taking, Typing, Feedback, Annotations', emoji: '✏️' },
                                    { level: 'active', desc: 'Focused watching, Speed control, Click interaction', emoji: '👁️' },
                                    { level: 'passive', desc: 'Watching only, No interaction, Tab switches', emoji: '📺' },
                                ].map(({ level, desc, emoji }) => {
                                    const count = data?.icap_distribution?.[level] || 0;
                                    const total = Object.values(data?.icap_distribution || {}).reduce((a, b) => a + b, 1);
                                    const pct = (count / total * 100).toFixed(0);
                                    return (
                                        <div key={level} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <ICAPBadge level={level} size="sm" />
                                                <div className="text-[10px] text-slate-400 font-medium hidden sm:block max-w-[160px] truncate" title={desc}>
                                                    {emoji} {desc}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-600">{count} sessions</span>
                                                <span className="text-lg font-black text-slate-800">{pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Badges */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 flex flex-col">
                    <h3 className="text-2xl font-bold text-slate-900 mb-8">Achievements & Badges</h3>
                    <div className="flex-1">
                        <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4">Earned</h4>
                        {(gamification?.badges || []).length === 0 ? (
                            <div className="text-slate-500 font-medium mb-8 p-6 bg-slate-50 rounded-2xl text-center">No badges earned yet. Keep learning!</div>
                        ) : (
                            <div className="flex flex-wrap gap-3 mb-8">
                                {gamification.badges.map((badge, i) => (
                                    <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold">
                                        🏆 {badge.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4 mt-auto">Available to Unlock</h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(gamification?.available_badges || {}).map((b, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold">
                                    🔒 {b.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-3xl shadow-sm border border-violet-100 p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Sparkles size={200} /></div>
                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3 relative z-10">
                    <Sparkles className="text-violet-500" size={28} /> AI Learning Insights
                </h3>
                {(data?.insights || []).length === 0 ? (
                    <div className="text-slate-500 font-medium relative z-10 p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white">No insights available yet. Engage with more lectures!</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {data.insights.map((insight, i) => (
                            <div key={i} className="bg-white/80 backdrop-blur-md border border-violet-100 p-6 rounded-2xl shadow-sm text-slate-700 font-medium leading-relaxed flex gap-4">
                                <span className="text-violet-500 mt-1 flex-shrink-0"><Sparkles size={18} /></span>
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Model Transparency Card */}
            {modelInfo && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Info size={24} /></div>
                        How Your Engagement Is Measured
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Model Type</div>
                            <div className="text-lg font-black text-slate-800">{
                                modelInfo.model_type === 'v2_hybrid' ? 'XGBoost v2 + SHAP (DAiSEE)' :
                                modelInfo.model_type === 'xgboost_shap' ? 'XGBoost + SHAP' :
                                modelInfo.model_type === 'v2_binary' ? 'Binary XGBoost v2' :
                                'Enhanced Rule-Based'
                            }</div>
                            <div className="text-xs text-slate-500 mt-1 font-medium">{modelInfo.description || 'Explainable ML engagement model'}</div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Framework</div>
                            <div className="text-lg font-black text-slate-800">ICAP</div>
                            <div className="text-xs text-slate-500 mt-1 font-medium">Chi & Wylie (2014) — Interactive, Constructive, Active, Passive</div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Features Analyzed</div>
                            <div className="text-lg font-black text-slate-800">{modelInfo.features?.length || 24}</div>
                            <div className="text-xs text-slate-500 mt-1 font-medium">Gaze, head pose, AUs, behavioral signals</div>
                        </div>
                    </div>
                    {modelInfo.features?.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {modelInfo.features.slice(0, 12).map((f, i) => (
                                <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                    {f.replace(/_/g, ' ')}
                                </span>
                            ))}
                            {modelInfo.features.length > 12 && (
                                <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                    +{modelInfo.features.length - 12} more
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Sessions */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-2xl font-bold text-slate-900">Recent Sessions</h3>
                </div>
                {(data?.engagement?.recent || []).length === 0 ? (
                    <div className="p-10 text-center text-slate-500 font-medium">No sessions yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-white text-slate-400 font-extrabold text-xs uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-5">Date</th>
                                    <th className="px-10 py-5">Engagement Score</th>
                                    <th className="px-10 py-5">ICAP Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.engagement.recent.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-6 text-slate-600 font-medium">{new Date(s.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${
                                                        (s.score || 0) >= 70 ? 'bg-emerald-500' : (s.score || 0) >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                                                    }`} style={{ width: `${s.score || 0}%` }} />
                                                </div>
                                                <span className="font-black text-lg text-slate-800">
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
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 flex flex-col">
                    <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Bot size={24} /></div> AI Tutor Usage
                    </h3>
                    <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                        <div className="text-7xl font-black text-indigo-600 mb-4">{data?.tutor_usage?.messages_sent || 0}</div>
                        <div className="text-lg font-bold text-slate-500 uppercase tracking-widest">Total Messages Sent</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
                    <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Download size={24} /></div> Recent Downloads
                    </h3>
                    {(data?.recent_downloads || []).length === 0 ? (
                        <div className="p-10 bg-slate-50 rounded-2xl text-center text-slate-500 font-medium">No resources downloaded yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {data.recent_downloads.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-5 bg-white border border-slate-200 shadow-sm rounded-2xl hover:border-indigo-300 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase">{d.file_type}</div>
                                        <div className="font-bold text-slate-800 text-sm md:text-base">{d.file_name}</div>
                                    </div>
                                    <div className="text-slate-400 font-semibold text-sm">
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
