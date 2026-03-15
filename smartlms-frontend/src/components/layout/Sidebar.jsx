import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gamificationAPI } from '../../api/client';
import {
    LayoutDashboard, BookOpen, GraduationCap, BarChart3,
    Users, Shield, FileText, Award, MessageSquare, Settings,
    PlusCircle, ClipboardList, TrendingUp, Bot
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

    const linkClasses = (isActive) =>
        `flex items-center gap-5 px-6 py-4 rounded-[1.25rem] text-lg font-black transition-all group ${
            isActive
                ? 'bg-accent-light text-accent shadow-sm ring-1 ring-accent/20'
                : 'text-text-secondary hover:bg-surface-alt hover:text-text'
        }`;

    return (
        <aside className="w-[340px] shrink-0 bg-surface border-r border-border h-full flex flex-col py-8 px-6 overflow-y-auto hidden xl:flex shadow-sm">
            {/* Navigation */}
            <div className="space-y-2">
                <div className="px-6 py-3 text-sm font-black text-text-muted uppercase tracking-[0.2em] mb-4">Navigation</div>
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => linkClasses(isActive)}
                    >
                        <link.icon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                        {link.label}
                    </NavLink>
                ))}
            </div>

            {/* Student learning section */}
            {user.role === 'student' && (
                <div className="mt-8 pt-6 border-t border-border space-y-2">
                    <div className="px-6 py-3 text-sm font-black text-text-muted uppercase tracking-[0.2em] mb-4">Learning</div>
                    <NavLink to="/ai-tutor" className={({ isActive }) => linkClasses(isActive)}>
                        <Bot size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> AI Tutor
                    </NavLink>
                    <NavLink to="/leaderboard" className={({ isActive }) => linkClasses(isActive)}>
                        <Award size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> Leaderboard
                    </NavLink>
                </div>
            )}

            {/* Gamification card */}
            {user.role === 'student' && gamification && (
                <div className="mt-auto pt-8">
                  <div className="p-5 bg-surface-alt rounded-2xl border border-border text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Your Level</div>
                      <div className="text-3xl font-black text-accent leading-tight">{gamification.level}</div>
                      
                      <div className="mt-4 h-2 bg-border rounded-full overflow-hidden w-full relative shadow-inner">
                          <div
                              className="h-full bg-gradient-to-r from-accent to-violet-500 rounded-full transition-all duration-700 ease-out relative"
                              style={{ width: `${gamification.points % 100}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                      </div>
                      <div className="text-xs font-bold text-text-secondary mt-3"><span className="text-text font-black">{gamification.points}</span> XP Total</div>
                  </div>
                </div>
            )}
        </aside>
    );
}
