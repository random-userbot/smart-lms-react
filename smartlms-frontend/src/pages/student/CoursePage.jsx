import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, lecturesAPI } from '../../api/client';
import { Play, FileText, Clock, Users, ChevronRight, BookOpen } from 'lucide-react';
import { useActivity } from '../../context/ActivityTracker';
import { CoursePageSkeleton } from '../../components/ui/PageSkeletons';

export default function CoursePage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { trackEvent } = useActivity();
    const [course, setCourse] = useState(null);
    const [lectures, setLectures] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        trackEvent('course_viewed', { course_id: courseId });
        Promise.all([
            coursesAPI.get(courseId),
            lecturesAPI.getByCourse(courseId),
            lecturesAPI.getCourseMaterials(courseId).catch(() => ({ data: [] })),
        ]).then(([courseRes, lecturesRes, materialsRes]) => {
            setCourse(courseRes.data);
            setLectures(lecturesRes.data || []);
            setMaterials(materialsRes.data || []);
        }).finally(() => setLoading(false));
    }, [courseId]);

    if (loading) return <CoursePageSkeleton />;
    if (!course) return <div className="page-container text-center pt-24 text-text-muted font-bold text-2xl">Course not found</div>;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-surface-alt py-12 animate-in fade-in relative overflow-hidden">
            <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-52 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
            <div className="max-w-[1280px] mx-auto px-6 space-y-12 relative z-10">
            {/* Course Header */}
            <div className="bg-linear-to-br from-primary to-accent text-white rounded-[2.5rem] shadow-lg border border-white/20 p-10 md:p-14 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none -translate-y-10 translate-x-10">
                    <BookOpen size={300} />
                </div>
                <div className="absolute inset-0 bg-linear-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                
                <div className="relative z-10 w-full max-w-4xl">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/85 mb-4">Smart LMS Course Space</div>
                    <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 leading-[1.1] tracking-tight pr-10">{course.title}</h1>
                    <p className="text-xl text-white/85 mb-10 font-medium leading-relaxed">
                        {course.description || 'No description provided for this course.'}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm font-black uppercase tracking-widest text-white/90">
                        <span className="flex items-center gap-2.5 bg-white/10 border border-white/25 px-6 py-3.5 rounded-2xl shadow-sm transition-colors">
                            <Users size={20} className="text-white" strokeWidth={2.5}/> Instructor: {course.teacher_name}
                        </span>
                        <span className="flex items-center gap-2.5 bg-white/10 border border-white/25 px-6 py-3.5 rounded-2xl shadow-sm transition-colors">
                            <Play size={20} className="text-white" strokeWidth={2.5} /> {lectures.length} Lectures
                        </span>
                        <span className="flex items-center gap-2.5 bg-white/10 border border-white/25 px-6 py-3.5 rounded-2xl shadow-sm transition-colors">
                            <Users size={20} className="text-white" strokeWidth={2.5} /> {course.student_count} Enrolled
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col lg:flex-row gap-12">
                {/* Curriculum / Lectures column */}
                <div className="flex-1 space-y-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-text flex items-center gap-3 tracking-tight">
                            <Play className="text-accent" size={28} strokeWidth={2.5}/> Curriculum
                        </h2>
                        <div className="h-1 flex-1 bg-border rounded-full hidden sm:block"></div>
                    </div>

                    {lectures.length === 0 ? (
                        <div className="bg-surface rounded-[2rem] border border-border p-16 text-center text-text-muted shadow-sm flex flex-col items-center">
                            <div className="bg-surface-alt p-6 rounded-[1.5rem] mb-6"><Play size={40} className="text-border" /></div>
                            <h3 className="text-2xl font-black text-text mb-2">No lectures available yet</h3>
                            <p className="text-lg font-medium text-text-secondary">The instructor hasn't published any lectures for this course.</p>
                        </div>
                    ) : (
                        <div className="glass-premium rounded-[2rem] shadow-sm border border-border overflow-hidden divide-y divide-border">
                            {lectures.map((lecture, i) => (
                                <div key={lecture.id}
                                    className="flex items-center gap-6 p-6 md:p-8 hover:bg-surface-alt cursor-pointer transition-colors group"
                                    onClick={() => {
                                        trackEvent('lecture_clicked', { lecture_id: lecture.id, lecture_title: lecture.title });
                                        navigate(`/lectures/${lecture.id}`);
                                    }}>

                                    <div className="h-16 w-16 rounded-2xl bg-accent-light text-accent flex items-center justify-center font-black text-2xl group-hover:bg-accent group-hover:text-white transition-colors shadow-sm flex-shrink-0">
                                        {i + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-black text-text mb-1.5 group-hover:text-accent transition-colors truncate">{lecture.title}</h3>
                                        {lecture.description && (
                                            <p className="text-base text-text-secondary line-clamp-1 font-medium">{lecture.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-5 flex-shrink-0">
                                        {lecture.duration > 0 && (
                                            <span className="hidden sm:flex items-center gap-2 text-sm font-black text-text-muted uppercase tracking-widest">
                                                <Clock size={18} /> {Math.round(lecture.duration / 60)}m
                                            </span>
                                        )}
                                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center border border-border group-hover:bg-accent group-hover:border-accent group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight size={24} className="text-text-muted group-hover:text-white" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Materials Sidebar */}
                <div className="w-full lg:w-96 space-y-8 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-text flex items-center gap-3 tracking-tight">
                            <FileText className="text-accent" size={28} strokeWidth={2.5}/> Resources
                        </h2>
                        <div className="h-1 flex-1 bg-border rounded-full hidden sm:block"></div>
                    </div>

                    {materials.length === 0 ? (
                        <div className="glass-premium rounded-[2rem] border border-border p-10 text-center text-text-muted">
                            <p className="text-base font-black uppercase tracking-widest">No supplementary materials</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {materials.map(mat => (
                                <a key={mat.id} href={mat.file_url} target="_blank" rel="noreferrer"
                                    className="block glass-premium rounded-2xl shadow-sm border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all group">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3.5 bg-accent-light text-accent rounded-xl group-hover:bg-accent group-hover:text-white transition-colors flex-shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-text text-base mb-1.5 group-hover:text-accent transition-colors truncate">{mat.title}</h4>
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-alt border border-border px-2.5 py-1 rounded-lg">
                                                {mat.file_type}
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
