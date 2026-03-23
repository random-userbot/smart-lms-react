import { useState, useEffect } from 'react';
import { engagementAPI } from '../../api/client';
import { Flame, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

function getHeatColor(intensity) {
    if (intensity >= 0.7) return { bg: 'bg-success', text: 'text-success' };
    if (intensity >= 0.5) return { bg: 'bg-warning', text: 'text-warning' };
    if (intensity >= 0.3) return { bg: 'bg-warning', text: 'text-warning' };
    return { bg: 'bg-danger', text: 'text-danger' };
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function EngagementHeatmap({ lectureId, height = 48, scope = 'lecture', autoRefreshMs = 12000 }) {
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredSegment, setHoveredSegment] = useState(null);

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

    if (loading) return <div className="w-full h-12 bg-surface-elevated rounded-xl skeleton" />;
    if (!heatmapData?.segments?.length) return <div className="text-center py-4 text-text-muted text-xs font-medium">No engagement heatmap data yet</div>;

    return (
        <div className="w-full space-y-3">
            <div className="relative">
                <div className="flex gap-0.5 rounded-xl overflow-hidden" style={{ height }}>
                    {heatmapData.segments.map((seg, idx) => {
                        const color = getHeatColor(seg.intensity);
                        return (
                            <div key={idx} className={`flex-1 ${color.bg} cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-y-110 origin-bottom relative`}
                                style={{ opacity: 0.4 + seg.intensity * 0.6 }}
                                onMouseEnter={() => setHoveredSegment(idx)}
                                onMouseLeave={() => setHoveredSegment(null)}>
                                {hoveredSegment === idx && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                                        <div className="bg-surface text-text text-[10px] font-bold rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-border">
                                            <div className="text-text-muted mb-0.5">{formatTime(seg.start_time)} - {formatTime(seg.end_time)}</div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-success">Eng: {seg.engagement}%</span>
                                                <span className="text-warning">Bore: {seg.boredom}%</span>
                                                <span className="text-danger">Conf: {seg.confusion}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-text-muted font-medium">0:00</span>
                    <span className="text-[10px] text-text-muted font-medium">{formatTime(heatmapData.duration || 0)}</span>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-text-muted font-semibold">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-danger opacity-60" /> Low</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-warning opacity-70" /> Medium</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success opacity-90" /> High</div>
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

            <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-medium"><Flame size={12} className="inline mr-1 text-warning" /> Avg: <strong className="text-text">{heatmapData.avg_engagement}%</strong></span>
                <span className="font-medium"><TrendingUp size={12} className="inline mr-1 text-success" /> Views: <strong className="text-text">{heatmapData.total_views}</strong></span>
            </div>
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
