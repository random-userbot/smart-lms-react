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
        navigate(`/lectures/${quiz.lecture_id}?phase=quiz&quizId=${quiz.id}`);
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="text-4xl font-black text-text tracking-tight">My Quizzes</h1>
                <p className="text-text-secondary mt-2">Attempt quizzes from all your enrolled courses.</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-4 mb-8 flex items-center gap-3">
                <Search size={18} className="text-text-muted" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by quiz title, course, or lecture"
                    className="w-full bg-transparent outline-none text-text placeholder-text-muted"
                />
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-danger-light text-danger border border-danger/30 font-semibold">
                    {error}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="bg-surface border border-border rounded-3xl p-10 text-center text-text-secondary font-semibold">
                    No quizzes found.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filtered.map((quiz) => (
                        <article key={quiz.id} className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-text leading-tight">{quiz.title}</h2>
                                    <p className="text-text-secondary mt-2 font-semibold">{quiz.course_title} • {quiz.lecture_title}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-accent-light text-accent border border-accent/20">
                                    {quiz.questions?.length || 0} Qs
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-5">
                                <Stat icon={<Layers size={16} />} label="Attempts" value={String(quiz.attempt_count || 0)} />
                                <Stat icon={<Trophy size={16} />} label="Best" value={quiz.best_percentage != null ? `${quiz.best_percentage}%` : '-'} />
                                <Stat icon={<Clock3 size={16} />} label="Latest" value={quiz.latest_percentage != null ? `${quiz.latest_percentage}%` : '-'} />
                            </div>

                            <button
                                onClick={() => openQuiz(quiz)}
                                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-light transition"
                            >
                                <PlayCircle size={18} />
                                Attempt Quiz
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

function Stat({ icon, label, value }) {
    return (
        <div className="rounded-xl border border-border bg-surface-alt p-3">
            <div className="flex items-center gap-2 text-text-muted text-xs uppercase font-bold tracking-wider">{icon}{label}</div>
            <div className="mt-1 text-lg font-black text-text">{value}</div>
        </div>
    );
}
