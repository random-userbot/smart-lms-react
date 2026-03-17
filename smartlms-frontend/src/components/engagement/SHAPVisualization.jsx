import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const FEATURE_LABELS = {
    gaze_score: 'Gaze Direction',
    head_pose_stability: 'Head Stability',
    head_pose_yaw: 'Head Yaw',
    head_pose_pitch: 'Head Pitch',
    head_pose_roll: 'Head Roll',
    eye_aspect_ratio: 'Eye Openness',
    blink_rate: 'Blink Rate',
    mouth_openness: 'Mouth Movement',
    au01_inner_brow_raise: 'Inner Brow Raise',
    au02_outer_brow_raise: 'Outer Brow Raise',
    au04_brow_lowerer: 'Brow Furrow',
    au06_cheek_raiser: 'Cheek Raiser',
    au12_lip_corner_puller: 'Smile',
    au15_lip_corner_depressor: 'Frown',
    au25_lips_part: 'Lips Part',
    au26_jaw_drop: 'Jaw Drop',
    keyboard_activity_pct: 'Keyboard Activity',
    mouse_activity_pct: 'Mouse Activity',
    tab_visible_pct: 'Tab Focus',
    playback_speed_avg: 'Playback Speed',
    note_taking_pct: 'Note Taking',
    gaze_variance: 'Gaze Stability',
    head_stability_variance: 'Head Movement',
    blink_rate_variance: 'Blink Irregularity',
    gaze_direction: 'Gaze Direction',
    head_stability: 'Head Stability',
    eye_openness: 'Eye Openness',
    tab_focus: 'Tab Focus',
    keyboard_activity: 'Keyboard Activity',
    note_taking: 'Note Taking',
};

function getFeatureLabel(name) {
    return FEATURE_LABELS[name] || name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function SHAPWaterfall({ shapData, dimension = 'engagement', maxFeatures = 8 }) {
    const chartData = useMemo(() => {
        if (!shapData) return [];
        const featureContributions = dimension && shapData[dimension]
            ? shapData[dimension]
            : (shapData.feature_contributions?.[dimension] || shapData);
        if (!featureContributions || typeof featureContributions !== 'object') return [];
        return Object.entries(featureContributions)
            .filter(([, val]) => typeof val === 'number' && val !== 0)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, maxFeatures)
            .map(([feature, value]) => ({
                name: getFeatureLabel(feature),
                value: parseFloat(value.toFixed(3)),
                positive: value > 0,
            }));
    }, [shapData, dimension, maxFeatures]);

    if (!chartData.length) {
        return (
            <div className="text-center py-8 text-text-muted text-sm">
                <Info size={24} className="mx-auto mb-2 opacity-50" />
                No SHAP data available
            </div>
        );
    }

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontWeight: 500 }} width={110} />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            color: 'var(--color-text)',
                            fontSize: '13px',
                            fontWeight: 500,
                            boxShadow: 'var(--shadow-lg)',
                        }}
                        formatter={(value) => [`${value > 0 ? '+' : ''}${value.toFixed(3)}`, 'Contribution']}
                    />
                    <ReferenceLine x={0} stroke="var(--color-text-muted)" strokeWidth={1} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {chartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.positive ? 'var(--color-success)' : 'var(--color-danger)'} fillOpacity={0.85} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function TopFactors({ factors }) {
    if (!factors?.length) return null;
    return (
        <div className="space-y-2">
            {factors.slice(0, 6).map((factor, idx) => {
                const label = getFeatureLabel(factor.feature);
                const importance = factor.importance || 0;
                const maxImp = Math.max(...factors.map(f => f.importance || 0), 0.01);
                const pct = (importance / maxImp) * 100;
                return (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-text-secondary w-28 truncate" title={label}>{label}</span>
                        <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-text-muted w-12 text-right tabular-nums">{importance.toFixed(3)}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function FuzzyRulesList({ rules }) {
    if (!rules?.length) return null;
    const severityColors = {
        high: 'bg-danger-light border-danger/20 text-danger',
        medium: 'bg-warning-light border-warning/20 text-warning',
        positive: 'bg-success-light border-success/20 text-success',
    };
    const severityIcons = {
        high: <TrendingDown size={14} />,
        medium: <Minus size={14} />,
        positive: <TrendingUp size={14} />,
    };
    return (
        <div className="space-y-2">
            {rules.map((rule, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border text-xs font-medium ${severityColors[rule.severity] || 'bg-surface-elevated border-border text-text-secondary'}`}>
                    <span className="mt-0.5 flex-shrink-0">{severityIcons[rule.severity] || <Info size={14} />}</span>
                    <div>
                        <div className="font-mono text-[10px] opacity-70 mb-1">{rule.rule}</div>
                        <div className="font-semibold">{rule.suggestion}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function EngagementGauge({ score, label, size = 64 }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(score, 100) / 100) * circumference;
    const getColor = (score) => {
        if (score >= 70) return 'var(--color-success)';
        if (score >= 40) return 'var(--color-warning)';
        return 'var(--color-danger)';
    };
    const color = getColor(score);

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={4} />
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
                        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                        className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black" style={{ fontSize: size * 0.22, color }}>
                    {Math.round(score)}
                </div>
            </div>
            {label && <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</span>}
        </div>
    );
}
