import React, { useState, useEffect, useCallback } from 'react';
import { 
    Clock, AlertTriangle, CheckCircle, Send, ArrowRight 
} from 'lucide-react';
import { quizzesAPI, gamificationAPI } from '../../api/client';

export default function QuizPhase({ quiz, onComplete }) {
    const [answers, setAnswers] = useState({});
    const [violations, setViolations] = useState([]);
    const [timeLeft, setTimeLeft] = useState(quiz.time_limit || 600);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = useCallback(async () => {
        if (submitted) return;
        setSubmitted(true);

        try {
            const res = await quizzesAPI.submitAttempt({
                quiz_id: quiz.id,
                answers,
                violations,
                started_at: new Date().toISOString(),
                time_spent: (quiz.time_limit || 600) - timeLeft,
            });
            console.log('✅ Quiz submitted successfully:', res.data);
            setResult(res.data);
            try { 
                await gamificationAPI.awardPoints('quiz_complete', 15); 
                console.log('✅ Quiz complete points awarded');
            } catch (e) { 
                console.warn("Quiz score award failed:", e); 
            }
        } catch (err) {
            console.error('❌ Quiz submit error:', err);
        }
    }, [submitted, quiz.id, quiz.time_limit, answers, violations, timeLeft]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [handleSubmit]);

    useEffect(() => {
        const handler = () => {
            if (document.hidden) {
                setViolations(prev => [...prev, { type: 'tab_switch', timestamp: new Date().toISOString(), details: 'Left quiz tab' }]);
            }
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setViolations(prev => [...prev, { type: 'copy_paste', timestamp: new Date().toISOString(), details: 'Paste attempted' }]);
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, []);

    // Auto-navigate to feedback when result is ready
    useEffect(() => {
        if (result) {
            const timer = setTimeout(() => {
                console.log('📝 Quiz complete, moving to feedback...');
                onComplete?.();
            }, 3000); // Show result for 3 seconds before transitioning
            return () => clearTimeout(timer);
        }
    }, [result, onComplete]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (result) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-surface-alt px-6 py-16 md:py-24 animate-in fade-in slide-in-from-bottom-4">
                <div className="max-w-3xl mx-auto bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-16 text-center text-text relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700 -translate-y-8 translate-x-8"><CheckCircle size={300} /></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="p-6 bg-success-light text-success rounded-full mb-8 inline-flex border border-success/20 shadow-sm">
                            <CheckCircle size={64} strokeWidth={2.5}/>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-text mb-4 tracking-tight">Quiz Complete!</h2>

                        <div className="text-[6rem] md:text-[8rem] font-black text-accent tracking-tighter my-8 drop-shadow-sm leading-none">
                            {result.percentage.toFixed(0)}<span className="text-5xl md:text-6xl items-start">%</span>
                        </div>
                        <div className="text-xl font-black text-text-secondary uppercase tracking-widest bg-surface-alt px-10 py-4 rounded-3xl border border-border mb-12 shadow-sm">
                            {result.score} / {result.max_score} Points Earned
                        </div>

                        {violations.length > 0 && (
                            <div className="mb-12 w-full max-w-lg bg-warning-light border border-warning/30 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3 text-warning font-black uppercase tracking-wide"><AlertTriangle size={24} /> Proctoring Alert</div>
                                <span className="bg-surface text-warning px-4 py-2 rounded-xl text-sm font-black border border-warning/20 shadow-sm">Integrity: {result.integrity_score.toFixed(0)}%</span>
                            </div>
                        )}

                        <button className="btn btn-primary btn-lg shadow-accent px-12 py-5 text-xl w-full max-w-sm"
                            onClick={onComplete}>
                            Continue to Feedback <ArrowRight size={24} className="ml-2"/>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-surface-alt py-10 md:py-14 animate-in fade-in relative overflow-hidden">
            <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-52 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

            <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-8 relative z-10">
                <div className="bg-linear-to-br from-primary to-accent text-white rounded-4xl border border-white/20 p-8 md:p-10 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/80 mb-4">
                                Quiz Session
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">{quiz.title}</h2>
                        </div>
                        <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black tracking-widest text-2xl border ${timeLeft < 60 ? 'bg-danger-light/90 text-danger border-danger/30 animate-pulse w-full md:w-auto' : timeLeft < 120 ? 'bg-warning-light/90 text-warning border-warning/30 w-full md:w-auto' : 'bg-white/15 text-white border-white/25 w-full md:w-auto'}`}>
                            <Clock size={28} /> {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-white/75">Questions</div>
                            <div className="text-2xl font-black mt-1">{quiz.questions?.length || 0}</div>
                        </div>
                        <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-white/75">Status</div>
                            <div className="text-xl font-black mt-1">In Progress</div>
                        </div>
                        <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-white/75">Integrity Watch</div>
                            <div className="text-xl font-black mt-1">{violations.length} Alert{violations.length === 1 ? '' : 's'}</div>
                        </div>
                    </div>
                </div>

                {violations.length > 0 && (
                    <div className="p-5 bg-danger-light border border-danger/30 rounded-2xl text-danger text-base font-black flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={24} className="text-danger" /> {violations.length} Integrity violation(s) detected. Stay on this tab and do not paste.
                    </div>
                )}

                <div className="glass-premium rounded-4xl border border-border/60 p-5 md:p-7">
                    <div className="space-y-8 md:space-y-10">
                        {quiz.questions.map((q, i) => (
                            <div key={i} className="bg-surface rounded-[1.75rem] shadow-sm border border-border overflow-hidden group">
                                <div className="p-7 md:p-9 border-b border-border bg-surface-alt">
                                    <div className="flex flex-wrap items-center gap-3 mb-5">
                                        <span className="bg-accent-light text-accent border border-accent/20 font-black uppercase tracking-widest text-xs px-4 py-1.5 rounded-xl">Question {i + 1}</span>
                                        <span className="bg-surface border border-border text-text-secondary font-black uppercase tracking-widest text-xs px-4 py-1.5 rounded-xl shadow-sm">{q.icap_level || 'active'}</span>
                                        <span className="bg-surface border border-border text-text-muted font-bold uppercase tracking-widest text-xs px-4 py-1.5 rounded-xl shadow-sm">{q.type.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-xl md:text-2xl font-bold text-text leading-relaxed tracking-tight group-hover:text-accent transition-colors">
                                        {q.question}
                                    </p>
                                </div>

                                <div className="p-7 md:p-9">
                                    {q.type === 'mcq' || q.type === 'true_false' ? (
                                        <div className="flex flex-col gap-4">
                                            {(q.options || ['True', 'False']).map((opt, j) => {
                                                const isSelected = answers[String(i)] === opt;
                                                return (
                                                    <label key={j} className={`group/opt flex items-center gap-5 p-5 md:p-6 rounded-2xl cursor-pointer transition-all border-2 shadow-sm ${isSelected ? 'border-accent bg-accent-light shadow-md' : 'border-border bg-surface hover:border-accent/40 hover:bg-surface-alt'}`}>
                                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-accent bg-accent' : 'border-border group-hover/opt:border-accent/60 bg-surface'}`}>
                                                            {isSelected && <div className="w-3.5 h-3.5 bg-white rounded-full scale-in-center shadow-sm" />}
                                                        </div>
                                                        <input type="radio" className="hidden" value={opt} checked={isSelected} onChange={() => setAnswers({ ...answers, [String(i)]: opt })} />
                                                        <span className={`font-bold text-lg md:text-xl ${isSelected ? 'text-accent' : 'text-text-secondary group-hover/opt:text-text'}`}>{opt}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : q.type === 'fill_in_blank' ? (
                                        <div className="text-xl font-medium text-text leading-12">
                                            {q.question.split('___').map((part, pIdx, arr) => (
                                                <React.Fragment key={pIdx}>
                                                    {part}
                                                    {pIdx < arr.length - 1 && (
                                                        <input type="text"
                                                            className="inline-block mx-3 px-5 py-2 border-b-2.5 border-text-muted bg-surface-alt focus:bg-accent-light focus:border-accent outline-none w-40 md:w-56 text-center text-accent font-black rounded-t-xl transition-colors placeholder-text-muted"
                                                            placeholder="..."
                                                            value={answers[String(i)]?.[pIdx] || ''}
                                                            onChange={(e) => {
                                                                const newAns = [...(answers[String(i)] || [])];
                                                                newAns[pIdx] = e.target.value;
                                                                setAnswers({ ...answers, [String(i)]: newAns });
                                                            }}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea className="w-full p-6 rounded-2xl border-2 border-border focus:border-accent focus:ring-4 focus:ring-accent/20 outline-none min-h-50 resize-y text-text font-medium text-xl leading-relaxed bg-surface-alt focus:bg-surface transition-all shadow-inner placeholder-text-muted"
                                            placeholder="Write your detailed explanation or answer here..."
                                            value={answers[String(i)] || ''}
                                            onChange={e => setAnswers({ ...answers, [String(i)]: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="btn btn-primary btn-lg shadow-accent mt-10 w-full max-w-3xl mx-auto flex items-center justify-center py-6 text-2xl" onClick={handleSubmit}>
                        <Send size={28} className="mr-3 animate-pulse" /> Submit Quiz Answers
                    </button>
                </div>
            </div>
        </div>
    );
}
