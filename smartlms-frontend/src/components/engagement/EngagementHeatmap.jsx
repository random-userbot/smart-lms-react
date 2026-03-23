import { useState, useEffect } from 'react';
import { engagementAPI } from '../../api/client';
import { Flame, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

function getHeatColor(intensity) {
    if (intensity >= 0.7) return { bg: 'bg-success', text: 'text-success' };
    if (intensity >= 0.5) return { bg: 'bg-warning', text: 'text-warning' };
    if (intensity >= 0.3) return { bg: 'bg-warning', text: 'text-warning' };
    return { bg: 'bg-danger', text: 'text-danger' };
}

function getIntensityLabel(intensity) {
    if (intensity >= 0.7) return 'High';
    if (intensity >= 0.4) return 'Medium';
    return 'Low';
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function EngagementHeatmap({ lectureId, height = 48, scope = 'lecture', autoRefreshMs = 12000 }) {
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!lectureId) return;
        let isMounted = true;

        const load = async (isInitial = false) => {
            if (isInitial) setLoading(true);
            try {
                const res = scope === 'student'
                    ? await engagementAPI.getMyHeatmap(lectureId)
                    : await engagementAPI.getHeatmap(lectureId);
                if (isMounted) setHeatmapData(res.data);
            } catch {
                if (isMounted) setHeatmapData(null);
            } finally {
                if (isMounted && isInitial) setLoading(false);
            }
        };

        load(true);
        const timer = setInterval(() => load(false), Math.max(autoRefreshMs, 5000));

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [lectureId, scope, autoRefreshMs]);

    if (loading) return <div className="w-full h-28 bg-surface-elevated rounded-2xl skeleton" />;
    if (!heatmapData?.segments?.length) return <div className="text-center py-4 text-text-muted text-xs font-medium">No engagement heatmap data yet</div>;

    const chartData = heatmapData.segments.map((seg, idx) => {
        const mid = (seg.start_time + seg.end_time) / 2;
        return {
            index: idx,
            t: mid,
            engagement: Number(seg.engagement || 0),
            boredom: Number(seg.boredom || 0),
            confusion: Number(seg.confusion || 0),
            frustration: Number(seg.frustration || 0),
            intensity: Number(seg.intensity || 0),
            start: seg.start_time,
            end: seg.end_time,
        };
    });

    const first = chartData[0] || null;
    const last = chartData[chartData.length - 1] || null;
    const delta = first && last ? (last.engagement - first.engagement) : 0;
    const avgEngagement = Number(heatmapData.avg_engagement || 0);
    const avgBoredom = chartData.reduce((sum, d) => sum + d.boredom, 0) / chartData.length;
    const avgConfusion = chartData.reduce((sum, d) => sum + d.confusion, 0) / chartData.length;
    const avgFrustration = chartData.reduce((sum, d) => sum + d.frustration, 0) / chartData.length;

    const WaveTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const point = payload[0].payload;
        const color = getHeatColor(point.intensity);

        return (
            <div className="bg-surface text-text text-[11px] font-bold rounded-xl px-3 py-2 shadow-xl border border-border min-w-40">
                <div className="text-text-muted mb-1">{formatTime(point.start)} - {formatTime(point.end)}</div>
                <div className="flex items-center justify-between gap-3"><span>Engagement</span><span className="text-success">{point.engagement.toFixed(0)}%</span></div>
                <div className="flex items-center justify-between gap-3"><span>Boredom</span><span className="text-danger">{point.boredom.toFixed(0)}%</span></div>
                <div className="flex items-center justify-between gap-3"><span>Confusion</span><span className="text-warning">{point.confusion.toFixed(0)}%</span></div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-wider">
                    <span className={`${color.text}`}>{getIntensityLabel(point.intensity)} intensity</span>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4 md:p-5 shadow-sm">
                <div className="w-full" style={{ height: Math.max(140, height * 2.8) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 6 }}>
                            <defs>
                                <linearGradient id={`engagementWave-${scope}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />

                            <XAxis
                                dataKey="t"
                                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                                tickFormatter={(v) => formatTime(v)}
                                domain={[0, heatmapData.duration || 0]}
                                type="number"
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                                width={32}
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                            />

                            <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" opacity={0.4} />
                            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" opacity={0.35} />

                            <Tooltip content={<WaveTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />

                            <Area
                                type="monotone"
                                dataKey="engagement"
                                stroke="#10b981"
                                strokeWidth={3}
                                fill={`url(#engagementWave-${scope})`}
                                dot={false}
                                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#ecfdf5' }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-success/25 bg-success-light px-3 py-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-success/80">Engagement</div>
                        <div className="text-xl font-black text-success leading-tight">{avgEngagement.toFixed(0)}%</div>
                    </div>
                    <div className="rounded-xl border border-danger/25 bg-danger-light px-3 py-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-danger/80">Boredom</div>
                        <div className="text-xl font-black text-danger leading-tight">{avgBoredom.toFixed(0)}%</div>
                    </div>
                    <div className="rounded-xl border border-warning/25 bg-warning-light px-3 py-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-warning/80">Confusion</div>
                        <div className="text-xl font-black text-warning leading-tight">{avgConfusion.toFixed(0)}%</div>
                    </div>
                    <div className="rounded-xl border border-orange-300 bg-orange-50 px-3 py-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-orange-600/80">Frustration</div>
                        <div className="text-xl font-black text-orange-600 leading-tight">{avgFrustration.toFixed(0)}%</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <div className="flex items-center gap-4 text-[10px] font-semibold">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-danger opacity-60" /> Low</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-warning opacity-70" /> Medium</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success opacity-90" /> High</div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="font-medium">
                        <Flame size={12} className="inline mr-1 text-warning" /> Avg: <strong className="text-text">{avgEngagement.toFixed(1)}%</strong>
                    </span>
                    <span className={`font-medium ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
                        <TrendingUp size={12} className="inline mr-1" /> Trend: <strong>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</strong>
                    </span>
                    <span className="font-medium"><TrendingUp size={12} className="inline mr-1 text-success" /> Views: <strong className="text-text">{heatmapData.total_views}</strong></span>
                </div>
            </div>

            {heatmapData.pain_points?.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-warning" /> Pain Points
                    </div>
                    {heatmapData.pain_points.slice(0, 3).map((pp, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border ${pp.severity === 'high' ? 'bg-danger-light border-danger/20 text-danger' : 'bg-warning-light border-warning/20 text-warning'}`}>
                            <Clock size={12} />
                            <span>{pp.time_range}</span>
                            <span className="text-[10px] opacity-70">({pp.issue === 'high_confusion' ? 'Students confused' : 'Low engagement'})</span>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}

export function ICAPBadge({ level, size = 'md' }) {
    const config = {
        interactive: { label: 'Interactive', color: 'bg-success-light text-success border-success/20', icon: '🤝' },
        constructive: { label: 'Constructive', color: 'bg-info-light text-info border-info/20', icon: '📝' },
        active: { label: 'Active', color: 'bg-warning-light text-warning border-warning/20', icon: '👁️' },
        passive: { label: 'Passive', color: 'bg-surface-elevated text-text-secondary border-border', icon: '😶' },
    };
    const c = config[level] || config.passive;
    const sizeClasses = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-3 py-1 text-xs', lg: 'px-4 py-1.5 text-sm' };

    return (
        <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${c.color} ${sizeClasses[size]}`}>
            <span>{c.icon}</span><span>{c.label}</span>
        </span>
    );
}

export function ICAPProgressBar({ distribution }) {
    if (!distribution) return null;
    const levels = ['interactive', 'constructive', 'active', 'passive'];
    const colors = { interactive: 'bg-success', constructive: 'bg-info', active: 'bg-warning', passive: 'bg-surface-elevated' };
    const labels = { interactive: 'I', constructive: 'C', active: 'A', passive: 'P' };
    const total = levels.reduce((sum, l) => sum + (distribution[l] || 0), 0) || 1;

    return (
        <div className="w-full space-y-2">
            <div className="flex h-4 rounded-full overflow-hidden bg-surface-elevated border border-border">
                {levels.map(level => {
                    const count = distribution[level] || 0;
                    const pct = (count / total) * 100;
                    if (pct === 0) return null;
                    return (
                        <div key={level} className={`${colors[level]} transition-all duration-500 flex items-center justify-center`}
                            style={{ width: `${pct}%` }} title={`${level}: ${count} (${pct.toFixed(0)}%)`}>
                            {pct > 12 && <span className="text-[9px] font-black text-white">{labels[level]}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] font-semibold">
                {levels.map(level => {
                    const count = distribution[level] || 0;
                    return (
                        <div key={level} className="flex items-center gap-1.5 text-text-muted">
                            <div className={`w-2 h-2 rounded-full ${colors[level]}`} />
                            <span className="capitalize">{level}</span>
                            <span className="text-text-muted">({count})</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
