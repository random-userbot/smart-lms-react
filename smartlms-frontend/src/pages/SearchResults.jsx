import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { coursesAPI, messagesAPI } from '../api/client';
import { BookOpen, MessageSquare, ChevronRight, ChevronLeft, Search, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

const RowSection = ({ title, icon: Icon, children, isEmpty, isLoading, scrollRef }) => {
    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <div className="mb-16 last:mb-0">
            <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-2xl">
                        <Icon className="text-accent" size={28} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-text tracking-tight uppercase">{title}</h2>
                </div>
                {!isEmpty && !isLoading && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-text-muted uppercase tracking-widest bg-surface-alt px-4 py-2 rounded-xl border border-border">Slide to view more</span>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex gap-6 overflow-x-hidden py-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="min-w-[300px] h-64 bg-surface-alt rounded-[2.5rem] animate-pulse border border-border" />
                    ))}
                </div>
            ) : isEmpty ? (
                <div className="py-16 text-center bg-surface-alt rounded-[3rem] border border-dashed border-border">
                    <p className="text-text-muted font-bold text-lg italic">No results found in this category.</p>
                </div>
            ) : (
                <div className="relative group/row">
                    <div 
                        ref={scrollRef}
                        className="overflow-x-auto pb-8 hide-scrollbar cursor-grab active:cursor-grabbing scroll-smooth"
                    >
                        <div className="flex gap-8 px-2">
                            {children}
                        </div>
                    </div>
                    
                    <div className="absolute top-1/2 -left-6 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 z-10">
                        <button 
                            onClick={() => scroll('left')}
                            className="p-4 bg-surface border-2 border-border shadow-2xl rounded-full text-text-muted hover:text-accent hover:border-accent hover:scale-110 active:scale-95 transition-all"
                        >
                            <ChevronLeft size={28} strokeWidth={3} />
                        </button>
                    </div>
                    <div className="absolute top-1/2 -right-6 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 z-10">
                        <button 
                            onClick={() => scroll('right')}
                            className="p-4 bg-surface border-2 border-border shadow-2xl rounded-full text-text-muted hover:text-accent hover:border-accent hover:scale-110 active:scale-95 transition-all"
                        >
                            <ChevronRight size={28} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const courseRowRef = useRef(null);
    const messageRowRef = useRef(null);

    useEffect(() => {
        if (query) fetchResults();
    }, [query]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const [coursesRes, messagesRes] = await Promise.all([
                coursesAPI.list({ search: query }),
                messagesAPI.search({ q: query })
            ]);
            setCourses(coursesRes.data);
            setMessages(messagesRes.data);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-alt">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-accent py-12 px-6 lg:px-10 text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-20 pointer-events-none"><Search size={220} /></div>
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 text-white/85 font-black uppercase tracking-[0.2em] text-xs mb-4">
                                <Search size={14} strokeWidth={3} /> Search Intelligence
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
                                Results for <span className="text-white">"{query}"</span>
                            </h1>
                            <p className="text-white/85 font-medium text-xl max-w-2xl leading-relaxed">
                                Universal discovery across all classes, lectures, and academic communications.
                            </p>
                        </div>
                        <div className="bg-white/10 p-2 rounded-2xl border border-white/20 flex items-center gap-2">
                             <div className="px-6 py-3 bg-white rounded-xl border border-white/40 font-black text-accent text-sm shadow-sm">
                                {courses.length + messages.length} Mentions Found
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
                {/* Courses Row */}
                <div className="glass-premium rounded-[2rem] p-6 md:p-8 mb-10 border border-border/60">
                <RowSection title="Academic Classes" icon={BookOpen} isEmpty={courses.length === 0} isLoading={loading} scrollRef={courseRowRef}>
                    {courses.map(course => (
                        <motion.div 
                            key={course.id} 
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="min-w-[320px] md:min-w-[380px] bg-surface rounded-[2.5rem] border border-border shadow-sm overflow-hidden cursor-pointer group hover:border-accent hover:shadow-xl transition-all duration-300"
                            onClick={() => navigate(`/courses/${course.id}`)}
                        >
                            <div className="h-48 bg-surface-alt relative overflow-hidden">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={course.title} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/5 to-accent/20">
                                        <BookOpen className="text-accent/30" size={64} strokeWidth={1} />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="px-4 py-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                                        {course.category || 'Academic'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8">
                                <h3 className="text-xl font-black text-text mb-3 tracking-tight line-clamp-1 group-hover:text-accent transition-colors">{course.title}</h3>
                                <div className="flex items-center gap-3 text-text-muted mb-6">
                                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-black">
                                        {course.teacher_name?.[0]}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">{course.teacher_name}</span>
                                </div>
                                <div className="flex items-center justify-between pt-6 border-t border-border">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <LayoutGrid size={14} />
                                        <span className="text-xs font-black uppercase tracking-widest">{course.lecture_count} Modules</span>
                                    </div>
                                    <ChevronRight className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </RowSection>
                </div>

                {/* Messages Row */}
                <div className="glass-premium rounded-[2rem] p-6 md:p-8 border border-border/60">
                <RowSection title="Global Communications" icon={MessageSquare} isEmpty={messages.length === 0} isLoading={loading} scrollRef={messageRowRef}>
                    {messages.map(msg => (
                        <motion.div 
                            key={msg.id}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="min-w-[350px] md:min-w-[450px] bg-surface rounded-[2.5rem] border border-border shadow-sm p-8 group hover:border-accent hover:shadow-xl transition-all duration-300 relative"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-surface-alt border border-border flex items-center justify-center text-text font-black text-lg">
                                        {msg.sender_name[0]}
                                    </div>
                                    <div>
                                        <div className="font-black text-text tracking-tight">{msg.sender_name}</div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{msg.sender_role}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                                    {new Date(msg.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <div className="bg-surface-alt rounded-2xl p-5 mb-8 border border-border/50 group-hover:border-accent/20 transition-colors">
                                <p className="text-text-secondary font-medium leading-relaxed italic line-clamp-3">
                                    "{msg.content}"
                                </p>
                            </div>

                            <button 
                                onClick={() => navigate('/messages')}
                                className="w-full py-4 bg-surface rounded-xl border border-border font-black text-xs uppercase tracking-[0.2em] text-text-muted hover:bg-accent hover:border-accent hover:text-white hover:shadow-lg transition-all flex items-center justify-center gap-3 group/btn"
                            >
                                <LayoutGrid size={14} /> Open Conversation <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    ))}
                </RowSection>
                </div>

                {/* Empty Global State */}
                {!loading && courses.length === 0 && messages.length === 0 && (
                    <div className="py-32 text-center max-w-2xl mx-auto">
                        <div className="w-32 h-32 bg-surface rounded-[3rem] border border-border shadow-sm flex items-center justify-center mx-auto mb-10 text-text-muted">
                            <Search size={56} />
                        </div>
                        <h2 className="text-4xl font-black text-text tracking-tighter mb-6">Absolute Zero Findings</h2>
                        <p className="text-text-secondary font-medium text-xl leading-relaxed">
                            Our neural search couldn't identify any classes or academic messages matching <span className="text-accent underline decoration-4 underline-offset-8 decoration-accent/30">"{query}"</span>. 
                            Try broadening your parameters or checking for typos.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
