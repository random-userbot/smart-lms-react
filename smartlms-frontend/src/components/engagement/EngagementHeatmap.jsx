import { useState, useEffect, useMemo } from 'react';
import { engagementAPI } from '../../api/client';
import { Flame, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

/**
 * Engagement Heatmap Component
 * Visualizes engagement intensity across lecture time segments.
 * 
 * Based on: "Designing an Explainable Multimodal Engagement Model"
 * - High-intensity (warm) = engaged; Low (cool) = disengaged
 * - Highlights "pain points" where students struggle
 */

function getHeatColor(intensity) {
    // Cool (blue) to Warm (green to red)
    if (intensity >= 0.7) return { bg: 'bg-emerald-500', text: 'text-emerald-800', ring: 'ring-emerald-200' };
    if (intensity >= 0.5) return { bg: 'bg-amber-400', text: 'text-amber-800', ring: 'ring-amber-200' };
    if (intensity >= 0.3) return { bg: 'bg-orange-500', text: 'text-orange-800', ring: 'ring-orange-200' };
    return { bg: 'bg-rose-500', text: 'text-rose-800', ring: 'ring-rose-200' };
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function EngagementHeatmap({ lectureId, height = 48 }) {
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredSegment, setHoveredSegment] = useState(null);

    useEffect(() => {
        if (!lectureId) return;
        setLoading(true);
        engagementAPI.getHeatmap(lectureId)
            .then(res => setHeatmapData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [lectureId]);

    if (loading) {
        return (
            <div className="w-full h-12 bg-slate-100 rounded-xl animate-pulse" />
        );
    }

    if (!heatmapData?.segments?.length) {
        return (
            <div className="text-center py-4 text-slate-400 text-xs font-medium">
                No engagement heatmap data yet
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            {/* Heatmap bar */}
            <div className="relative">
                <div className="flex gap-0.5 rounded-xl overflow-hidden" style={{ height }}>
                    {heatmapData.segments.map((seg, idx) => {
                        const color = getHeatColor(seg.intensity);
                        return (
                            <div
                                key={idx}
                                className={`flex-1 ${color.bg} cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-y-110 origin-bottom relative`}
                                style={{ opacity: 0.4 + seg.intensity * 0.6 }}
                                onMouseEnter={() => setHoveredSegment(idx)}
                                onMouseLeave={() => setHoveredSegment(null)}
                            >
                                {hoveredSegment === idx && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                                        <div className="bg-slate-900 text-white text-[10px] font-bold rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                                            <div className="text-slate-300 mb-0.5">
                                                {formatTime(seg.start_time)} - {formatTime(seg.end_time)}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-emerald-400">Eng: {seg.engagement}%</span>
                                                <span className="text-amber-400">Bore: {seg.boredom}%</span>
                                                <span className="text-rose-400">Conf: {seg.confusion}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Time labels */}
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">0:00</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {formatTime(heatmapData.duration || 0)}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-rose-500 opacity-60" /> Low
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-400 opacity-70" /> Medium
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-500 opacity-90" /> High
                </div>
            </div>

            {/* Pain points */}
            {heatmapData.pain_points?.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber-500" />
                        Pain Points
                    </div>
                    {heatmapData.pain_points.slice(0, 3).map((pp, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border ${pp.severity === 'high'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                            <Clock size={12} />
                            <span>{pp.time_range}</span>
                            <span className="text-[10px] opacity-70">
                                ({pp.issue === 'high_confusion' ? 'Students confused' : 'Low engagement'})
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary stats */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                    <Flame size={12} className="inline mr-1 text-orange-400" />
                    Avg: <strong className="text-slate-700">{heatmapData.avg_engagement}%</strong>
                </span>
                <span className="font-medium">
                    <TrendingUp size={12} className="inline mr-1 text-emerald-400" />
                    Views: <strong className="text-slate-700">{heatmapData.total_views}</strong>
                </span>
            </div>
        </div>
    );
}


export function ICAPBadge({ level, size = 'md' }) {
    const config = {
        interactive: {
            label: 'Interactive',
            color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: '🤝',
            description: 'Highest learning mode - collaborating & discussing',
        },
        constructive: {
            label: 'Constructive',
            color: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '📝',
            description: 'Generating output - notes, summaries, questions',
        },
        active: {
            label: 'Active',
            color: 'bg-amber-100 text-amber-700 border-amber-200',
            icon: '👁️',
            description: 'Attentive watching & following along',
        },
        passive: {
            label: 'Passive',
            color: 'bg-slate-100 text-slate-600 border-slate-200',
            icon: '😶',
            description: 'Minimal engagement - just watching',
        },
    };

    const c = config[level] || config.passive;
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${c.color} ${sizeClasses[size]}`}
            title={c.description}
        >
            <span>{c.icon}</span>
            <span>{c.label}</span>
        </span>
    );
}


export function ICAPProgressBar({ distribution }) {
    if (!distribution) return null;

    const levels = ['interactive', 'constructive', 'active', 'passive'];
    const colors = {
        interactive: 'bg-emerald-500',
        constructive: 'bg-blue-500',
        active: 'bg-amber-400',
        passive: 'bg-slate-300',
    };
    const labels = {
        interactive: 'I',
        constructive: 'C',
        active: 'A',
        passive: 'P',
    };

    const total = levels.reduce((sum, l) => sum + (distribution[l] || 0), 0) || 1;

    return (
        <div className="w-full space-y-2">
            {/* Stacked bar */}
            <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                {levels.map(level => {
                    const count = distribution[level] || 0;
                    const pct = (count / total) * 100;
                    if (pct === 0) return null;
                    return (
                        <div
                            key={level}
                            className={`${colors[level]} transition-all duration-500 flex items-center justify-center`}
                            style={{ width: `${pct}%` }}
                            title={`${level}: ${count} (${pct.toFixed(0)}%)`}
                        >
                            {pct > 12 && (
                                <span className="text-[9px] font-black text-white">
                                    {labels[level]}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] font-semibold">
                {levels.map(level => {
                    const count = distribution[level] || 0;
                    return (
                        <div key={level} className="flex items-center gap-1.5 text-slate-500">
                            <div className={`w-2 h-2 rounded-full ${colors[level]}`} />
                            <span className="capitalize">{level}</span>
                            <span className="text-slate-400">({count})</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
