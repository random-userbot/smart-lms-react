import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, usersAPI, messagesAPI } from '../../api/client';
import { User, Mail, Lock, Download, Save, AlertCircle, CheckCircle, Shield, Database, MessageSquare, BookOpen, Clock, ChevronRight } from 'lucide-react';
import { useActivity } from '../../context/ActivityTracker';
import { useNavigate } from 'react-router-dom';

export default function MyProfile() {
    const { user, updateUser } = useAuth();
    const { trackEvent } = useActivity();
    const navigate = useNavigate();
    const [form, setForm] = useState({ full_name: '', email: '', bio: '' });
    const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' });
    const [tab, setTab] = useState('profile');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [recentMessages, setRecentMessages] = useState([]);

    useEffect(() => {
        trackEvent('profile_viewed');
        if (user) setForm({ full_name: user.full_name, email: user.email, bio: user.bio || '' });
        // Load recent messages
        messagesAPI.getConversations().then(res => setRecentMessages(res.data?.slice(0, 5) || [])).catch(() => {});
    }, [user]);

    const handleSave = async () => {
        try {
            const res = await authAPI.updateProfile(form);
            updateUser(res.data);
            trackEvent('profile_updated');
            setMsg('Profile updated!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handlePasswordChange = async () => {
        try {
            await authAPI.changePassword(passwordForm);
            trackEvent('password_changed');
            setMsg('Password changed!');
            setPasswordForm({ old_password: '', new_password: '' });
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to change password');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleExport = async () => {
        try {
            const res = await usersAPI.exportData();
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'my-smartlms-data.json'; a.click();
            URL.revokeObjectURL(url);
            trackEvent('data_exported');
        } catch { }
    };

    const tabs = [
        { key: 'profile', label: 'Profile', icon: User },
        { key: 'messages', label: 'Messages', icon: MessageSquare },
        { key: 'security', label: 'Security', icon: Shield },
        { key: 'data', label: 'Data', icon: Database },
    ];

    return (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight border-l-8 border-accent pl-6 py-2">Profile Settings</h1>
                <p className="text-xl text-text-secondary font-medium mt-1 ml-6">Manage your account, security, and data</p>
            </div>

            {/* Toast messages */}
            {msg && (
                <div className="flex items-center gap-3 px-6 py-4 bg-success-light text-success border border-success/20 rounded-2xl font-bold text-base animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <CheckCircle size={24} className="shrink-0" /> {msg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 px-6 py-4 bg-danger-light text-danger border border-danger/20 rounded-2xl font-bold text-base animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <AlertCircle size={24} className="shrink-0" /> {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Tabs Sidebar */}
                <div className="w-full lg:w-72 shrink-0">
                    <div className="flex flex-row lg:flex-col gap-2 bg-surface-elevated p-2 rounded-3xl border border-border shadow-sm overflow-x-auto scrollbar-hide">
                        {tabs.map(t => (
                            <button key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center justify-center lg:justify-start gap-4 px-6 py-4 rounded-2xl text-base font-bold transition-all whitespace-nowrap lg:whitespace-normal ${
                                    tab === t.key
                                        ? 'bg-surface text-accent shadow-md border border-border'
                                        : 'text-text-secondary hover:text-text hover:bg-surface-alt border border-transparent'
                                }`}
                            >
                                <t.icon size={20} className={tab === t.key ? 'text-accent' : 'opacity-70'} /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                    {/* Profile Tab */}
                    {tab === 'profile' && (
                        <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-8 md:p-12 space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Avatar + Name */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-10 border-b border-border">
                                <div className="w-24 h-24 rounded-[2rem] bg-accent-light border-2 border-accent/20 flex items-center justify-center text-accent font-black text-4xl shadow-md">
                                    {user?.full_name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-text tracking-tight mb-2">{user?.full_name}</h2>
                                    <span className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-accent bg-accent-light px-3 py-1.5 rounded-xl border border-accent/20 shadow-sm">
                                        <Shield size={16} />{user?.role}
                                    </span>
                                </div>
                            </div>

                            {/* Form fields */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <User size={16} className="text-accent" /> Full Name
                                    </label>
                                    <input
                                        className="input py-4 text-base"
                                        value={form.full_name}
                                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Mail size={16} className="text-accent" /> Email
                                    </label>
                                    <input
                                        className="input py-4 text-base"
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-text-muted uppercase tracking-widest">Bio</label>
                                    <textarea
                                        className="input py-4 text-base resize-y min-h-[160px]"
                                        value={form.bio}
                                        onChange={e => setForm({ ...form, bio: e.target.value })}
                                        placeholder="Tell us a little about yourself..."
                                    />
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-lg w-full sm:w-auto px-12 shadow-accent"
                                onClick={handleSave}
                            >
                                <Save size={20} className="mr-3" /> Save Changes
                            </button>
                        </div>
                    )}

                    {/* Messages Tab */}
                    {tab === 'messages' && (
                        <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-border">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-accent-light border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                                        <MessageSquare size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-text tracking-tight">Recent Messages</h3>
                                        <p className="text-sm text-text-secondary font-medium">Messages from your teachers</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/messages')}
                                    className="btn btn-secondary px-6 shrink-0 shadow-sm"
                                >
                                    View Inbox <ChevronRight size={18} className="ml-1 -mr-1" />
                                </button>
                            </div>

                            {recentMessages.length === 0 ? (
                                <div className="text-center py-16 text-text-muted border-2 border-dashed border-border rounded-3xl bg-surface-alt">
                                    <MessageSquare size={56} className="mx-auto mb-4 opacity-50" strokeWidth={1}/>
                                    <p className="font-bold text-xl text-text">No messages yet</p>
                                    <p className="text-base font-medium mt-1">Messages from teachers will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentMessages.map(conv => (
                                        <div
                                            key={conv.other_user_id}
                                            onClick={() => navigate('/messages')}
                                            className="p-6 rounded-[1.5rem] border-2 border-border hover:border-accent hover:bg-surface-alt cursor-pointer transition-all group shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-6">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <span className="font-bold text-lg text-text truncate group-hover:text-accent transition-colors">{conv.other_user_name}</span>
                                                        {conv.unread_count > 0 && (
                                                            <span className="bg-danger text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm shrink-0">
                                                                {conv.unread_count} new
                                                            </span>
                                                        )}
                                                    </div>
                                                    {conv.course_title && (
                                                        <div className="text-xs font-black uppercase tracking-widest text-accent mt-2 flex items-center gap-1.5 bg-accent-light w-fit px-2 py-1 rounded-md">
                                                            <BookOpen size={12} /> {conv.course_title}
                                                        </div>
                                                    )}
                                                    <p className="text-base text-text-secondary font-medium mt-3 truncate">{conv.last_message}</p>
                                                </div>
                                                <div className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5 shrink-0">
                                                    <Clock size={12} className="opacity-70" />
                                                    {new Date(conv.last_message_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {tab === 'security' && (
                        <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-8 md:p-12 space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-5 pb-8 border-b border-border">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-warning-light border border-warning/20 flex items-center justify-center text-warning shadow-inner">
                                    <Lock size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-text tracking-tight">Change Password</h3>
                                    <p className="text-sm text-text-secondary font-medium">Update your account credentials</p>
                                </div>
                            </div>

                            <div className="space-y-8 max-w-xl">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-text-muted uppercase tracking-widest">Current Password</label>
                                    <input
                                        className="input py-4 text-base"
                                        type="password"
                                        value={passwordForm.old_password}
                                        onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                                        placeholder="Enter current password"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-text-muted uppercase tracking-widest">New Password</label>
                                    <input
                                        className="input py-4 text-base"
                                        type="password"
                                        value={passwordForm.new_password}
                                        onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                        placeholder="Enter new password"
                                    />
                                </div>
                            </div>

                            <button
                                className="btn btn-lg bg-text text-surface hover:bg-text-secondary w-full sm:w-auto px-10 shadow-md"
                                onClick={handlePasswordChange}
                            >
                                <Lock size={20} className="mr-3" /> Update Password
                            </button>
                        </div>
                    )}

                    {/* Data Tab */}
                    {tab === 'data' && (
                        <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-5 pb-8 border-b border-border">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-info-light border border-info/20 flex items-center justify-center text-info shadow-inner">
                                    <Database size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-text tracking-tight">Export Your Data</h3>
                                    <p className="text-sm text-text-secondary font-medium">Download all your records as JSON</p>
                                </div>
                            </div>

                            <div className="text-base text-text-secondary font-medium leading-relaxed bg-surface-alt p-6 md:p-8 rounded-[1.5rem] border border-border flex items-start gap-4 shadow-sm">
                                <InfoIcon />
                                <div>
                                    This will export all your data including <strong className="text-text">engagement logs, quiz attempts, feedback, and gamification progress</strong> in a single comprehensive JSON file that you can download locally for transparency.
                                </div>
                            </div>

                            <button
                                className="btn btn-secondary btn-lg w-full sm:w-auto px-10 border-2"
                                onClick={handleExport}
                            >
                                <Download size={20} className="mr-3" /> Download My Data
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoIcon() {
    return <AlertCircle className="text-info shrink-0 mt-0.5" size={24}/>
}
