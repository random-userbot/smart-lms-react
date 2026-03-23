import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/client';
import { Users, BookOpen, Star, AlertCircle, TrendingUp, Search } from 'lucide-react';
import { AdminPageSkeleton } from '../../components/ui/PageSkeletons';

export default function TeacherOverview() {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminAPI.listTeachers()
            .then(res => setTeachers(res.data || []))
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

    if (loading) return <AdminPageSkeleton />;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-surface-alt w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in relative overflow-hidden">
            <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-52 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
            
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3 border-l-8 border-accent pl-6 py-2">Teacher Overview</h1>
                <p className="text-xl text-text-secondary font-medium ml-6">Analyze teacher performance and manage faculty details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 relative z-10">
                {/* Teacher List */}
                <div className="col-span-1">
                    <div className="glass-premium rounded-3xl shadow-accent border border-border/60 overflow-hidden sticky top-8">
                        <div className="p-8 border-b border-border/20 font-black text-text text-2xl tracking-tight bg-surface/50 backdrop-blur-md flex items-center justify-between">
                            Registered Teachers
                            <span className="bg-accent-light text-accent text-sm px-3 py-1 rounded-xl border border-accent/30 leading-none">{teachers.length}</span>
                        </div>
                        {teachers.length === 0 ? (
                            <div className="p-10 text-center text-text-muted font-medium bg-surface/30">
                                <Users size={48} className="mx-auto mb-4 opacity-50 text-accent" />
                                <p className="text-lg">No teachers yet.</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4 max-h-[800px] overflow-y-auto scrollbar-hide bg-surface-elevated/20">
                                {teachers.map(t => (
                                    <div key={t.id}
                                        className={`p-6 rounded-2xl cursor-pointer transition-all border group ${selectedTeacher?.id === t.id ? 'border-accent/40 bg-accent-light shadow-md' : 'border-border/20 bg-surface/40 hover:border-accent/30 hover:bg-surface/60'}`}
                                        onClick={() => handleSelect(t.id)}>
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className={`font-black text-lg mb-1 truncate ${selectedTeacher?.id === t.id ? 'text-accent' : 'text-text group-hover:text-accent'}`}>{t.full_name}</div>
                                                <div className="text-sm font-medium text-text-secondary w-full truncate mb-4">{t.email}</div>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
                                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                                    Active
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-[1rem] bg-surface-alt/50 text-accent flex items-center justify-center font-black text-lg shadow-sm transition-all border border-border/40">
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
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-surface/20 border border-dashed border-border rounded-[2.5rem] shadow-sm p-12 text-center backdrop-blur-sm">
                            <div className="p-8 bg-surface-alt/50 rounded-[2rem] text-accent/40 mb-6 shadow-inner border border-border/10"><Users size={80} strokeWidth={1} /></div>
                            <h2 className="text-2xl font-black text-text tracking-tight mb-2">Select a teacher</h2>
                            <p className="text-text-secondary font-medium text-lg">Click on any teacher from the list to view their courses and performance stats.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="glass-premium rounded-[2.5rem] p-8 md:p-12 shadow-accent border border-border/60">
                                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
                                    <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-primary/20 to-accent/20 text-accent border border-accent/30 flex items-center justify-center font-black text-4xl shadow-sm flex-shrink-0">
                                        {selectedTeacher.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-text tracking-tight">{selectedTeacher.full_name}</h2>
                                        <p className="text-xl text-text-secondary font-medium mt-1">{selectedTeacher.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-surface/40 backdrop-blur-sm rounded-[1.5rem] p-6 border border-border/10 text-center shadow-sm hover:shadow-accent/20 transition-all">
                                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Courses Hosted</div>
                                        <div className="text-4xl font-black text-text font-mono">{stats?.total_courses || 0}</div>
                                    </div>
                                    <div className="bg-surface/40 backdrop-blur-sm rounded-[1.5rem] p-6 border border-border/10 text-center shadow-sm hover:shadow-accent/20 transition-all">
                                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Total Students</div>
                                        <div className="text-4xl font-black text-text font-mono">{stats?.total_students || 0}</div>
                                    </div>
                                    <div className="bg-primary/10 rounded-[1.5rem] p-6 border border-primary/30 text-center shadow-inner transition-all relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:opacity-20 transition-opacity text-primary"><TrendingUp size={100} /></div>
                                        <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 relative z-10">Avg AI Teaching Score</div>
                                        <div className="text-4xl font-black text-primary relative z-10 font-mono">{stats?.avg_teaching_score || 'N/A'}</div>
                                    </div>
                                    <div className="bg-accent/10 rounded-[1.5rem] p-6 border border-accent/20 text-center shadow-inner transition-all">
                                        <div className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">Student Rating</div>
                                        <div className="text-4xl font-black text-accent flex items-center justify-center gap-2 font-mono">4.8 <Star size={24} className="fill-accent opacity-80" /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-premium rounded-[2.5rem] p-8 md:p-12 shadow-accent border border-border/60">
                                <h3 className="text-2xl font-black text-text mb-8 tracking-tight flex items-center gap-3"><BookOpen className="text-accent" size={28} /> Published Courses</h3>
                                {stats?.courses && stats.courses.length > 0 ? (
                                    <div className="space-y-5">
                                        {stats.courses.map((c, i) => (
                                            <div key={c.id} className="p-6 md:p-8 border border-border/10 bg-surface/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-accent/40 hover:bg-surface/50 hover:shadow-accent/10 transition-all duration-300 group">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-surface-alt border border-border/20 rounded-xl flex items-center justify-center font-black text-text-muted group-hover:text-accent group-hover:border-accent/30 transition-all shadow-sm">{i + 1}</div>
                                                    <div>
                                                        <div className="text-xl font-bold text-text mb-1 group-hover:text-accent transition-colors">{c.title}</div>
                                                        <div className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2 mt-2 font-mono">
                                                            <Users size={14} className="text-primary/60"/> {c.student_count || 0} Enrolled
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm border w-fit ${c.is_published ? 'bg-accent/10 text-accent border-accent/30' : 'bg-warning-light/10 text-warning border-warning/20'}`}>
                                                    {c.is_published ? 'Live On Platform' : 'Draft Mode'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 border border-dashed border-border/30 rounded-3xl text-center bg-surface/20">
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
