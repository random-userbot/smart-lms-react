import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gamificationAPI } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, BookOpen, GraduationCap, BarChart3,
    Users, Settings, Award, MessageSquare, ClipboardCheck,
    TrendingUp, Bot, Sparkles, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();
    const [gamification, setGamification] = useState(null);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (user?.role === 'student') {
            gamificationAPI.getProfile().then(res => setGamification(res.data)).catch(() => { });
        }
    }, [user, location.pathname]);

    if (!user) return null;

    const studentLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-courses', icon: BookOpen, label: 'My Courses' },
        { to: '/my-quizzes', icon: ClipboardCheck, label: 'Quizzes' },
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
        <motion.aside
            className={`shrink-0 bg-surface border-r border-border h-full flex flex-col py-6 overflow-y-auto overflow-x-hidden hidden xl:flex transition-all duration-300 ease-in-out relative`}
            animate={{ width: collapsed ? 80 : 280 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute top-4 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent-light transition-all z-10"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* Navigation */}
            <div className="space-y-1.5 mt-14 px-3">
                {!collapsed && (
                    <div className="px-4 py-2 text-[11px] font-black text-text-muted uppercase tracking-[0.15em] mb-2">Navigation</div>
                )}
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        title={collapsed ? link.label : undefined}
                        className={({ isActive }) =>
                            `flex items-center ${collapsed ? 'justify-center' : ''} gap-4 ${collapsed ? 'px-2' : 'px-5'} py-4 rounded-2xl text-[17px] font-semibold transition-all duration-200 group relative ${
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
                                <link.icon size={24} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform shrink-0" />
                                {!collapsed && <span className="truncate">{link.label}</span>}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            {/* Student learning section */}
            {user.role === 'student' && (
                <div className={`mt-6 pt-5 border-t border-border space-y-1.5 px-3`}>
                    {!collapsed && (
                        <div className="px-4 py-2 text-[11px] font-black text-text-muted uppercase tracking-[0.15em] mb-2">Learning</div>
                    )}
                    <NavLink to="/ai-tutor" title={collapsed ? 'AI Tutor' : undefined} className={({ isActive }) =>
                        `flex items-center ${collapsed ? 'justify-center' : ''} gap-4 ${collapsed ? 'px-2' : 'px-5'} py-4 rounded-2xl text-[17px] font-semibold transition-all group relative ${
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
                                <Bot size={24} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform shrink-0" />
                                {!collapsed && (
                                    <>
                                        <span>AI Tutor</span>
                                        <Sparkles size={14} className="ml-auto text-accent opacity-60" />
                                    </>
                                )}
                            </>
                        )}
                    </NavLink>
                    <NavLink to="/leaderboard" title={collapsed ? 'Leaderboard' : undefined} className={({ isActive }) =>
                        `flex items-center ${collapsed ? 'justify-center' : ''} gap-4 ${collapsed ? 'px-2' : 'px-5'} py-4 rounded-2xl text-[17px] font-semibold transition-all group relative ${
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
                                <Award size={24} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform shrink-0" />
                                {!collapsed && <span>Leaderboard</span>}
                            </>
                        )}
                    </NavLink>
                </div>
            )}

            {/* Gamification card */}
            {user.role === 'student' && gamification && !collapsed && (
                <div className="mt-auto pt-6 px-4">
                    <div className="p-5 rounded-2xl border border-border text-center relative overflow-hidden group bg-accent-light">
                        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Your Level</div>
                        <div className="text-3xl font-black text-accent leading-tight">{gamification.level}</div>
                        
                        <div className="mt-3 h-2 bg-border rounded-full overflow-hidden w-full relative">
                            <motion.div
                                className="h-full rounded-full bg-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${gamification.points % 100}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            />
                        </div>
                        <div className="text-sm font-bold text-text-secondary mt-2"><span className="text-text font-black">{gamification.points}</span> XP</div>
                    </div>
                </div>
            )}

            {/* Collapsed gamification */}
            {user.role === 'student' && gamification && collapsed && (
                <div className="mt-auto pt-4 px-2">
                    <div className="p-2 rounded-xl bg-accent-light text-center">
                        <div className="text-xs font-black text-accent">{gamification.level}</div>
                        <div className="text-[9px] font-bold text-text-muted">{gamification.points}xp</div>
                    </div>
                </div>
            )}
        </motion.aside>
    );
}
