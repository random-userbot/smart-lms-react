import React, { useState } from 'react';
import { 
    ThumbsUp, Star, Send, ArrowRight 
} from 'lucide-react';
import { feedbackAPI, gamificationAPI } from '../../api/client';

export default function FeedbackPhase({ lectureId, courseId, onComplete }) {
    const [form, setForm] = useState({
        overall_rating: 0, content_quality: 0, teaching_clarity: 0, pacing: 0,
        difficulty_level: 0, text: '', suggestions: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [nlpResult, setNlpResult] = useState(null);

    const handleSubmit = async () => {
        if (form.overall_rating === 0) return;
        try {
            const res = await feedbackAPI.submit({
                lecture_id: lectureId,
                course_id: courseId,
                ...form,
            });
            try { await gamificationAPI.awardPoints('feedback', 10); } catch (e) { console.warn("Feedback score award failed:", e); }
            setNlpResult(res.data);
            setSubmitted(true);
        } catch (err) {
            console.error('Feedback error:', err);
        }
    };

    const sentimentColors = {
        positive: { bg: 'bg-success-light border-success/20', text: 'text-success', icon: '😊', label: 'Positive' },
        negative: { bg: 'bg-danger-light border-danger/20', text: 'text-danger', icon: '😟', label: 'Negative' },
        neutral: { bg: 'bg-surface-elevated border-border', text: 'text-text-secondary', icon: '😐', label: 'Neutral' },
    };

    if (submitted) {
        const sentiment = nlpResult?.sentiment;
        const keywords = nlpResult?.keywords || [];
        const sc = sentimentColors[sentiment?.label || 'neutral'];

        return (
            <div className="max-w-2xl mx-auto px-6 py-16 animate-in fade-in slide-in-from-bottom-4 space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center p-8 bg-success-light text-success rounded-full mb-6 border border-success/20 shadow-sm">
                        <ThumbsUp size={64} strokeWidth={2.5}/>
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-black text-text tracking-tight mb-3">Feedback Submitted!</h2>
                    <p className="text-text-secondary text-lg font-medium">Our AI has analyzed your response. Here's what it found:</p>
                </div>

                {sentiment && (
                    <div className="bg-surface rounded-[2rem] border border-border shadow-sm p-8 space-y-6">
                        <h3 className="text-xl font-black text-text flex items-center gap-3">
                            <span className="p-2.5 bg-accent-light text-accent rounded-xl border border-accent/20">🧠</span>
                            NLP Sentiment Analysis
                        </h3>
                        <div className={`flex items-center gap-5 p-6 rounded-2xl border ${sc.bg}`}>
                            <span className="text-4xl">{sc.icon}</span>
                            <div className="flex-1">
                                <div className={`text-2xl font-black ${sc.text}`}>{sc.label} Sentiment</div>
                                <div className="flex gap-4 mt-3">
                                    {['positive', 'negative', 'neutral'].map(k => (
                                        <div key={k} className="flex-1">
                                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{k}</div>
                                            <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                        k === 'positive' ? 'bg-success' : k === 'negative' ? 'bg-danger' : 'bg-text-muted'
                                                    }`}
                                                    style={{ width: `${((sentiment[k] || 0) * 100).toFixed(0)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs font-bold text-text-muted mt-0.5">{((sentiment[k] || 0) * 100).toFixed(0)}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {keywords.length > 0 && (
                            <div>
                                <div className="text-sm font-black text-text-muted uppercase tracking-widest mb-3">Key Themes Extracted</div>
                                <div className="flex flex-wrap gap-3">
                                    {keywords.map((kw, i) => (
                                        <span key={i} className="px-4 py-2 bg-accent-light text-accent border border-accent/20 rounded-xl text-sm font-bold tracking-wide">
                                            #{kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <button className="btn btn-primary btn-lg shadow-accent w-full py-5 text-xl" onClick={onComplete}>
                    Continue to Dashboard <ArrowRight size={24} className="ml-2" />
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-12 animate-in fade-in">
            <div className="text-center md:text-left mb-10">
                <h2 className="text-4xl font-black text-text mb-4 tracking-tight">How was this lecture?</h2>
                <div className="inline-flex items-center gap-3 bg-success-light border border-success/30 px-5 py-2.5 rounded-2xl text-success text-sm font-black shadow-sm uppercase tracking-wide">
                    <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></span>
                    Your feedback is 100% anonymized.
                </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-14 mb-10 space-y-12">
                <div>
                    <label className="block text-2xl font-black text-text mb-6 text-center md:text-left tracking-tight">Overall Experience Rating</label>
                    <div className="flex justify-center md:justify-start gap-3">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setForm({ ...form, overall_rating: s })}
                                className="p-2 transition-transform hover:scale-110 focus:outline-none cursor-pointer">
                                <Star size={56}
                                    fill={s <= form.overall_rating ? '#f59e0b' : 'none'}
                                    color={s <= form.overall_rating ? '#f59e0b' : '#cbd5e1'}
                                    className={`transition-colors ${s <= form.overall_rating ? 'drop-shadow-sm scale-110' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full h-px bg-border"></div>

                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-text mb-6 flex items-center gap-4"><div className="w-1.5 h-8 bg-accent rounded-full"></div> Detailed Metrics</h3>
                    {[
                        { key: 'teaching_clarity', label: 'Clarity (Did you understand?)' },
                        { key: 'pacing', label: 'Pacing (Too fast or slow?)' },
                        { key: 'difficulty_level', label: 'Perceived Difficulty' },
                    ].map(({ key, label }) => (
                        <div key={key} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 bg-surface-alt rounded-2xl border border-border shadow-sm">
                            <label className="text-base font-bold text-text-secondary">{label}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setForm({ ...form, [key]: s })}
                                        className="p-1.5 focus:outline-none transition-transform hover:scale-110 cursor-pointer">
                                        <Star size={32}
                                            fill={s <= form[key] ? '#f59e0b' : 'none'}
                                            color={s <= form[key] ? '#f59e0b' : '#cbd5e1'} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full h-px bg-border"></div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-xl font-black text-text flex items-center gap-4"><div className="w-1.5 h-6 bg-accent rounded-full"></div> Your Feedback</label>
                        <textarea className="input min-h-[160px] resize-y placeholder-text-muted py-5 px-6 rounded-2xl text-lg shadow-inner bg-surface-alt focus:bg-surface border-2"
                            placeholder="What did you think about this lecture? Be honest!"
                            value={form.text}
                            onChange={e => setForm({ ...form, text: e.target.value })} />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xl font-black text-text flex items-center gap-4"><div className="w-1.5 h-6 bg-accent rounded-full"></div> Suggestions for Improvement</label>
                        <textarea className="input min-h-[140px] resize-y placeholder-text-muted py-5 px-6 rounded-2xl text-lg shadow-inner bg-surface-alt focus:bg-surface border-2"
                            placeholder="How could we make this lecture even better?"
                            value={form.suggestions}
                            onChange={e => setForm({ ...form, suggestions: e.target.value })} />
                    </div>
                </div>
            </div>

            <button className="btn btn-primary btn-lg shadow-accent w-full py-6 text-xl disabled:opacity-50 disabled:bg-border disabled:border-border disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
                onClick={handleSubmit} disabled={form.overall_rating === 0}>
                <Send size={24} className="mr-3" /> Submit Feedback Anonymously
            </button>
        </div>
    );
}
