import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, lecturesAPI, quizzesAPI, assignmentsAPI } from '../../api/client';
import { PlusCircle, Trash2, Youtube, Upload, FileText, Play, ClipboardList, Sparkles, Users, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function EditCourse() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [lectures, setLectures] = useState([]);
    const [tab, setTab] = useState('lectures');
    const [showAddLecture, setShowAddLecture] = useState(false);
    const [showImportYT, setShowImportYT] = useState(false);
    const [showEditLecture, setShowEditLecture] = useState({ open: false, lecture: null });
    const [lectureForm, setLectureForm] = useState({ title: '', youtube_url: '', video_url: '' });
    const [lectureVideoFile, setLectureVideoFile] = useState(null);
    const [uploadingLectureVideo, setUploadingLectureVideo] = useState(false);
    const [ytUrl, setYtUrl] = useState('');
    const [showAIQuiz, setShowAIQuiz] = useState({ open: false, lectureId: null });
    const [quizForm, setQuizForm] = useState({ num_questions: 5, difficulty: 'medium', include_icap: true });
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingCourse, setDeletingCourse] = useState(false);
    const [toast, setToast] = useState(null);
    
    // AI Quiz Review & Refine state
    const [generatedQuiz, setGeneratedQuiz] = useState(null); 
    const [quizFeedback, setQuizFeedback] = useState('');
    const [refiningQuiz, setRefiningQuiz] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

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
            const res = await lecturesAPI.create({ course_id: courseId, ...lectureForm });
            if (lectureVideoFile && res?.data?.id) {
                setUploadingLectureVideo(true);
                const fd = new FormData();
                fd.append('file', lectureVideoFile);
                await lecturesAPI.uploadVideo(res.data.id, fd);
                setUploadingLectureVideo(false);
            }
            setLectureForm({ title: '', youtube_url: '', video_url: '' });
            setLectureVideoFile(null);
            setShowAddLecture(false);
            setToast({ type: 'success', message: 'Lecture created successfully.' });
            fetchData();
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'Failed to create lecture' });
        } finally {
            setUploadingLectureVideo(false);
        }
    };

    const handleEditLecture = async () => {
        if (!showEditLecture.lecture || !lectureForm.title) return;
        try {
            await lecturesAPI.update(showEditLecture.lecture.id, lectureForm);
            if (lectureVideoFile) {
                setUploadingLectureVideo(true);
                const fd = new FormData();
                fd.append('file', lectureVideoFile);
                await lecturesAPI.uploadVideo(showEditLecture.lecture.id, fd);
            }
            setShowEditLecture({ open: false, lecture: null });
            setLectureForm({ title: '', youtube_url: '', video_url: '' });
            setLectureVideoFile(null);
            setToast({ type: 'success', message: 'Lecture updated successfully.' });
            fetchData();
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'Failed to update lecture' });
        } finally {
            setUploadingLectureVideo(false);
        }
    };

    const handleImportYT = async () => {
        if (!ytUrl) return;
        try {
            const res = await lecturesAPI.importYouTube({ course_id: courseId, playlist_url: ytUrl });
            setToast({ type: 'success', message: `Imported ${res.data.count} lectures.` });
            setShowImportYT(false);
            setYtUrl('');
            fetchData();
        } catch (err) { setToast({ type: 'error', message: err.response?.data?.detail || 'Import failed' }); }
    };

    const handleDeleteLecture = async (id) => {
        if (!confirm('Delete this lecture?')) return;
        try { await lecturesAPI.delete(id); fetchData(); } catch { }
    };

    const handleDeleteCourse = async () => {
        if (!course) return;

        if (deleteConfirmText.trim() !== course.title.trim()) {
            setToast({ type: 'error', message: 'Type the exact course title to confirm deletion.' });
            return;
        }

        try {
            setDeletingCourse(true);
            await coursesAPI.delete(courseId);
            setToast({ type: 'success', message: 'Course deleted successfully. Redirecting...' });
            setShowDeleteCourseModal(false);
            setDeleteConfirmText('');
            setTimeout(() => navigate('/manage-courses'), 1000);
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'Failed to delete course' });
        } finally {
            setDeletingCourse(false);
        }
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
            // Show preview modal instead of saving immediately
            setGeneratedQuiz({ lectureId: showAIQuiz.lectureId, questions: res.data.questions });
            setShowAIQuiz({ open: false, lectureId: null });
            setToast({ type: 'success', message: `Generated ${res.data.count || 0} quiz questions.` });
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'Generation failed. Ensure transcript is ready.' });
        } finally {
            setGeneratingQuiz(false);
        }
    };

    const handleRefineAIQuiz = async () => {
        if (!generatedQuiz || !quizFeedback.trim()) return;
        setRefiningQuiz(true);
        try {
            const res = await quizzesAPI.refineAI({
                lecture_id: generatedQuiz.lectureId,
                current_questions: generatedQuiz.questions,
                feedback: quizFeedback
            });
            setGeneratedQuiz({ ...generatedQuiz, questions: res.data.questions });
            setQuizFeedback('');
            setToast({ type: 'success', message: 'Quiz refined successfully.' });
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'Refinement failed.' });
        } finally {
            setRefiningQuiz(false);
        }
    };

    const handleSaveAIQuiz = async () => {
        if (!generatedQuiz) return;
        setGeneratingQuiz(true); // Re-use loading state for save
        try {
            const lecture = lectures.find(l => l.id === generatedQuiz.lectureId);
            await quizzesAPI.create({
                lecture_id: generatedQuiz.lectureId,
                title: `AI Quiz – ${lecture?.title || 'Lecture'}`,
                questions: generatedQuiz.questions,
                time_limit: generatedQuiz.questions.length * 90,
                is_published: true,
            });
            setToast({ type: 'success', message: `Saved ${generatedQuiz.questions.length} questions and published quiz.` });
            setGeneratedQuiz(null);
            setQuizForm({ num_questions: 5, difficulty: 'medium', include_icap: true });
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'Failed to save quiz.' });
        } finally {
            setGeneratingQuiz(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-[50vh]"><div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div></div>;

    return (
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
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
                    <button className="btn bg-danger-light text-danger hover:bg-danger hover:text-white border-danger/20 shadow-sm" onClick={() => setShowDeleteCourseModal(true)}>
                        <Trash2 size={20} /> Delete Course
                    </button>
                </div>
            </div>

            {toast && (
                <div className="fixed top-6 right-6 z-[70] animate-in fade-in slide-in-from-top-2">
                    <div className={`min-w-[320px] max-w-[420px] rounded-2xl border shadow-xl px-4 py-3 flex items-start gap-3 ${toast.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}`}>
                        {toast.type === 'success' ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
                        <div className="font-bold text-sm leading-relaxed">{toast.message}</div>
                    </div>
                </div>
            )}

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

                                        <div className="flex items-center gap-3 mt-4 sm:mt-0 justify-end w-full sm:w-auto border-t sm:border-t-0 border-border pt-4 sm:pt-0">
                                            <button className="btn btn-sm bg-accent-light text-accent hover:bg-accent hover:text-white border-accent/20" title="Edit Lecture" onClick={() => {
                                                setLectureForm({ title: l.title, youtube_url: l.youtube_url || '', video_url: l.video_url || '' });
                                                setShowEditLecture({ open: true, lecture: l });
                                            }}>
                                                <FileText size={16} /> Edit
                                            </button>
                                            <button className="btn btn-sm bg-secondary-light text-secondary hover:bg-secondary hover:text-white border-secondary/20" title="Generate AI Quiz" onClick={() => navigate(`/manage-courses/${courseId}/quiz-gen/${l.id}`)}>
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

            {showDeleteCourseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in" onClick={() => !deletingCourse && setShowDeleteCourseModal(false)}>
                    <div className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-in-center border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border bg-danger-light/40">
                            <h2 className="text-3xl font-black text-text flex items-center gap-3"><AlertTriangle className="text-danger" size={32} /> Delete Course</h2>
                            <p className="text-text-secondary text-base mt-3 font-medium">
                                This permanently removes lectures, quizzes, attempts, engagement logs, feedback, enrollments, materials, and related student data.
                            </p>
                        </div>
                        <div className="p-8 md:p-10 space-y-6">
                            <div className="text-sm font-bold text-text-secondary">
                                To confirm, type this course title exactly:
                            </div>
                            <div className="px-4 py-3 rounded-xl bg-surface-alt border border-border text-text font-black break-words">
                                {course?.title}
                            </div>
                            <input
                                className="input"
                                placeholder="Type course title to confirm"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                disabled={deletingCourse}
                            />
                        </div>
                        <div className="p-8 border-t border-border flex gap-4 justify-end items-center bg-surface-alt">
                            <button className="btn btn-ghost px-8" onClick={() => setShowDeleteCourseModal(false)} disabled={deletingCourse}>Cancel</button>
                            <button
                                className="btn bg-danger text-white hover:bg-danger/90 px-10"
                                onClick={handleDeleteCourse}
                                disabled={deletingCourse || deleteConfirmText.trim() !== (course?.title || '').trim()}
                            >
                                {deletingCourse ? <><Loader2 size={18} className="animate-spin" /> Deleting...</> : <><Trash2 size={18} /> Permanently Delete</>}
                            </button>
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
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Upload Video File</label>
                                <input
                                    className="input"
                                    type="file"
                                    accept="video/*"
                                    onChange={e => setLectureVideoFile(e.target.files?.[0] || null)}
                                />
                                <p className="text-xs text-text-muted font-semibold mt-2">For larger files use Cloudinary/S3 URL; local upload is best for dev/staging.</p>
                            </div>
                        </div>
                        <div className="p-8 border-t border-border flex gap-4 justify-end items-center bg-surface-alt">
                            <button className="btn btn-ghost px-8" onClick={() => setShowAddLecture(false)}>Cancel</button>
                            <button className="btn btn-primary px-10 shadow-accent" onClick={handleAddLecture} disabled={!lectureForm.title || uploadingLectureVideo}>{uploadingLectureVideo ? 'Uploading Video...' : 'Create Lecture'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showEditLecture.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowEditLecture({ open: false, lecture: null })}>
                    <div className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-in-center border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border bg-surface-alt">
                            <h2 className="text-3xl font-black text-text flex items-center gap-3"><FileText className="text-accent" size={32}/> Edit Lecture</h2>
                            <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Updating: {showEditLecture.lecture?.title}</p>
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
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-widest mb-3">Replace With Uploaded Video File</label>
                                <input
                                    className="input"
                                    type="file"
                                    accept="video/*"
                                    onChange={e => setLectureVideoFile(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                        <div className="p-8 border-t border-border flex gap-4 justify-end items-center bg-surface-alt">
                            <button className="btn btn-ghost px-8" onClick={() => setShowEditLecture({ open: false, lecture: null })}>Cancel</button>
                            <button className="btn btn-primary px-10 shadow-accent" onClick={handleEditLecture} disabled={!lectureForm.title || uploadingLectureVideo}>{uploadingLectureVideo ? 'Uploading Video...' : 'Update Lecture'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showAIQuiz.open && !generatedQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in" onClick={() => !generatingQuiz && setShowAIQuiz({ open: false, lectureId: null })}>
                    <div className="bg-surface rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden transform transition-all scale-in-center border border-border flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-10 md:p-12 border-b border-border bg-gradient-to-r from-surface-alt to-surface relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><Sparkles size={240} /></div>
                            <div className="flex items-center gap-5 mb-6 relative z-10">
                                <div className="w-16 h-16 bg-accent-light text-accent rounded-[1.8rem] flex items-center justify-center border border-accent/20 shadow-sm rotate-3">
                                    <Sparkles size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-text tracking-tight mb-1">AI Quiz Generator</h2>
                                    <span className="text-xs font-black text-accent uppercase tracking-widest bg-accent-light px-3 py-1.5 rounded-lg border border-accent/20 shadow-sm">Auto-fetches Transcript</span>
                                </div>
                            </div>
                            <p className="text-text-secondary text-lg font-medium max-w-xl relative z-10 leading-relaxed">
                                Configure the parameters below. Our AI will automatically analyze the lecture's transcript to generate highly relevant, cognitive-stimulating questions.
                            </p>
                        </div>

                        <div className="p-10 md:p-12 space-y-10 overflow-y-auto bg-surface flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-black text-text-secondary uppercase tracking-widest">Question Count</label>
                                        <span className="text-[10px] bg-surface-elevated text-text-muted px-2 py-1 rounded border border-border font-bold uppercase tracking-wider">3 to 15</span>
                                    </div>
                                    <select
                                        className="input py-4 px-6 text-base font-bold bg-surface-elevated shadow-inner"
                                        value={quizForm.num_questions}
                                        onChange={e => setQuizForm({ ...quizForm, num_questions: e.target.value })}
                                        disabled={generatingQuiz}
                                    >
                                        {[3, 5, 7, 10, 15].map(n => (
                                            <option key={n} value={n}>{n} questions</option>
                                        ))}
                                    </select>
                                    <p className="text-xs font-medium text-text-muted">We recommend 5-7 questions for a standard lecture engagement check.</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-black text-text-secondary uppercase tracking-widest block">Cognitive Complexity</label>
                                    <div className="flex gap-3">
                                        {['easy', 'medium', 'hard'].map(d => (
                                            <button key={d}
                                                className={`flex-1 py-4 rounded-xl font-black text-sm capitalize transition-all border-2 shadow-sm ${
                                                    quizForm.difficulty === d
                                                        ? 'bg-accent text-white border-accent shadow-accent'
                                                        : 'bg-surface text-text-secondary border-border hover:border-accent/40 hover:bg-surface-alt'
                                                }`}
                                                onClick={() => setQuizForm({ ...quizForm, difficulty: d })}
                                                disabled={generatingQuiz}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs font-medium text-text-muted">Higher complexity generates scenario-based and analytical questions.</p>
                                </div>
                            </div>

                            <div className={`p-8 bg-accent-light/30 border-2 border-accent/20 rounded-[2rem] transition-colors cursor-pointer shadow-sm group ${generatingQuiz ? 'opacity-50 pointer-events-none' : 'hover:bg-accent-light/50 hover:border-accent/40'}`}>
                                <label className="flex items-start gap-5 cursor-pointer w-full">
                                    <div className="pt-1 shrink-0">
                                        <input
                                            type="checkbox"
                                            className="w-6 h-6 text-accent rounded-md border-accent/30 focus:ring-accent shadow-sm mt-1"
                                            checked={quizForm.include_icap}
                                            onChange={e => setQuizForm({ ...quizForm, include_icap: e.target.checked })}
                                            disabled={generatingQuiz}
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xl font-black text-text group-hover:text-accent transition-colors block mb-2">Enable ICAP Alignment</span>
                                        <p className="text-sm font-medium text-text-secondary leading-relaxed">
                                            Generates a mix of questions targeting different cognitive states (Interactive, Constructive, Active, Passive). This includes open-ended and fill-in-the-blank formats alongside standard MCQs to maximize student engagement and depth of processing.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="p-8 md:p-10 border-t border-border flex flex-col sm:flex-row gap-4 justify-end items-center bg-surface-alt shrink-0">
                            <button
                                className="btn btn-ghost px-8 w-full sm:w-auto"
                                onClick={() => setShowAIQuiz({ open: false, lectureId: null })}
                                disabled={generatingQuiz}
                            >
                                Cancel
                            </button>
                            <button
                                className={`btn btn-lg px-10 shadow-accent w-full sm:w-auto ${generatingQuiz ? 'bg-accent/80 cursor-not-allowed text-white' : 'btn-primary'}`}
                                onClick={handleGenerateAIQuiz}
                                disabled={generatingQuiz}
                            >
                                {generatingQuiz ? (
                                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div> Generating Quiz...</>
                                ) : (
                                    <><Sparkles size={20} className="mr-2"/> Generate Quiz</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Quiz Review Modal */}
            {generatedQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in" onClick={() => {}}>
                    <div className="bg-surface rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all scale-in-center border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-10 md:p-12 border-b border-border bg-gradient-to-r from-success-light/30 to-surface relative overflow-hidden shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><CheckCircle size={240} /></div>
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-16 h-16 bg-success-light text-success rounded-[1.8rem] flex items-center justify-center border border-success/20 shadow-sm">
                                    <CheckCircle size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-text tracking-tight mb-1">
                                        Review Generated Quiz
                                    </h2>
                                    <p className="text-text-secondary text-base font-medium">
                                        Preview the AI-generated questions before saving. Provide feedback below to refine them.
                                    </p>
                                </div>
                            </div>
                            <span className="bg-surface-elevated text-text border border-border px-6 py-3 font-black uppercase tracking-widest rounded-2xl text-sm shadow-sm relative z-10 shrink-0">
                                {generatedQuiz.questions.length} Questions
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-10 md:p-12 space-y-8 bg-surface">
                            {generatedQuiz.questions.map((q, i) => {
                                const qType = q.type || 'unknown_type';
                                const qTypeLabel = qType.replace(/_/g, ' ');
                                const hasOptions = q.options && Array.isArray(q.options);
                                
                                return (
                                <div key={i} className={`p-8 border-2 border-border rounded-[2rem] bg-surface-alt shadow-sm relative overflow-hidden ${qType === 'mcq' ? 'border-l-info' : qType === 'true_false' ? 'border-l-warning' : 'border-l-success'} border-l-8`}>
                                    <div className="flex flex-wrap items-center gap-4 mb-6">
                                        <span className="bg-surface border border-border px-4 py-1.5 rounded-xl text-sm font-black text-text-muted uppercase tracking-wider shadow-sm">Question {i + 1}</span>
                                        <span className="bg-surface border border-border px-4 py-1.5 rounded-xl text-sm font-black text-text-secondary uppercase tracking-wider shadow-sm">{qTypeLabel}</span>
                                        <span className="bg-accent-light text-accent border border-accent/20 px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-wider shadow-sm">{q.icap_level || 'active'}</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-text mb-8 leading-relaxed relative z-10">{q.question || 'Missing question text'}</h4>
                                    
                                    {qType === 'mcq' && hasOptions && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                            {q.options.map((opt, j) => (
                                                <div key={j} className={`p-5 rounded-2xl border-2 transition-colors flex items-center justify-between ${opt === q.correct_answer ? 'bg-success-light/30 border-success/40 font-bold text-success-dark shadow-sm' : 'bg-surface border-border text-text-secondary hover:border-text-muted'}`}>
                                                    <span className="text-lg">{opt}</span>
                                                    {opt === q.correct_answer && <span className="w-6 h-6 rounded-full bg-success flex items-center justify-center text-white shrink-0"><CheckCircle size={14} /></span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {qType === 'true_false' && (
                                        <div className="flex gap-4 mb-2">
                                            {['True', 'False'].map(opt => (
                                                <div key={opt} className={`flex-1 p-6 rounded-2xl border-2 text-center text-xl transition-colors ${String(opt).toLowerCase() === String(q.correct_answer).toLowerCase() ? 'bg-success-light/30 border-success/40 font-black text-success-dark shadow-sm' : 'bg-surface border-border text-text-secondary font-bold hover:border-text-muted'}`}>
                                                    {opt} {String(opt).toLowerCase() === String(q.correct_answer).toLowerCase() && <span className="ml-2 text-success">✓</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {(qType === 'open_ended' || qType === 'short_answer' || qType === 'fill_in_blank') && (
                                        <div className="p-6 bg-success-light/30 border-2 border-success/20 rounded-2xl mb-2">
                                            <div className="text-xs font-black text-success uppercase tracking-widest mb-2">Expected Answer / Keywords</div>
                                            <div className="text-text font-bold text-xl">{q.correct_answer || (q.keywords && Array.isArray(q.keywords) ? q.keywords.join(', ') : 'N/A')}</div>
                                        </div>
                                    )}
                                    {q.explanation && (
                                        <div className="p-5 bg-surface border border-border rounded-2xl text-base text-text-secondary mt-6 flex gap-3">
                                            <Sparkles size={20} className="text-accent shrink-0 mt-0.5" />
                                            <div><strong className="text-text font-black uppercase tracking-widest text-sm mr-2">Explanation:</strong> {q.explanation}</div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>

                        <div className="p-8 md:p-10 border-t border-border bg-surface-alt shrink-0 space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                                <input 
                                    className="input flex-1 py-4 px-6 text-lg shadow-inner" 
                                    placeholder="Provide feedback to refine (e.g., 'Make it harder' or 'Change Q2')..."
                                    value={quizFeedback}
                                    onChange={e => setQuizFeedback(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleRefineAIQuiz()}
                                    disabled={refiningQuiz || generatingQuiz}
                                />
                                <button 
                                    className="btn btn-lg btn-secondary border-2 border-border hover:border-accent hover:text-accent px-10 shadow-sm"
                                    onClick={handleRefineAIQuiz}
                                    disabled={!quizFeedback.trim() || refiningQuiz || generatingQuiz}
                                >
                                    {refiningQuiz ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div> : <><MessageSquare size={20} className="mr-2"/> Refine</>}
                                </button>
                            </div>
                            <div className="flex gap-4 justify-end pt-6 border-t border-border">
                                <button className="btn btn-ghost px-8" onClick={() => { setGeneratedQuiz(null); setShowAIQuiz({ open: false, lectureId: null }); }}>Discard</button>
                                <button 
                                    className="btn btn-lg btn-primary px-12 shadow-accent" 
                                    onClick={handleSaveAIQuiz}
                                    disabled={generatingQuiz || refiningQuiz}
                                >
                                    {generatingQuiz ? 'Saving...' : <><Save size={20} className="mr-2" /> Publish to Course</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MaterialsTab({ courseId, lectures }) {
    const [selectedLecture, setSelectedLecture] = useState(lectures[0]?.id || '');
    const [materials, setMaterials] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [notice, setNotice] = useState(null);

    const fetchMaterials = async (lectureId) => {
        if (!lectureId) return;
        setLoadingMaterials(true);
        try {
            const res = await lecturesAPI.getMaterials(lectureId);
            setMaterials(res.data || []);
        } catch {
            setMaterials([]);
        } finally {
            setLoadingMaterials(false);
        }
    };

    useEffect(() => {
        if (selectedLecture) fetchMaterials(selectedLecture);
    }, [selectedLecture]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedLecture) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('course_id', courseId);
        formData.append('lecture_id', selectedLecture);
        formData.append('title', file.name);
        try {
            await lecturesAPI.addMaterial(formData);
            setNotice({ type: 'success', text: 'Material uploaded successfully.' });
            await fetchMaterials(selectedLecture);
        } catch (error) {
            setNotice({ type: 'error', text: error.response?.data?.detail || 'Upload failed' });
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this material?')) return;
        try {
            await lecturesAPI.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch {
            alert('Failed to delete material');
        }
    };

    const getFileIcon = (type = '') => {
        if (type.includes('pdf')) return { icon: '📄', color: 'text-danger bg-danger-light border-danger/20' };
        if (type.includes('zip') || type.includes('rar')) return { icon: '🗜️', color: 'text-warning bg-warning-light border-warning/20' };
        if (type.includes('image')) return { icon: '🖼️', color: 'text-info bg-info-light border-info/20' };
        return { icon: '📁', color: 'text-accent bg-accent-light border-accent/20' };
    };

    return (
        <div className="space-y-8">
            {notice && (
                <div className={`rounded-2xl border px-4 py-3 font-bold text-sm ${notice.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}`}>
                    {notice.text}
                </div>
            )}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                <div className="flex-1">
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
                <label className={`btn btn-lg shrink-0 ${!selectedLecture || uploading ? 'bg-surface-elevated text-text-muted border-border pointer-events-none' : 'btn-primary shadow-accent cursor-pointer px-10'}`}>
                    {uploading ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" /> Uploading...</> : <><Upload size={20} className="mr-2" /> Upload File</>}
                    <input type="file" className="hidden" onChange={handleFileChange} disabled={!selectedLecture || uploading} />
                </label>
            </div>

            {/* Materials List */}
            {selectedLecture && (
                <div className="bg-surface-alt rounded-[2rem] border border-border overflow-hidden">
                    <div className="px-8 py-6 bg-surface border-b border-border flex items-center justify-between">
                        <h4 className="font-black text-text text-xl">Uploaded Materials</h4>
                        <span className="text-xs font-black text-text-muted uppercase tracking-widest bg-surface-elevated border border-border px-4 py-2 rounded-xl">{materials.length} file{materials.length !== 1 ? 's' : ''}</span>
                    </div>

                    {loadingMaterials ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-4 border-accent-light border-t-accent rounded-full animate-spin" />
                        </div>
                    ) : materials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                            <div className="p-6 bg-surface rounded-2xl mb-5 text-text-muted border border-border">
                                <Upload size={40} strokeWidth={1.5} />
                            </div>
                            <p className="text-lg font-black text-text mb-2">No materials uploaded yet</p>
                            <p className="text-text-secondary font-medium">Upload PDFs, ZIPs, or documents above to make them available to students.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {materials.map(mat => {
                                const { icon, color } = getFileIcon(mat.file_type);
                                const isPdf = mat.file_type?.includes('pdf');
                                return (
                                    <div key={mat.id} className="flex items-center gap-5 px-8 py-6 hover:bg-surface transition-colors group">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border flex-shrink-0 ${color}`}>
                                            {icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-text text-lg truncate">{mat.title}</div>
                                            <div className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">
                                                {mat.file_type} · {(mat.file_size / 1024).toFixed(0)} KB
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isPdf && (
                                                <a
                                                    href={mat.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-sm bg-info-light text-info border-info/20 hover:bg-info hover:text-white"
                                                    title="View PDF"
                                                >
                                                    👁 View
                                                </a>
                                            )}
                                            <a
                                                href={mat.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                download
                                                className="btn btn-sm bg-accent-light text-accent border-accent/20 hover:bg-accent hover:text-white"
                                                title="Download"
                                            >
                                                ↓ Download
                                            </a>
                                            <button
                                                className="btn btn-sm bg-danger-light text-danger border-danger/20 hover:bg-danger hover:text-white"
                                                onClick={() => handleDelete(mat.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
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
