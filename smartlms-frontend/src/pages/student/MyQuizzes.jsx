import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizzesAPI } from '../../api/client';
import { PlayCircle, Trophy, Layers, Clock3, Search } from 'lucide-react';

export default function MyQuizzes() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [quizzes, setQuizzes] = useState([]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError('');
        quizzesAPI.getMine()
            .then((res) => {
                if (!mounted) return;
                setQuizzes(res.data || []);
            })
            .catch((e) => {
                if (!mounted) return;
                setError(e?.response?.data?.detail || 'Failed to load quizzes');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const filtered = useMemo(() => {
        if (!query.trim()) return quizzes;
        const q = query.toLowerCase();
        return quizzes.filter((quiz) =>
            String(quiz.title || '').toLowerCase().includes(q)
            || String(quiz.course_title || '').toLowerCase().includes(q)
            || String(quiz.lecture_title || '').toLowerCase().includes(q)
        );
    }, [quizzes, query]);

    const openQuiz = (quiz) => {
        const watched = Boolean(quiz?.lecture_watched);
        if (watched) {
            navigate(`/lectures/${quiz.lecture_id}?phase=quiz&quizId=${quiz.id}`);
            return;
        }
        navigate(`/lectures/${quiz.lecture_id}?phase=lecture&quizId=${quiz.id}&gate=watch-required`);
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-surface-alt py-10 md:py-14 relative overflow-hidden">
            <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-52 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

            <div className="max-w-7xl mx-auto px-6 space-y-8 relative z-10">
            <div className="rounded-4xl bg-linear-to-br from-primary to-accent p-8 text-white relative overflow-hidden border border-white/20 shadow-lg">
                <div className="absolute -right-6 -top-6 opacity-15"><Trophy size={140} /></div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">My Quizzes</h1>
                <p className="text-white/85 mt-2 font-medium text-lg">Attempt quizzes from all your enrolled courses.</p>
            </div>

            <div className="glass-premium rounded-3xl p-4 flex items-center gap-3 shadow-sm border border-border/60">
                <Search size={18} className="text-text-muted" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by quiz title, course, or lecture"
                    className="w-full bg-transparent outline-none text-text placeholder-text-muted"
                />
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-danger-light text-danger font-semibold">
                    {error}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="bg-surface rounded-3xl p-10 text-center text-text-secondary font-semibold shadow-sm">
                    No quizzes found.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filtered.map((quiz) => (
                        <article key={quiz.id} className="glass-premium rounded-4xl p-6 shadow-sm border border-border/60 hover:border-accent/25 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-text leading-tight">{quiz.title}</h2>
                                    <p className="text-text-secondary mt-2 font-semibold">{quiz.course_title} • {quiz.lecture_title}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-accent-light text-accent">
                                    {quiz.questions?.length || 0} Qs
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-5">
                                <Stat icon={<Layers size={16} />} label="Attempts" value={String(quiz.attempt_count || 0)} />
                                <Stat icon={<Trophy size={16} />} label="Best" value={quiz.best_percentage != null ? `${quiz.best_percentage}%` : '-'} />
                                <Stat icon={<Clock3 size={16} />} label="Latest" value={quiz.latest_percentage != null ? `${quiz.latest_percentage}%` : '-'} />
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                                <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${quiz?.lecture_watched ? 'bg-success-light text-success border-success/25' : 'bg-warning-light text-warning border-warning/30'}`}>
                                    {quiz?.lecture_watched ? 'Ready to Reattempt' : 'Watch Lecture First'}
                                </span>
                                <span className="text-xs font-bold text-text-muted">
                                    Watched: {Math.floor(Number(quiz?.lecture_watch_seconds || 0) / 60)}m
                                </span>
                            </div>

                            <button
                                onClick={() => openQuiz(quiz)}
                                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full font-bold text-white bg-linear-to-r from-primary to-accent hover:brightness-110 transition"
                            >
                                <PlayCircle size={18} />
                                Attempt Quiz
                            </button>
                        </article>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}

function Stat({ icon, label, value }) {
    return (
        <div className="rounded-xl bg-surface-alt p-3">
            <div className="flex items-center gap-2 text-text-muted text-xs uppercase font-bold tracking-wider">{icon}{label}</div>
            <div className="mt-1 text-lg font-black text-text">{value}</div>
        </div>
    );
}
