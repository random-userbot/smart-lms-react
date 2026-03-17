import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { coursesAPI, lecturesAPI, quizzesAPI, assignmentsAPI } from '../../api/client';
import { PlusCircle, Trash2, Youtube, Upload, FileText, Play, ClipboardList, Sparkles, Users } from 'lucide-react';

export default function EditCourse() {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [lectures, setLectures] = useState([]);
    const [tab, setTab] = useState('lectures');
    const [showAddLecture, setShowAddLecture] = useState(false);
    const [showImportYT, setShowImportYT] = useState(false);
    const [lectureForm, setLectureForm] = useState({ title: '', youtube_url: '', video_url: '' });
    const [ytUrl, setYtUrl] = useState('');
    const [showAIQuiz, setShowAIQuiz] = useState({ open: false, lectureId: null });
    const [quizForm, setQuizForm] = useState({ num_questions: 5, difficulty: 'medium', include_icap: true });
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
        Promise.all([
            coursesAPI.get(courseId),
            lecturesAPI.getByCourse(courseId),
        ]).then(([cRes, lRes]) => {
            setCourse(cRes.data);
            setLectures(lRes.data || []);
        }).finally(() => setLoading(false));
    };
    useEffect(fetchData, [courseId]);

    const handleAddLecture = async () => {
        if (!lectureForm.title) return;
        try {
            await lecturesAPI.create({ course_id: courseId, ...lectureForm });
            setLectureForm({ title: '', youtube_url: '', video_url: '' });
            setShowAddLecture(false);
            fetchData();
        } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
    };

    const handleImportYT = async () => {
        if (!ytUrl) return;
        try {
            const res = await lecturesAPI.importYouTube({ course_id: courseId, playlist_url: ytUrl });
            alert(`Imported ${res.data.count} lectures!`);
            setShowImportYT(false);
            setYtUrl('');
            fetchData();
        } catch (err) { alert(err.response?.data?.detail || 'Import failed'); }
    };

    const handleDeleteLecture = async (id) => {
        if (!confirm('Delete this lecture?')) return;
        try { await lecturesAPI.delete(id); fetchData(); } catch { }
    };

    const handleGenerateAIQuiz = async () => {
        if (!showAIQuiz.lectureId) return;
        setGeneratingQuiz(true);
        try {
            const res = await quizzesAPI.generateAI({
                lecture_id: showAIQuiz.lectureId,
                num_questions: parseInt(quizForm.num_questions),
                difficulty: quizForm.difficulty,
                include_icap: quizForm.include_icap
            });

            // Save the generated quiz
            const lecture = lectures.find(l => l.id === showAIQuiz.lectureId);
            await quizzesAPI.create({
                lecture_id: showAIQuiz.lectureId,
                title: `AI Quiz – ${lecture?.title || 'Lecture'}`,
                questions: res.data.questions,
                time_limit: res.data.questions.length * 90, // ~90s per question
            });

            alert(`Generated & saved ${res.data.count} questions successfully!`);
            setShowAIQuiz({ open: false, lectureId: null });
            setQuizForm({ num_questions: 5, difficulty: 'medium', include_icap: true });
        } catch (err) {
            alert(err.response?.data?.detail || 'Generation failed. Ensure the lecture has a transcript.');
        } finally {
            setGeneratingQuiz(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-[50vh]"><div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3">{course?.title}</h1>
                    <p className="text-xl text-text-secondary font-medium">
                        {lectures.length} lectures <span className="mx-3 opacity-50">•</span> {course?.student_count || 0} students enrolled
                    </p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button className="btn btn-secondary shadow-sm" onClick={() => setShowImportYT(true)}>
                        <Youtube size={20} className="text-danger" /> Import Playlist
                    </button>
                    <button className="btn btn-primary shadow-accent" onClick={() => setShowAddLecture(true)}>
                        <PlusCircle size={20} /> Add Lecture
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'lectures', label: 'Lectures', count: lectures.length, icon: Play },
                    { id: 'materials', label: 'Course Materials', count: null, icon: FileText },
                    { id: 'students', label: 'Students', count: course?.student_count || 0, icon: Users },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id}
                            className={`flex items-center gap-3 px-8 py-4 rounded-t-2xl font-black transition-all border-b-2 tracking-wide whitespace-nowrap ${tab === t.id ? 'bg-surface text-accent border-accent shadow-[0_-4px_10px_-5px_var(--color-accent-light)]' : 'bg-surface-elevated text-text-muted border-transparent hover:bg-border'}`}
                            onClick={() => setTab(t.id)}>
                            <Icon size={20} /> {t.label}
                            {t.count !== null && <span className="ml-2 bg-surface-alt border border-border text-text-muted py-0.5 px-3 rounded-xl text-xs">{t.count}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="bg-surface rounded-b-[2.5rem] rounded-tr-[2.5rem] shadow-sm border border-border p-8 md:p-12">

                {tab === 'lectures' && (
                    lectures.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-surface-alt">
                            <div className="p-8 bg-surface text-text-muted rounded-full mb-6 shadow-sm"><Play size={64} strokeWidth={1} /></div>
                            <h3 className="text-2xl font-black text-text tracking-tight mb-3">No lectures yet</h3>
                            <p className="text-text-secondary text-lg mt-1 max-w-md font-medium">Start building your course by adding individual lectures or importing a YouTube playlist.</p>
                            <button className="mt-8 btn btn-primary shadow-accent px-8" onClick={() => setShowAddLecture(true)}>
                                <PlusCircle size={20} className="mr-2" /> Add First Lecture
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {lectures.map((l, i) => (
                                <div key={l.id} className="flex flex-col p-6 border-2 border-border rounded-3xl hover:border-accent/40 hover:shadow-md transition-all bg-surface-alt hover:bg-surface group">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-5 justify-between w-full">
                                        
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className="h-14 w-14 rounded-2xl bg-accent-light text-accent border border-accent/20 flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-text truncate text-xl mb-1">{l.title}</div>
                                                <div className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-3">
                                                    {l.youtube_url ? <span className="flex items-center gap-1.5 text-danger bg-danger-light px-2.5 py-1 rounded-md"><Youtube size={14} /> YouTube</span> : l.video_url ? <span className="text-success bg-success-light px-2.5 py-1 rounded-md">Uploaded</span> : <span className="text-warning bg-warning-light px-2.5 py-1 rounded-md">No Video</span>}
                                                    <span className="opacity-50">•</span>
                                                    <span>ID: {l.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-4 sm:mt-0 justify-end w-full sm:w-auto border-t sm:border-t-0 border-border pt-4 sm:pt-0">
                                            <button className="btn btn-sm bg-accent-light text-accent hover:bg-accent hover:text-white border-accent/20" title="Generate AI Quiz" onClick={() => setShowAIQuiz({ open: true, lectureId: l.id })}>
                                                <Sparkles size={16} /> AI Quiz
                                            </button>
                                            <button className="btn btn-sm bg-danger-light text-danger hover:bg-danger hover:text-white border-danger/20" title="Delete Lecture" onClick={() => handleDeleteLecture(l.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {tab === 'materials' && (
                    <MaterialsTab courseId={courseId} lectures={lectures} />
                )}

                {tab === 'students' && (
                    <StudentsTab courseId={courseId} />
                )}
            </div>

            {/* Modals */}
            {showImportYT && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in flex-col" onClick={() => setShowImportYT(false)}>
                    <div className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-in-center border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border bg-surface-alt">
                            <h2 className="text-3xl font-black text-text flex items-center gap-3 mb-2"><Youtube className="text-danger" size={32} /> Import YouTube Playlist</h2>
                            <p className="text-text-secondary text-base mt-2 font-medium">
                                Paste a public YouTube playlist URL. We will fetch all video titles, durations, and auto-generate transcripts if available.
                            </p>
                        </div>
                        <div className="p-8 md:p-10 space-y-6">
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Playlist URL</label>
                                <input className="input" autoFocus
                                    placeholder="https://youtube.com/playlist?list=..."
                                    value={ytUrl} onChange={e => setYtUrl(e.target.value)} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-border flex gap-4 justify-end items-center bg-surface-alt">
                            <button className="btn btn-ghost px-8" onClick={() => setShowImportYT(false)}>Cancel</button>
                            <button className="btn btn-primary px-10 shadow-accent" onClick={handleImportYT} disabled={!ytUrl}>Start Import</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddLecture && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAddLecture(false)}>
                    <div className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-in-center border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border bg-surface-alt">
                            <h2 className="text-3xl font-black text-text flex items-center gap-3"><PlusCircle className="text-accent" size={32}/> Add New Lecture</h2>
                        </div>
                        <div className="p-8 md:p-10 space-y-6">
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Lecture Title <span className="text-danger">*</span></label>
                                <input className="input" autoFocus
                                    placeholder="e.g. Introduction to Machine Learning" value={lectureForm.title}
                                    onChange={e => setLectureForm({ ...lectureForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">YouTube URL</label>
                                <input className="input"
                                    placeholder="https://youtube.com/watch?v=..."
                                    value={lectureForm.youtube_url}
                                    onChange={e => setLectureForm({ ...lectureForm, youtube_url: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Direct Video URL</label>
                                <input className="input"
                                    placeholder="https://res.cloudinary.com/..."
                                    value={lectureForm.video_url}
                                    onChange={e => setLectureForm({ ...lectureForm, video_url: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-border flex gap-4 justify-end items-center bg-surface-alt">
                            <button className="btn btn-ghost px-8" onClick={() => setShowAddLecture(false)}>Cancel</button>
                            <button className="btn btn-primary px-10 shadow-accent" onClick={handleAddLecture} disabled={!lectureForm.title}>Create Lecture</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Quiz Generation Modal */}
            {showAIQuiz.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in" onClick={() => !generatingQuiz && setShowAIQuiz({ open: false, lectureId: null })}>
                    <div className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-in-center border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border bg-surface-alt">
                            <h2 className="text-3xl font-black text-text flex items-center gap-3 mb-2">
                                <Sparkles className="text-accent" size={32} /> Generate AI Quiz
                            </h2>
                            <p className="text-text-secondary text-base mt-2 font-medium">
                                AI will generate quiz questions from the lecture transcript using ICAP-aligned question types.
                            </p>
                        </div>
                        <div className="p-8 md:p-10 space-y-8">
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Number of Questions</label>
                                <select
                                    className="input py-3 text-base bg-surface-elevated"
                                    value={quizForm.num_questions}
                                    onChange={e => setQuizForm({ ...quizForm, num_questions: e.target.value })}
                                >
                                    {[3, 5, 7, 10, 15].map(n => (
                                        <option key={n} value={n}>{n} questions</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Difficulty</label>
                                <div className="flex gap-4">
                                    {['easy', 'medium', 'hard'].map(d => (
                                        <button key={d}
                                            className={`flex-1 py-4 rounded-2xl font-black text-base capitalize transition-all border-2 shadow-sm ${
                                                quizForm.difficulty === d
                                                    ? 'bg-accent text-white border-accent shadow-accent'
                                                    : 'bg-surface text-text-secondary border-border hover:border-accent/40 hover:bg-surface-alt'
                                            }`}
                                            onClick={() => setQuizForm({ ...quizForm, difficulty: d })}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer p-6 bg-surface-elevated rounded-2xl border-2 border-border hover:border-accent/40 transition-colors shadow-sm">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-accent rounded-md border-border focus:ring-accent"
                                    checked={quizForm.include_icap}
                                    onChange={e => setQuizForm({ ...quizForm, include_icap: e.target.checked })}
                                />
                                <div>
                                    <span className="text-lg font-black text-text">Include ICAP-aligned questions</span>
                                    <p className="text-sm font-medium text-text-muted mt-1">Generates MCQ, fill-in-blank, and open-ended items</p>
                                </div>
                            </label>
                        </div>
                        <div className="p-8 border-t border-border flex flex-col sm:flex-row gap-4 justify-end items-center bg-surface-alt">
                            <button
                                className="btn btn-ghost px-8 w-full sm:w-auto"
                                onClick={() => setShowAIQuiz({ open: false, lectureId: null })}
                                disabled={generatingQuiz}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary px-10 shadow-accent w-full sm:w-auto"
                                onClick={handleGenerateAIQuiz}
                                disabled={generatingQuiz}
                            >
                                {generatingQuiz ? (
                                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> Generating...</>
                                ) : (
                                    <><Sparkles size={18} className="mr-2"/> Generate Quiz</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MaterialsTab({ courseId, lectures }) {
    const [selectedLecture, setSelectedLecture] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedLecture) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lecture_id', selectedLecture);

        try {
            await lecturesAPI.addMaterial(formData);
            alert('File uploaded successfully!');
        } catch (error) {
            alert(error.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-surface-alt max-w-4xl mx-auto">
            <div className="p-8 bg-surface rounded-[2rem] shadow-sm text-text-muted mb-8 border border-border">
                <Upload size={64} strokeWidth={1.5} />
            </div>
            <h3 className="text-3xl font-black text-text mb-4 tracking-tight">Upload Course Materials</h3>
            <p className="text-text-secondary font-medium max-w-lg mx-auto mb-10 text-lg">Attach PDFs, ZIP files, or documents to a specific lecture in this course. They will be immediately available for students to download.</p>

            <div className="w-full max-w-md mb-8 text-left">
                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Select Lecture</label>
                <select
                    className="input py-4 text-base bg-surface-elevated shadow-sm"
                    value={selectedLecture}
                    onChange={e => setSelectedLecture(e.target.value)}
                >
                    <option value="">-- Choose a lecture --</option>
                    {lectures.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                </select>
            </div>

            <label className={`btn btn-lg ${!selectedLecture || uploading ? 'bg-surface-elevated text-text-muted border-border pointer-events-none' : 'btn-primary shadow-accent cursor-pointer px-12'}`}>
                {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div> : <Upload size={22} className="mr-3" />}
                {uploading ? 'Uploading...' : 'Select File & Upload'}
                <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
        </div>
    );
}

function StudentsTab({ courseId }) {
    const [students, setStudents] = useState([]);
    useEffect(() => {
        coursesAPI.getStudents(courseId).then(res => setStudents(res.data || [])).catch(() => { });
    }, [courseId]);

    return students.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-surface-alt">
            <div className="p-8 bg-surface rounded-full shadow-sm text-text-muted mb-6"><Users size={64} strokeWidth={1.5}/></div>
            <p className="text-2xl font-black text-text tracking-tight">No students enrolled yet.</p>
        </div>
    ) : (
        <div className="overflow-x-auto bg-surface-alt rounded-[2rem] border border-border">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-elevated text-text-muted font-black uppercase tracking-widest text-xs border-b border-border">
                    <tr><th className="px-8 py-6">Name</th><th className="px-8 py-6">Email</th><th className="px-8 py-6">Progress</th><th className="px-8 py-6">Enrolled</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {students.map(s => (
                        <tr key={s.student_id} className="hover:bg-surface transition-colors">
                            <td className="px-8 py-6 font-black text-text flex items-center gap-4 text-base">
                                <div className="h-10 w-10 rounded-full bg-surface-elevated text-text-secondary border border-border flex items-center justify-center font-black text-sm shadow-sm">
                                    {s.full_name.charAt(0)}
                                </div>
                                {s.full_name}
                            </td>
                            <td className="px-8 py-6 font-medium text-text-secondary">{s.email}</td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-full bg-border rounded-full h-3 max-w-[120px] shadow-inner overflow-hidden"><div className="bg-accent h-3 rounded-full transition-all duration-700" style={{ width: `${s.progress || 0}%` }}></div></div>
                                    <span className="text-sm font-black text-text">{s.progress?.toFixed(0) || 0}%</span>
                                </div>
                            </td>
                            <td className="px-8 py-6 font-bold text-text-muted">{new Date(s.enrolled_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
