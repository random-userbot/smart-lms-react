import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/client';
import { PlusCircle, BookOpen, Trash2, Edit, Eye, Users, Play, Settings } from 'lucide-react';

export default function ManageCourses() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', category: '' });
    const [loading, setLoading] = useState(true);

    const fetchCourses = () => {
        coursesAPI.list().then(res => setCourses(res.data || [])).catch(() => { }).finally(() => setLoading(false));
    };
    useEffect(fetchCourses, []);

    const handleCreate = async () => {
        if (!form.title) return;
        try {
            await coursesAPI.create(form);
            setForm({ title: '', description: '', category: '' });
            setShowCreate(false);
            fetchCourses();
        } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this course?')) return;
        try { await coursesAPI.delete(id); fetchCourses(); } catch { }
    };

    const handlePublish = async (course) => {
        try { await coursesAPI.update(course.id, { is_published: !course.is_published }); fetchCourses(); } catch { }
    };

    if (loading) return <div className="flex h-[50vh] items-center justify-center"><div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div></div>;

    return (
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3">Instructor Dashboard</h1>
                    <p className="text-text-secondary font-medium text-xl">Manage your courses, lectures, and students.</p>
                </div>
                <button className="btn btn-primary btn-lg shadow-accent px-8"
                    onClick={() => setShowCreate(true)}>
                    <PlusCircle size={22} className="mr-2" /> Create New Course
                </button>
            </div>

            {/* Create Course Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowCreate(false)}>
                    <div className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-2xl overflow-hidden transform transition-all scale-in-center" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface-alt">
                            <h2 className="text-2xl font-black text-text">Create New Course</h2>
                        </div>
                        <div className="p-8 md:p-10 space-y-6">
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-wider mb-2">Course Title <span className="text-danger">*</span></label>
                                <input className="input" autoFocus
                                    placeholder="e.g. Advanced Python Programming" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-wider mb-2">Category</label>
                                <input className="input"
                                    placeholder="e.g. Computer Science" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-text-secondary uppercase tracking-wider mb-2">Description</label>
                                <textarea className="w-full px-4 py-3 bg-surface border border-border rounded-2xl focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none transition-shadow min-h-[140px] resize-y font-medium text-text bg-surface-elevated shadow-sm"
                                    placeholder="Briefly describe what students will learn..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-border flex justify-end gap-4 bg-surface-alt">
                            <button className="btn btn-ghost px-8" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="btn btn-primary px-10 shadow-accent" onClick={handleCreate} disabled={!form.title}>Create Course</button>
                        </div>
                    </div>
                </div>
            )}

            {courses.length === 0 ? (
                <div className="text-center py-24 px-6 bg-surface border border-border rounded-[2.5rem] shadow-sm max-w-4xl mx-auto">
                    <div className="w-24 h-24 bg-accent-light text-accent rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <BookOpen size={48} strokeWidth={2.5}/>
                    </div>
                    <h3 className="text-3xl font-black text-text mb-4 tracking-tight">No courses created yet</h3>
                    <p className="text-xl text-text-secondary font-medium max-w-xl mx-auto mb-10">Share your knowledge with the world. Create your first course to get started.</p>
                    <button className="btn btn-primary btn-lg shadow-accent px-10" onClick={() => setShowCreate(true)}>
                        <PlusCircle size={24} className="mr-3" /> Create Your First Course
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {courses.map(c => (
                        <div key={c.id} className="course-card group min-h-[420px]">
                            {/* Course Image Placeholder */}
                            <div className="course-card-img bg-surface-alt !h-48 border-b border-border">
                                <BookOpen size={64} className="text-text-muted opacity-50 transition-transform duration-500 group-hover:scale-110" strokeWidth={1}/>
                                <span className={`absolute top-4 right-4 px-3 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl shadow-sm backdrop-blur-md ${c.is_published ? 'bg-success text-white' : 'bg-surface/90 text-text-secondary border border-border'}`}>
                                    {c.is_published ? 'Live' : 'Draft'}
                                </span>
                            </div>

                            <div className="course-card-body pb-6 flex flex-col flex-grow">
                                <div className="text-xs font-black text-accent uppercase tracking-widest mb-3 mt-1 bg-accent-light w-max px-2.5 py-1 rounded-md">{c.category || 'Uncategorized'}</div>
                                <h3 className="course-card-title !mb-4" title={c.title}>{c.title}</h3>

                                <div className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-text-muted mb-6 mt-auto">
                                    <span className="flex items-center gap-2 bg-surface-alt px-3 py-1.5 rounded-lg border border-border shadow-sm"><Play size={16} /> {c.lecture_count || 0}</span>
                                    <span className="flex items-center gap-2 bg-surface-alt px-3 py-1.5 rounded-lg border border-border shadow-sm"><Users size={16} /> {c.student_count || 0}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border">
                                    <button className="col-span-2 btn btn-secondary w-full" onClick={() => navigate(`/manage-courses/${c.id}`)}>
                                        <Settings size={18} /> Manage Course Content
                                    </button>
                                    <button className={`btn w-full ${c.is_published ? 'bg-warning-light text-warning hover:bg-warning hover:text-white' : 'bg-success-light text-success hover:bg-success hover:text-white'}`} onClick={() => handlePublish(c)}>
                                        <Eye size={18} /> {c.is_published ? 'Unpublish' : 'Publish'}
                                    </button>
                                    <button className="btn bg-danger-light text-danger hover:bg-danger hover:text-white w-full" onClick={() => handleDelete(c.id)}>
                                        <Trash2 size={18} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
