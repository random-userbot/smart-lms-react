import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActivity } from '../../context/ActivityTracker';
import { notificationsAPI, messagesAPI } from '../../api/client';
import {
    Bell, User, LogOut, Settings, ChevronDown,
    BookOpen, Activity, Zap, MessageSquare, Menu, X
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { trackClick, getSessionDuration } = useActivity();
    const navigate = useNavigate();
    const location = useLocation();
    
    // States
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [sessionTime, setSessionTime] = useState(0);
    const dropdownRef = useRef(null);

    // Fetch unread notifications + messages
    useEffect(() => {
        if (user) {
            notificationsAPI.getUnreadCount()
                .then(res => setUnreadCount(res.data.count))
                .catch(() => { });
            messagesAPI.getUnreadCount()
                .then(res => setUnreadMessages(res.data.count))
                .catch(() => { });
        }
    }, [user, location.pathname]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Session timer display
    useEffect(() => {
        if (!user || !getSessionDuration) return;
        const interval = setInterval(() => {
            setSessionTime(getSessionDuration());
        }, 1000);
        return () => clearInterval(interval);
    }, [user, getSessionDuration]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const handleLogout = () => {
        trackClick?.('logout');
        logout();
        navigate('/login');
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-xl border-b border-border transition-colors h-20 md:h-24 flex items-center shadow-xs">
            <div className="max-w-[1440px] w-full mx-auto px-6 md:px-12 flex items-center justify-between">
                
                {/* Logo & Brand */}
                <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                        <BookOpen size={24} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight text-text">
                        Smart<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">LMS</span>
                    </span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-3 md:gap-5">
                    
                    {/* Always visible Theme Toggle */}
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>

                    {!user ? (
                        /* Public nav - Udemy Style large buttons */
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login" className="btn btn-ghost font-bold text-[15px] px-5 py-2.5">
                                Log in
                            </Link>
                            <Link to="/register" className="btn btn-primary font-bold text-[15px] px-6 py-2.5 shadow-md">
                                Sign up
                            </Link>
                        </div>
                    ) : (
                        /* Authenticated nav */
                        <div className="hidden md:flex items-center gap-3 md:gap-4">
                            {/* Session timer */}
                            {sessionTime > 0 && (
                                <div className="flex flex-col items-end justify-center px-4 border-r border-border h-10">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Session</span>
                                    <div className="flex items-center gap-1.5 text-accent font-bold text-xs tabular-nums bg-accent-light px-2 py-0.5 rounded-md">
                                        <Zap size={12} className="animate-pulse" />
                                        <span>{formatTime(sessionTime)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Circular Icon Buttons */}
                            <button
                                className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-surface-alt border border-transparent hover:border-border transition-all relative"
                                onClick={() => navigate('/messages')}
                                title="Messages"
                            >
                                <MessageSquare size={20} strokeWidth={2} />
                                {unreadMessages > 0 && (
                                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-danger text-white text-[10px] font-black rounded-full border-2 border-surface">
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                    </span>
                                )}
                            </button>

                            <button
                                className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-surface-alt border border-transparent hover:border-border transition-all relative"
                                onClick={() => navigate('/dashboard')}
                                title="Notifications"
                            >
                                <Bell size={20} strokeWidth={2} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-surface"></span>
                                )}
                            </button>

                            {/* Profile Dropdown */}
                            <div ref={dropdownRef} className="relative ml-2">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-3 pl-1 pr-3 py-1 border border-border rounded-full hover:bg-surface-alt hover:border-accent-light transition-all focus:ring-4 focus:ring-accent-light outline-none bg-surface"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-violet-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex flex-col items-start pr-1">
                                      <span className="text-sm font-bold text-text leading-tight">
                                          {user.full_name?.split(' ')[0]}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                          {user.role}
                                      </span>
                                    </div>
                                    <ChevronDown size={16} className={`text-text-muted transition-transform duration-300 ${dropdownOpen ? 'rotate-180 text-accent' : ''}`} />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-64 bg-surface rounded-2xl shadow-xl border border-border py-2 z-50 origin-top-right animate-in slide-in-from-top-2 fade-in">
                                        {/* User info header */}
                                        <div className="px-5 py-4 border-b border-border bg-surface-alt/50 rounded-t-2xl m-1 mt-0">
                                            <div className="text-base font-bold text-text truncate">{user.full_name}</div>
                                            <div className="text-xs font-medium text-text-muted truncate mt-1">{user.email}</div>
                                        </div>

                                        {/* Menu items */}
                                        <div className="px-3 py-3 border-b border-border text-sm font-semibold text-text-secondary flex flex-col gap-1">
                                            <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt hover:text-accent rounded-xl transition-colors text-left" onClick={() => { navigate('/profile'); setDropdownOpen(false); }}>
                                                <User size={18} strokeWidth={2} /> Profile
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt hover:text-accent rounded-xl transition-colors text-left" onClick={() => { navigate('/messages'); setDropdownOpen(false); }}>
                                                <MessageSquare size={18} strokeWidth={2} /> Messages
                                                {unreadMessages > 0 && <span className="ml-auto bg-accent-light text-accent text-xs font-black px-2 py-0.5 rounded-md">{unreadMessages}</span>}
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt hover:text-accent rounded-xl transition-colors text-left" onClick={() => { navigate('/my-analytics'); setDropdownOpen(false); }}>
                                                <Activity size={18} strokeWidth={2} /> My Analytics
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt hover:text-accent rounded-xl transition-colors text-left" onClick={() => { navigate('/profile'); setDropdownOpen(false); }}>
                                                <Settings size={18} strokeWidth={2} /> Settings
                                            </button>
                                        </div>

                                        {/* Logout */}
                                        <div className="p-3">
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-danger-light text-danger rounded-xl transition-colors text-left text-sm font-bold"
                                                onClick={handleLogout}
                                            >
                                                <LogOut size={18} strokeWidth={2.5} /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mobile Menu Button */}
                    <button 
                      className="md:hidden p-2 text-text-secondary hover:text-accent hover:bg-surface-alt rounded-xl"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                      {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Dropdown (Simplified) */}
            {mobileMenuOpen && (
              <div className="absolute top-[100%] left-0 w-full bg-surface border-b border-border shadow-lg p-4 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-4 z-40">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <span className="font-bold text-text-secondary text-sm">Theme</span>
                    <ThemeToggle />
                  </div>
                  {!user ? (
                    <div className="flex flex-col gap-2">
                      <Link to="/login" className="btn btn-secondary w-full" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                      <Link to="/register" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 border-t border-border pt-4">
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {user.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-text">{user.full_name}</div>
                          <div className="text-xs text-text-muted">{user.email}</div>
                        </div>
                      </div>
                      <button className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt rounded-xl text-left font-semibold text-text-secondary" onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}>
                          <BookOpen size={18} /> Dashboard
                      </button>
                      <button className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt rounded-xl text-left font-semibold text-text-secondary" onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}>
                          <User size={18} /> Profile
                      </button>
                      <button className="flex items-center gap-3 px-4 py-3 hover:bg-danger-light hover:text-danger rounded-xl text-left font-bold text-danger mt-2" onClick={handleLogout}>
                          <LogOut size={18} /> Sign Out
                      </button>
                    </div>
                  )}
              </div>
            )}
        </nav>
    );
}
