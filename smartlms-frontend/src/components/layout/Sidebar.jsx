import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gamificationAPI } from '../../api/client';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, BookOpen, GraduationCap, BarChart3,
    Users, Shield, FileText, Award, MessageSquare, Settings,
    PlusCircle, ClipboardList, TrendingUp, Bot, Sparkles
} from 'lucide-react';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();
    const [gamification, setGamification] = useState(null);

    useEffect(() => {
        if (user?.role === 'student') {
            gamificationAPI.getProfile().then(res => setGamification(res.data)).catch(() => { });
        }
    }, [user, location.pathname]);

    if (!user) return null;

    const studentLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-courses', icon: BookOpen, label: 'My Courses' },
        { to: '/my-analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/messages', icon: MessageSquare, label: 'Messages' },
        { to: '/profile', icon: Settings, label: 'Profile' },
    ];

    const teacherLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/manage-courses', icon: BookOpen, label: 'My Courses' },
        { to: '/teaching-dashboard', icon: TrendingUp, label: 'Teaching Score' },
        { to: '/messages', icon: MessageSquare, label: 'Messages' },
        { to: '/profile', icon: Settings, label: 'Profile' },
    ];

    const adminLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/teachers', icon: GraduationCap, label: 'Teachers' },
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/profile', icon: Settings, label: 'Profile' },
    ];

    const links = user.role === 'admin' ? adminLinks :
        user.role === 'teacher' ? teacherLinks : studentLinks;

    return (
        <aside className="w-[280px] shrink-0 bg-surface border-r border-border h-full flex flex-col py-6 px-4 overflow-y-auto hidden xl:flex"
            style={{
                boxShadow: '1px 0 0 0 var(--color-border-light)',
            }}>
            {/* Navigation */}
            <div className="space-y-1">
                <div className="px-4 py-2 text-[11px] font-black text-text-muted uppercase tracking-[0.15em] mb-2">Navigation</div>
                {links.map((link, i) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 group relative ${
                                isActive
                                    ? 'bg-accent-light text-accent font-bold'
                                    : 'text-text-secondary hover:bg-surface-alt hover:text-text'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-accent"
                                        layoutId="sidebar-indicator"
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform shrink-0" />
                                {link.label}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            {/* Student learning section */}
            {user.role === 'student' && (
                <div className="mt-6 pt-4 border-t border-border space-y-1">
                    <div className="px-4 py-2 text-[11px] font-black text-text-muted uppercase tracking-[0.15em] mb-2">Learning</div>
                    <NavLink to="/ai-tutor" className={({ isActive }) =>
                        `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all group relative ${
                            isActive ? 'bg-accent-light text-accent font-bold' : 'text-text-secondary hover:bg-surface-alt hover:text-text'
                        }`
                    }>
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-accent"
                                        layoutId="sidebar-indicator"
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <Bot size={20} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform" />
                                AI Tutor
                                <Sparkles size={14} className="ml-auto text-accent opacity-60" />
                            </>
                        )}
                    </NavLink>
                    <NavLink to="/leaderboard" className={({ isActive }) =>
                        `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all group relative ${
                            isActive ? 'bg-accent-light text-accent font-bold' : 'text-text-secondary hover:bg-surface-alt hover:text-text'
                        }`
                    }>
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-accent"
                                        layoutId="sidebar-indicator"
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <Award size={20} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform" />
                                Leaderboard
                            </>
                        )}
                    </NavLink>
                </div>
            )}

            {/* Gamification card */}
            {user.role === 'student' && gamification && (
                <div className="mt-auto pt-6">
                    <div className="p-4 rounded-2xl border border-border text-center relative overflow-hidden group"
                        style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.12))',
                        }}>
                        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Your Level</div>
                        <div className="text-2xl font-black text-accent leading-tight">{gamification.level}</div>
                        
                        <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden w-full relative">
                            <motion.div
                                className="h-full rounded-full relative"
                                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${gamification.points % 100}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            />
                        </div>
                        <div className="text-xs font-bold text-text-secondary mt-2"><span className="text-text font-black">{gamification.points}</span> XP</div>
                    </div>
                </div>
            )}
        </aside>
    );
}
