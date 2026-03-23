import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/client';
import { BookOpen, Search, Users, PlayCircle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useActivity } from '../../context/ActivityTracker';
import { CoursesPageSkeleton } from '../../components/ui/PageSkeletons';

export default function MyCourses() {
    const navigate = useNavigate();
    const { trackEvent } = useActivity();
    const [enrolled, setEnrolled] = useState([]);
    const [available, setAvailable] = useState([]);
    const [tab, setTab] = useState('enrolled');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [enrollingCourseId, setEnrollingCourseId] = useState(null);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        trackEvent('my_courses_viewed');
        Promise.all([
            coursesAPI.getMyCourses().catch(() => ({ data: [] })),
            coursesAPI.list({ published_only: true }).catch(() => ({ data: [] })),
        ]).then(([enrolledRes, availableRes]) => {
            setEnrolled(enrolledRes.data || []);
            setAvailable(availableRes.data || []);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 3000);
        return () => clearTimeout(timer);
    }, [notice]);

    const handleEnroll = async (courseId) => {
        setEnrollingCourseId(courseId);
        setNotice(null);
        try {
            await coursesAPI.enroll(courseId);
            trackEvent('course_enrolled', { course_id: courseId });
            const [enrolledRes, availableRes] = await Promise.all([
                coursesAPI.getMyCourses(),
                coursesAPI.list({ published_only: true }).catch(() => ({ data: [] })),
            ]);
            setEnrolled(enrolledRes.data || []);
            setAvailable(availableRes.data || []);
            setTab('enrolled');
            setNotice({ type: 'success', text: 'Enrolled successfully. Course moved to your Enrolled tab.' });
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to enroll' });
        } finally {
            setEnrollingCourseId(null);
        }
    };

    const enrolledIds = new Set(enrolled.map(c => c.course_id));
    const filteredAvailable = available.filter(c =>
        !enrolledIds.has(c.id) && c.title.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <CoursesPageSkeleton />;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-surface-alt w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in relative overflow-hidden">
            <div className="pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-52 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
            {notice && (
                <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-center gap-3 font-semibold ${notice.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}`}>
                    {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{notice.text}</span>
                </div>
            )}

            <div className="bg-linear-to-br from-primary to-accent rounded-4xl border border-white/20 p-8 md:p-10 text-white mb-10 shadow-lg relative overflow-hidden">
                <div className="absolute -right-8 -top-8 opacity-15 pointer-events-none"><BookOpen size={180} /></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/80 mb-4">Smart LMS Learning Hub</div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">My Learning</h1>
                    <p className="text-white/85 font-medium text-lg">Track progress, continue courses, and discover new classes.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-10">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-text tracking-tight mb-2">Course Space</h2>
                    <p className="text-text-secondary font-medium text-base md:text-lg">Everything you are enrolled in, plus recommended courses.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-12 border-b border-border pb-6 relative z-10">
                <div className="flex p-2 bg-surface rounded-2xl w-full md:w-auto shadow-sm border border-border">
                    <button className={`flex-1 md:flex-none px-8 py-3.5 text-base font-black rounded-xl transition-all ${tab === 'enrolled' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-secondary hover:bg-surface-alt'}`}
                        onClick={() => setTab('enrolled')}>Enrolled ({enrolled.length})</button>
                    <button className={`flex-1 md:flex-none px-8 py-3.5 text-base font-black rounded-xl transition-all ${tab === 'browse' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-secondary hover:bg-surface-alt'}`}
                        onClick={() => setTab('browse')}>Browse All</button>
                </div>

                {tab === 'browse' && (
                    <div className="relative w-full md:w-[450px] group">
                        <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
                        <input className="input py-4 !pl-14 text-base rounded-2xl bg-surface-elevated shadow-sm w-full" placeholder="Search available courses..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                )}
            </div>

            {tab === 'enrolled' ? (
                enrolled.length === 0 ? (
                    <div className="text-center py-24 px-6 bg-surface border border-border rounded-[2.5rem] shadow-sm max-w-4xl mx-auto">
                        <div className="w-24 h-24 bg-accent-light text-accent rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <BookOpen size={48} strokeWidth={2.5}/>
                        </div>
                        <h3 className="text-3xl font-black text-text mb-4 tracking-tight">No Enrolled Courses</h3>
                        <p className="text-xl text-text-secondary mb-10 max-w-xl mx-auto font-medium">You haven't enrolled in any courses yet. Browse the catalog to start learning and tracking your ICAP engagement.</p>
                        <button className="btn btn-primary btn-lg px-10 shadow-accent"
                            onClick={() => setTab('browse')}>
                            Explore Catalog
                        </button>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Featured/Spotlight Course Section */}
                        {enrolled[0] && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div className="bg-linear-to-br from-primary to-accent rounded-3xl overflow-hidden shadow-lg border border-primary/40 cursor-pointer hover:shadow-xl hover:border-accent/40 transition-all"
                                    onClick={() => navigate(`/courses/${enrolled[0].course_id}`)}>
                                    <div className="aspect-video bg-linear-to-br from-primary-light to-accent relative overflow-hidden flex items-center justify-center">
                                        {enrolled[0].thumbnail_url ? (
                                            <img src={enrolled[0].thumbnail_url} alt="" className="w-full h-full object-cover opacity-70" />
                                        ) : (
                                            <BookOpen size={80} className="text-white/30" strokeWidth={1} />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center space-y-6">
                                    <div>
                                        <h2 className="text-4xl font-black text-text mb-2">{enrolled[0].title}</h2>
                                        <p className="text-sm font-bold text-text-muted uppercase tracking-widest">{enrolled[0].teacher_name}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-text-secondary uppercase">Your Progress</span>
                                                <span className="text-3xl font-black text-accent">{Math.round(enrolled[0].progress || 0)}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-surface-elevated rounded-full overflow-hidden">
                                                <div className="h-full bg-linear-to-r from-primary to-accent" style={{ width: `${enrolled[0].progress || 0}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-success-light rounded-2xl p-4 border border-success/20">
                                                <p className="text-success font-bold">{enrolled[0].completed_lectures || 0} Lectures</p>
                                                <p className="text-xs text-success/80 font-medium">of {enrolled[0].total_lectures || 0}</p>
                                            </div>
                                            <div className="bg-warning-light rounded-2xl p-4 border border-warning/20">
                                                <p className="text-warning font-bold">{enrolled[0].avg_engagement || 0}%</p>
                                                <p className="text-xs text-warning/80 font-medium">Engagement</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn btn-primary btn-lg w-full shadow-lg"
                                        onClick={() => navigate(`/courses/${enrolled[0].course_id}`)}>
                                        Continue Learning
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Other Courses Section */}
                        {enrolled.length > 1 && (
                            <div>
                                <h3 className="text-2xl font-black text-text mb-6">Your Other Courses</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {enrolled.slice(1).map(course => (
                                        <div key={course.course_id} className="course-card group"
                                            onClick={() => navigate(`/courses/${course.course_id}`)}>
                                            <div className="course-card-img">
                                                {course.thumbnail_url ?
                                                    <img src={course.thumbnail_url} alt="" /> :
                                                    <BookOpen size={64} className="text-white/30" strokeWidth={1}/>}
                                                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                                    <div className="flex items-center gap-2 text-white font-bold">
                                                        <PlayCircle size={20}/> Continue Learning
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="course-card-body">
                                                <h3 className="course-card-title">{course.title}</h3>
                                                <span className="text-sm font-black text-text-muted uppercase tracking-widest mb-8 block">{course.teacher_name}</span>

                                                <div className="mt-auto">
                                                    <div className="flex justify-between items-end mb-3">
                                                        <span className="text-xs font-black text-text-muted uppercase tracking-widest">Progress</span>
                                                        <span className="text-base font-black text-accent">{Math.round(course.progress || 0)}%</span>
                                                    </div>
                                                    <div className="progress-bar">
                                                        <div className="progress-bar-fill" style={{ width: `${course.progress || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : (
                filteredAvailable.length === 0 ? (
                    <div className="text-center py-24 px-6 bg-surface border border-border rounded-[2.5rem] shadow-sm max-w-4xl mx-auto">
                        <div className="w-24 h-24 bg-surface-alt text-text-muted rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <Search size={48} strokeWidth={2.5}/>
                        </div>
                        <h3 className="text-3xl font-black text-text mb-4 tracking-tight">No Courses Found</h3>
                        <p className="text-xl text-text-secondary font-medium">We couldn't find any courses matching your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredAvailable.map(course => (
                            <div key={course.id} className="course-card group">
                                <div className="course-card-img">
                                    {course.thumbnail_url ?
                                        <img src={course.thumbnail_url} alt="" /> :
                                        <BookOpen size={64} className="text-white/30" strokeWidth={1} />}
                                </div>
                                <div className="course-card-body">
                                    <div className="mb-4">
                                        <h3 className="course-card-title">{course.title}</h3>
                                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-text-muted">
                                            <span>{course.teacher_name}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                                            <span className="flex items-center gap-1"><PlayCircle size={14}/> {course.lecture_count || 0} Lectures</span>
                                        </div>
                                    </div>
                                    <p className="text-base font-medium text-text-secondary leading-relaxed mb-8 line-clamp-3">
                                        {course.description || 'No description provided.'}
                                    </p>
                                    <button className="btn btn-secondary btn-lg w-full mt-auto shrink-0 group-hover:bg-accent group-hover:text-white group-hover:border-accent shadow-sm"
                                        disabled={enrollingCourseId === course.id}
                                        onClick={() => handleEnroll(course.id)}>
                                        {enrollingCourseId === course.id ? (
                                            <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Enrolling...</span>
                                        ) : 'Enroll Now'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
