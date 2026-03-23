import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActivity } from '../../context/ActivityTracker';
import { notificationsAPI, messagesAPI, coursesAPI } from '../../api/client';
import {
    Bell, User, LogOut, Settings, ChevronDown, ChevronLeft,
    BookOpen, Activity, Zap, MessageSquare, Menu, X, Search, Check, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { trackClick, getSessionDuration } = useActivity();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [sessionTime, setSessionTime] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const searchRef = useRef(null);

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

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchResults(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    const openNotifications = async () => {
        setNotifOpen(!notifOpen);
        setDropdownOpen(false);
        if (!notifOpen) {
            try {
                const res = await notificationsAPI.list({ limit: 10 });
                setNotifications(res.data || []);
            } catch { setNotifications([]); }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch { }
    };

    const handleSearch = (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.trim().length > 1) {
            setShowSearchResults(true);
        } else {
            setShowSearchResults(false);
        }
    };

    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            setShowSearchResults(false);
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-border transition-colors h-16 md:h-[72px] flex items-center bg-surface/85 backdrop-blur-xl"
            style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
            <div className="w-full px-6 md:px-10 flex items-center justify-between">
                
                {/* Back Button & Logo */}
                <div className="flex items-center gap-4">
                    {user && location.pathname !== '/dashboard' && location.pathname !== '/' && (
                        <button 
                            onClick={() => navigate(-1)} 
                            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-surface-alt border border-border text-text-secondary hover:text-text hover:border-text-muted transition-all shadow-sm group"
                            title="Go Back"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    )}
                    <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent flex items-center justify-center shadow-md group-hover:shadow-accent group-hover:scale-105 transition-all duration-300">
                        <BookOpen size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight text-text">
                        Smart<span className="text-accent">LMS</span>
                    </span>
                    </Link>
                </div>

                {/* Search Bar */}
                {user && (
                    <div ref={searchRef} className="hidden lg:flex flex-1 max-w-md mx-8 relative group">
                        <input
                            type="text"
                            placeholder="Search courses, materials..."
                            value={searchQuery}
                            onChange={handleSearch}
                            onKeyDown={handleSearchSubmit}
                            onFocus={() => searchQuery.trim().length > 1 && setShowSearchResults(true)}
                            className="w-full pl-6 pr-12 py-2.5 bg-surface-alt border border-border rounded-xl focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none text-sm font-medium transition-all placeholder-text-muted text-text"
                        />
                        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors pointer-events-none z-10" />
                        {showSearchResults && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl border border-border shadow-2xl z-50 py-3 px-2 max-h-64 overflow-y-auto">
                                <p className="text-xs font-bold text-text-muted px-3 mb-2">Press Enter to search for "{searchQuery}"</p>
                                <button onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setShowSearchResults(false); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-text hover:bg-accent-light hover:text-accent rounded-xl transition-colors flex items-center gap-2">
                                    <Search size={16} /> Search Everywhere
                                </button>
                                <button onClick={() => { navigate(`/my-courses?q=${encodeURIComponent(searchQuery)}`); setShowSearchResults(false); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-text hover:bg-accent-light hover:text-accent rounded-xl transition-colors flex items-center gap-2">
                                    <BookOpen size={16} /> View in Courses
                                </button>
                            </div>
                        )/* End showSearchResults */}
                    </div>
                )}

                {/* Right Actions */}
                <div className="flex items-center gap-2 md:gap-5 ml-auto">
                    
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>

                    {!user ? (
                        <div className="hidden md:flex items-center gap-3">
                            <Link to="/login" className="px-5 py-2 text-sm font-bold text-text-secondary hover:text-text transition-colors rounded-lg hover:bg-surface-alt">
                                Log in
                            </Link>
                            <Link to="/register" className="btn btn-primary px-5 py-2.5 text-sm">
                                Sign up
                            </Link>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 md:gap-3">
                            {/* Session timer */}
                            {sessionTime > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tabular-nums rounded-lg bg-accent-light text-accent border border-accent/20">
                                    <Zap size={12} className="animate-pulse" />
                                    <span>{formatTime(sessionTime)}</span>
                                </div>
                            )}

                            {/* Icon Buttons */}
                            <button
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent-light transition-all relative"
                                onClick={() => navigate('/messages')}
                                title="Messages"
                            >
                                <MessageSquare size={19} strokeWidth={2} />
                                {unreadMessages > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-danger text-white text-[9px] font-black rounded-full border-2 border-surface">
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                    </span>
                                )}
                            </button>

                            <div ref={notifRef} className="relative">
                                <button
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent-light transition-all relative"
                                    onClick={openNotifications}
                                    title="Notifications"
                                >
                                    <Bell size={19} strokeWidth={2} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-danger text-white text-[9px] font-black rounded-full border-2 border-surface">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {notifOpen && (
                                        <motion.div
                                            className="absolute right-0 mt-2 w-80 md:w-96 bg-surface rounded-2xl shadow-2xl border border-border z-50 origin-top-right max-h-[420px] flex flex-col"
                                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                        >
                                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                                                <h3 className="text-sm font-black text-text tracking-tight">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <button onClick={handleMarkAllRead} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                                                        <CheckCheck size={14} /> Mark all read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="overflow-y-auto flex-1 py-1">
                                                {notifications.length === 0 ? (
                                                    <div className="text-center py-10 px-4">
                                                        <Bell size={28} className="mx-auto text-text-muted mb-2 opacity-40" />
                                                        <p className="text-sm font-semibold text-text-muted">No notifications yet</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((n, i) => (
                                                        <div key={n.id || i} className={`px-5 py-3 border-b border-border/50 last:border-none hover:bg-surface-alt transition-colors cursor-pointer ${!n.is_read ? 'bg-accent-light/30' : ''}`}
                                                            onClick={async () => {
                                                                if (!n.is_read) {
                                                                    try { await notificationsAPI.markRead(n.id); setUnreadCount(prev => Math.max(0, prev - 1)); } catch {}
                                                                }
                                                                setNotifOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-accent' : 'bg-transparent'}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-text truncate">{n.title || 'Notification'}</p>
                                                                    <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{n.message || ''}</p>
                                                                    <p className="text-[10px] text-text-muted mt-1 font-medium">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Profile Dropdown */}
                            <div ref={dropdownRef} className="relative ml-1">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2.5 pl-1 pr-3 py-1 border border-border rounded-xl hover:bg-surface-alt hover:border-accent/30 transition-all focus:ring-2 focus:ring-accent/20 outline-none bg-surface"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-accent text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex flex-col items-start pr-0.5 hidden lg:flex">
                                      <span className="text-sm font-bold text-text leading-tight">
                                          {user.full_name?.split(' ')[0]}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                          {user.role}
                                      </span>
                                    </div>
                                    <ChevronDown size={14} className={`text-text-muted transition-transform duration-300 ${dropdownOpen ? 'rotate-180 text-accent' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {dropdownOpen && (
                                        <motion.div 
                                            className="absolute right-0 mt-2 w-60 bg-surface rounded-2xl shadow-2xl border border-border py-2 z-50 origin-top-right"
                                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                        >
                                            <div className="px-4 py-3 border-b border-border">
                                                <div className="text-sm font-bold text-text truncate">{user.full_name}</div>
                                                <div className="text-xs font-medium text-text-muted truncate mt-0.5">{user.email}</div>
                                            </div>

                                            <div className="px-2 py-2 border-b border-border text-sm font-semibold text-text-secondary flex flex-col gap-0.5">
                                                {[
                                                    { icon: User, label: 'Profile', path: '/profile' },
                                                    { icon: MessageSquare, label: 'Messages', path: '/messages', badge: unreadMessages },
                                                    { icon: Activity, label: 'My Analytics', path: '/my-analytics' },
                                                    { icon: Settings, label: 'Settings', path: '/profile' },
                                                ].map(item => (
                                                    <button key={item.path + item.label} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent-light hover:text-accent rounded-xl transition-colors text-left" onClick={() => { navigate(item.path); setDropdownOpen(false); }}>
                                                        <item.icon size={16} strokeWidth={2} /> {item.label}
                                                        {item.badge > 0 && <span className="ml-auto bg-accent-light text-accent text-xs font-black px-2 py-0.5 rounded-md">{item.badge}</span>}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="p-2">
                                                <button
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-danger-light text-danger rounded-xl transition-colors text-left text-sm font-bold"
                                                    onClick={handleLogout}
                                                >
                                                    <LogOut size={16} strokeWidth={2.5} /> Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Mobile Menu Button */}
                    <button 
                      className="md:hidden p-2 text-text-secondary hover:text-accent hover:bg-surface-alt rounded-xl transition-colors"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                      {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div 
                        className="absolute top-[100%] left-0 w-full bg-surface border-b border-border shadow-xl p-4 md:hidden flex flex-col gap-4 z-40"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
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
                                    <div className="w-9 h-9 rounded-lg bg-accent text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                        {user.full_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-text text-sm">{user.full_name}</div>
                                        <div className="text-xs text-text-muted">{user.email}</div>
                                    </div>
                                </div>
                                <button className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt rounded-xl text-left font-semibold text-text-secondary text-sm" onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}>
                                    <BookOpen size={16} /> Dashboard
                                </button>
                                <button className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt rounded-xl text-left font-semibold text-text-secondary text-sm" onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}>
                                    <User size={16} /> Profile
                                </button>
                                <button className="flex items-center gap-3 px-4 py-3 hover:bg-danger-light hover:text-danger rounded-xl text-left font-bold text-danger mt-2 text-sm" onClick={handleLogout}>
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
