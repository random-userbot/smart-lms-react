import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/client';
import { Users, BookOpen, Star, AlertCircle, TrendingUp, Search } from 'lucide-react';

export default function TeacherOverview() {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminAPI.listTeachers()
            .then(res => setTeachers(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSelect = (id) => {
        adminAPI.getTeacher(id)
            .then(res => {
                setStats(res.data);
                setSelectedTeacher(teachers.find(t => t.id === id));
            })
            .catch(() => { });
    };

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3 border-l-8 border-accent pl-6 py-2">Teacher Overview</h1>
                <p className="text-xl text-text-secondary font-medium ml-6">Analyze teacher performance and manage faculty details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
                {/* Teacher List */}
                <div className="col-span-1">
                    <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden sticky top-8">
                        <div className="p-8 border-b border-border font-black text-text text-2xl tracking-tight bg-surface-alt flex items-center justify-between">
                            Registered Teachers
                            <span className="bg-accent-light text-accent text-sm px-3 py-1 rounded-xl shadow-sm border border-accent/20">{teachers.length}</span>
                        </div>
                        {teachers.length === 0 ? (
                            <div className="p-10 text-center text-text-muted font-medium bg-surface-alt">
                                <Users size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No teachers yet.</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4 max-h-[800px] overflow-y-auto scrollbar-hide">
                                {teachers.map(t => (
                                    <div key={t.id}
                                        className={`p-6 rounded-2xl cursor-pointer transition-all border-2 group ${selectedTeacher?.id === t.id ? 'border-accent bg-accent-light shadow-md' : 'border-border bg-surface hover:border-accent/40 hover:bg-surface-alt'}`}
                                        onClick={() => handleSelect(t.id)}>
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className={`font-black text-lg mb-1 truncate ${selectedTeacher?.id === t.id ? 'text-accent' : 'text-text group-hover:text-accent'}`}>{t.full_name}</div>
                                                <div className="text-sm font-medium text-text-secondary w-full truncate mb-4">{t.email}</div>
                                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-success">
                                                    <span className="w-2 h-2 rounded-full bg-success"></span>
                                                    Active
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-[1rem] bg-surface-elevated text-text-muted flex items-center justify-center font-black text-lg shadow-inner group-hover:shadow-sm transition-all border border-border">
                                                {t.full_name.charAt(0)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Teacher Details */}
                <div className="col-span-1 lg:col-span-2">
                    {!selectedTeacher ? (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-surface-alt border-2 border-dashed border-border rounded-[2.5rem] shadow-sm p-12 text-center">
                            <div className="p-8 bg-surface rounded-[2rem] text-text-muted opacity-50 mb-6 shadow-sm border border-border"><Users size={80} strokeWidth={1.5} /></div>
                            <h2 className="text-2xl font-black text-text tracking-tight mb-2">Select a teacher</h2>
                            <p className="text-text-secondary font-medium text-lg">Click on any teacher from the list to view their courses and performance stats.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-surface rounded-3xl p-8 md:p-12 shadow-sm border border-border">
                                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
                                    <div className="w-24 h-24 rounded-3xl bg-accent-light text-accent border-2 border-accent/20 flex items-center justify-center font-black text-4xl shadow-md flex-shrink-0">
                                        {selectedTeacher.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-text tracking-tight">{selectedTeacher.full_name}</h2>
                                        <p className="text-xl text-text-secondary font-medium mt-1">{selectedTeacher.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-surface-alt rounded-[1.5rem] p-6 border border-border text-center shadow-inner hover:shadow-md transition-shadow">
                                        <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Courses Hosted</div>
                                        <div className="text-4xl font-black text-text">{stats?.total_courses || 0}</div>
                                    </div>
                                    <div className="bg-surface-alt rounded-[1.5rem] p-6 border border-border text-center shadow-inner hover:shadow-md transition-shadow">
                                        <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Total Students</div>
                                        <div className="text-4xl font-black text-text">{stats?.total_students || 0}</div>
                                    </div>
                                    <div className="bg-accent-light rounded-[1.5rem] p-6 border border-accent/20 text-center shadow-inner hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity"><TrendingUp size={100} /></div>
                                        <div className="text-xs font-black text-accent uppercase tracking-widest mb-3 relative z-10">Avg AI Teaching Score</div>
                                        <div className="text-4xl font-black text-accent relative z-10">{stats?.avg_teaching_score || 'N/A'}</div>
                                    </div>
                                    <div className="bg-success-light rounded-[1.5rem] p-6 border border-success/20 text-center shadow-inner hover:shadow-md transition-shadow">
                                        <div className="text-xs font-black text-success uppercase tracking-widest mb-3">Student Rating</div>
                                        <div className="text-4xl font-black text-success flex items-center justify-center gap-2">4.8 <Star size={24} className="fill-success opacity-80" /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface rounded-3xl p-8 md:p-12 shadow-sm border border-border">
                                <h3 className="text-2xl font-black text-text mb-8 tracking-tight flex items-center gap-3"><BookOpen className="text-accent" size={28} /> Published Courses</h3>
                                {stats?.courses && stats.courses.length > 0 ? (
                                    <div className="space-y-5">
                                        {stats.courses.map((c, i) => (
                                            <div key={c.id} className="p-6 md:p-8 border-2 border-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-accent/30 hover:bg-surface-alt transition-colors group">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-surface-elevated border border-border rounded-xl flex items-center justify-center font-black text-text-muted group-hover:text-accent group-hover:border-accent/30 transition-colors shadow-sm">{i + 1}</div>
                                                    <div>
                                                        <div className="text-xl font-bold text-text mb-1 group-hover:text-accent transition-colors">{c.title}</div>
                                                        <div className="text-sm font-black uppercase tracking-widest text-text-muted flex items-center gap-2 mt-2">
                                                            <Users size={16} /> {c.student_count || 0} Enrolled
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl shadow-sm border w-fit ${c.is_published ? 'bg-success-light text-success border-success/20' : 'bg-warning-light text-warning border-warning/20'}`}>
                                                    {c.is_published ? 'Live On Platform' : 'Draft Mode'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 border-2 border-dashed border-border rounded-3xl text-center bg-surface-alt">
                                        <p className="text-text-secondary font-bold text-lg">No courses created yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
