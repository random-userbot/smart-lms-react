import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, lecturesAPI, quizzesAPI } from '../../api/client';
import { ArrowLeft, ArrowRight, Check, RefreshCw, Sparkles, Loader2, Save, XCircle, MessageSquare, Brain, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function AIQuizGenerator() {
    const { courseId, lectureId } = useParams();
    const navigate = useNavigate();

    const [lecture, setLecture] = useState(null);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    // Config
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState('medium');

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [acceptedQuestions, setAcceptedQuestions] = useState(new Set());

    // Per-question feedback
    const [feedback, setFeedback] = useState('');
    const [regeneratingOne, setRegeneratingOne] = useState(false);

    // Saving
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [statusNotice, setStatusNotice] = useState(null);
    const [generationHint, setGenerationHint] = useState('');

    useEffect(() => {
        Promise.all([
            coursesAPI.get(courseId),
            lecturesAPI.get(lectureId),
        ]).then(([cRes, lRes]) => {
            setCourse(cRes.data);
            setLecture(lRes.data);
        }).finally(() => setLoading(false));
    }, [courseId, lectureId]);

    useEffect(() => {
        if (!statusNotice) return;
        const t = setTimeout(() => setStatusNotice(null), 3200);
        return () => clearTimeout(t);
    }, [statusNotice]);

    const handleGenerate = async () => {
        setGenerating(true);
        setGenerationHint('Preparing transcript and model context...');
        setQuestions([]);
        setCurrentIndex(0);
        setAcceptedQuestions(new Set());
        setSaved(false);
        setStatusNotice(null);

        let hintStep = 0;
        const hintCycle = [
            'Preparing transcript and model context...',
            'Generating ICAP-balanced questions...',
            'Validating answer format and explanations...',
        ];
        const intervalId = setInterval(() => {
            hintStep = (hintStep + 1) % hintCycle.length;
            setGenerationHint(hintCycle[hintStep]);
        }, 2300);

        try {
            const res = await quizzesAPI.generateAI({
                lecture_id: lectureId,
                num_questions: parseInt(numQuestions),
                difficulty,
                include_icap: true,
            });
            setQuestions(res.data.questions || []);
            setStatusNotice({ type: 'success', text: `Generated ${res.data.count || (res.data.questions || []).length} questions successfully.` });
        } catch (err) {
            setStatusNotice({ type: 'error', text: err.response?.data?.detail || 'Generation failed. Ensure the lecture has a transcript or YouTube URL.' });
        } finally {
            clearInterval(intervalId);
            setGenerating(false);
            setGenerationHint('');
        }
    };

    const handleAcceptQuestion = () => {
        setAcceptedQuestions(prev => new Set([...prev, currentIndex]));
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setFeedback('');
        }
    };

    const handleRegenerateQuestion = async () => {
        if (!feedback.trim()) {
            setStatusNotice({ type: 'error', text: 'Please provide feedback for the AI to regenerate this question.' });
            return;
        }
        setRegeneratingOne(true);
        setStatusNotice({ type: 'info', text: 'Regenerating current question based on your feedback...' });
        try {
            const currentQ = questions[currentIndex];
            const res = await quizzesAPI.refineAI({
                lecture_id: lectureId,
                current_questions: [currentQ],
                feedback: `Specifically for question "${currentQ.question}": ${feedback}. Only return exactly 1 improved question.`,
            });
            const refined = res.data.questions || [];
            if (refined.length > 0) {
                const updated = [...questions];
                updated[currentIndex] = refined[0];
                setQuestions(updated);
                setFeedback('');
                setStatusNotice({ type: 'success', text: 'Question regenerated successfully.' });
            } else {
                setStatusNotice({ type: 'error', text: 'AI returned no updated question. Try clearer feedback.' });
            }
        } catch (err) {
            setStatusNotice({ type: 'error', text: err.response?.data?.detail || 'Regeneration failed. Try again.' });
        } finally {
            setRegeneratingOne(false);
        }
    };

    const handleSaveQuiz = async () => {
        setSaving(true);
        setStatusNotice({ type: 'info', text: 'Saving quiz and publishing to enrolled students...' });
        try {
            await quizzesAPI.create({
                lecture_id: lectureId,
                title: `AI Quiz — ${lecture?.title || 'Lecture'}`,
                description: `AI-generated ${difficulty} quiz with ${questions.length} questions.`,
                questions: questions,
                time_limit: questions.length * 120,
                anti_cheat_enabled: true,
                webcam_required: true,
            });
            setSaved(true);
            setStatusNotice({ type: 'success', text: 'Quiz saved and published successfully.' });
        } catch (err) {
            setStatusNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to save quiz' });
        } finally {
            setSaving(false);
        }
    };

    const allAccepted = questions.length > 0 && acceptedQuestions.size === questions.length;
    const currentQ = questions[currentIndex];

    if (loading) return (
        <div className="page-container flex items-center justify-center min-h-[60vh]">
            <div className="spinner" />
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-72px)] bg-surface-alt w-full">
            {/* Header */}
            <div className="bg-surface border-b border-border px-6 md:px-12 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/manage-courses/${courseId}`)} className="w-10 h-10 rounded-xl bg-surface-alt flex items-center justify-center hover:bg-accent-light hover:text-accent transition-all text-text-muted">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-text tracking-tight flex items-center gap-3">
                            <Sparkles size={24} className="text-accent" />
                            AI Quiz Generator
                        </h1>
                        <p className="text-sm text-text-muted font-medium mt-1">
                            {course?.title} → <span className="text-text font-semibold">{lecture?.title}</span>
                        </p>
                    </div>
                </div>
                {questions.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-text-muted">
                            {acceptedQuestions.size}/{questions.length} accepted
                        </span>
                        <div className="w-32 h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(acceptedQuestions.size / questions.length) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>

            <div className="px-6 md:px-12 py-8 max-w-5xl mx-auto w-full">
                {statusNotice && (
                    <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-center gap-3 font-semibold ${statusNotice.type === 'success' ? 'bg-success-light border-success/30 text-success' : statusNotice.type === 'error' ? 'bg-danger-light border-danger/30 text-danger' : 'bg-info-light border-info/30 text-info'}`}>
                        {statusNotice.type === 'success' ? <CheckCircle size={18} /> : statusNotice.type === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
                        <span>{statusNotice.text}</span>
                    </div>
                )}

                {/* Config Phase */}
                {questions.length === 0 && !generating && !saved && (
                    <div className="bg-surface rounded-3xl border border-border p-8 md:p-12 shadow-sm">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-accent-light rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Brain size={36} className="text-accent" />
                            </div>
                            <h2 className="text-2xl font-black text-text mb-3">Configure Your Quiz</h2>
                            <p className="text-text-muted font-medium max-w-lg mx-auto">
                                The AI will auto-fetch the lecture transcript and generate questions aligned with the ICAP framework.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-10">
                            <div>
                                <label className="block text-sm font-black text-text mb-2">Number of Questions</label>
                                <select value={numQuestions} onChange={e => setNumQuestions(e.target.value)}
                                    className="input w-full !py-3.5 text-base font-semibold">
                                    {[3, 5, 7, 10, 15].map(n => (
                                        <option key={n} value={n}>{n} Questions</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-text mb-2">Difficulty Level</label>
                                <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                                    className="input w-full !py-3.5 text-base font-semibold">
                                    <option value="easy">Easy — Recall & Recognition</option>
                                    <option value="medium">Medium — Understanding & Application</option>
                                    <option value="hard">Hard — Analysis & Synthesis</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-center">
                            <button onClick={handleGenerate} className="btn btn-primary px-10 py-4 text-lg font-black rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3 mx-auto">
                                <Sparkles size={22} /> Generate Quiz
                            </button>
                        </div>
                    </div>
                )}

                {/* Generating Spinner */}
                {generating && (
                    <div className="bg-surface rounded-3xl border border-border p-16 shadow-sm text-center">
                        <div className="w-20 h-20 bg-accent-light rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Sparkles size={36} className="text-accent" />
                        </div>
                        <h2 className="text-2xl font-black text-text mb-3">Generating Your Quiz…</h2>
                        <p className="text-text-muted font-medium mb-3">AI is analyzing the transcript and creating questions.</p>
                        <p className="text-sm font-semibold text-text-secondary mb-6">{generationHint || 'Working...'}</p>
                        <Loader2 size={32} className="animate-spin text-accent mx-auto" />
                    </div>
                )}

                {/* Question Review: One-at-a-Time */}
                {questions.length > 0 && !saved && (
                    <div className="space-y-6">
                        {/* Question Navigation */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => { setCurrentIndex(i); setFeedback(''); }}
                                    className={`w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center ${
                                        i === currentIndex
                                            ? 'bg-accent text-white shadow-md scale-110'
                                            : acceptedQuestions.has(i)
                                            ? 'bg-success/20 text-success border border-success/30'
                                            : 'bg-surface border border-border text-text-muted hover:bg-surface-alt'
                                    }`}
                                >
                                    {acceptedQuestions.has(i) ? <Check size={16} /> : i + 1}
                                </button>
                            ))}
                        </div>

                        {/* Current Question Card */}
                        {currentQ && (
                            <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
                                <div className="bg-surface-alt px-8 py-5 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black text-accent">Q{currentIndex + 1}</span>
                                        <span className="text-xs font-black uppercase tracking-widest text-text-muted bg-surface px-3 py-1 rounded-lg border border-border">
                                            {currentQ.type || 'MCQ'}
                                        </span>
                                        {currentQ.icap_level && (
                                            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                                                currentQ.icap_level === 'interactive' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                currentQ.icap_level === 'constructive' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                currentQ.icap_level === 'active' ? 'bg-green-50 text-green-600 border-green-200' :
                                                'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                                {currentQ.icap_level}
                                            </span>
                                        )}
                                    </div>
                                    {acceptedQuestions.has(currentIndex) && (
                                        <span className="text-success font-bold text-sm flex items-center gap-1">
                                            <CheckCircle size={16} /> Accepted
                                        </span>
                                    )}
                                </div>

                                <div className="p-8 space-y-6">
                                    <h3 className="text-xl font-black text-text leading-relaxed">{currentQ.question}</h3>

                                    {/* Options */}
                                    {(currentQ.options || []).length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {currentQ.options.map((opt, oi) => {
                                                const letter = String.fromCharCode(65 + oi);
                                                const isCorrect = currentQ.correct_answer === opt || currentQ.correct_answer === letter;
                                                return (
                                                    <div key={oi} className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
                                                        isCorrect ? 'border-success bg-success/5' : 'border-border bg-surface-alt'
                                                    }`}>
                                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                                                            isCorrect ? 'bg-success text-white' : 'bg-border text-text-muted'
                                                        }`}>{letter}</span>
                                                        <span className="text-text font-medium pt-1">{opt}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Correct answer for non-MCQ */}
                                    {(!currentQ.options || currentQ.options.length === 0) && (
                                        <div className="p-4 rounded-2xl border-2 border-success bg-success/5 flex items-center gap-3">
                                            <Check size={20} className="text-success shrink-0" />
                                            <span className="font-bold text-text">Correct Answer: {currentQ.correct_answer}</span>
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    {currentQ.explanation && (
                                        <div className="p-4 rounded-2xl bg-accent-light border border-accent/20">
                                            <p className="text-sm font-bold text-accent mb-1">Explanation</p>
                                            <p className="text-sm text-text font-medium">{currentQ.explanation}</p>
                                        </div>
                                    )}

                                    {currentQ.fact_check && (
                                        <div className={`p-4 rounded-2xl border ${currentQ.fact_check.status === 'likely_true' ? 'bg-success-light border-success/30 text-success' : currentQ.fact_check.status === 'needs_review' ? 'bg-warning-light border-warning/30 text-warning' : 'bg-surface-alt border-border text-text-secondary'}`}>
                                            <p className="text-xs font-black uppercase tracking-widest mb-1">Fact Check</p>
                                            <p className="text-sm font-bold">Status: {String(currentQ.fact_check.status || 'unknown').replace('_', ' ')}</p>
                                            <p className="text-xs font-semibold mt-1">Confidence: {currentQ.fact_check.confidence || 'low'} · Source: {currentQ.fact_check.source || 'web'}</p>
                                            {currentQ.fact_check.note && <p className="text-xs mt-1.5 opacity-80">{currentQ.fact_check.note}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Feedback & Actions */}
                                <div className="px-8 pb-8 space-y-4">
                                    {/* Feedback Input */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Feedback: e.g. 'Make it harder' or 'Option B is wrong'"
                                                value={feedback}
                                                onChange={e => setFeedback(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && feedback.trim() && handleRegenerateQuestion()}
                                                className="input w-full !pl-11 !py-3.5 text-sm font-medium"
                                                disabled={regeneratingOne}
                                            />
                                        </div>
                                        <button
                                            onClick={handleRegenerateQuestion}
                                            disabled={!feedback.trim() || regeneratingOne}
                                            className="btn btn-secondary !px-5 !py-3.5 flex items-center gap-2 font-bold disabled:opacity-50"
                                        >
                                            {regeneratingOne ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                            Regenerate
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between pt-4 border-t border-border">
                                        <button
                                            onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFeedback(''); }}
                                            disabled={currentIndex === 0}
                                            className="btn btn-ghost !px-5 !py-3 flex items-center gap-2 disabled:opacity-30"
                                        >
                                            <ArrowLeft size={18} /> Previous
                                        </button>

                                        <div className="flex items-center gap-3">
                                            {!acceptedQuestions.has(currentIndex) && (
                                                <button onClick={handleAcceptQuestion} className="btn btn-primary !px-6 !py-3 flex items-center gap-2 font-black">
                                                    <Check size={18} /> Accept Question
                                                </button>
                                            )}

                                            {currentIndex < questions.length - 1 && (
                                                <button onClick={() => { setCurrentIndex(currentIndex + 1); setFeedback(''); }}
                                                    className="btn btn-ghost !px-5 !py-3 flex items-center gap-2"
                                                >
                                                    Next <ArrowRight size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        {allAccepted && (
                            <div className="bg-success/10 border-2 border-success/30 rounded-3xl p-8 text-center">
                                <CheckCircle size={40} className="text-success mx-auto mb-4" />
                                <h3 className="text-xl font-black text-text mb-2">All Questions Accepted!</h3>
                                <p className="text-text-muted font-medium mb-6">Your quiz is ready to be saved and published to students.</p>
                                <button onClick={handleSaveQuiz} disabled={saving} className="btn btn-primary !px-10 !py-4 text-lg font-black mx-auto flex items-center gap-3">
                                    {saving ? <Loader2 size={22} className="animate-spin" /> : <Save size={22} />}
                                    {saving ? 'Saving...' : 'Save Quiz'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Saved Confirmation */}
                {saved && (
                    <div className="bg-surface rounded-3xl border border-border p-16 shadow-sm text-center">
                        <div className="w-20 h-20 bg-success/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-success" />
                        </div>
                        <h2 className="text-2xl font-black text-text mb-3">Quiz Saved Successfully!</h2>
                        <p className="text-text-muted font-medium mb-8">The quiz is now available for students enrolled in this course.</p>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => navigate(`/manage-courses/${courseId}`)} className="btn btn-primary !px-8 !py-3.5 font-bold flex items-center gap-2">
                                <ArrowLeft size={18} /> Back to Course
                            </button>
                            <button onClick={() => { setQuestions([]); setSaved(false); setAcceptedQuestions(new Set()); }} className="btn btn-secondary !px-8 !py-3.5 font-bold flex items-center gap-2">
                                <Sparkles size={18} /> Generate Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
