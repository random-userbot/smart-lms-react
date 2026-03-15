import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, GraduationCap, BookOpen, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/layout/ThemeToggle';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        full_name: '', username: '', email: '', password: '', role: 'student',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(form);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col p-6 bg-surface-alt relative overflow-hidden font-sans">
            
            {/* Top Navbar Header */}
            <div className="w-full flex justify-between items-center max-w-7xl mx-auto py-6 relative z-20">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                        <BookOpen size={24} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-text">Smart<span className="text-accent">LMS</span></span>
                </Link>
                <div className="flex bg-surface px-4 py-2 rounded-2xl ring-1 ring-border shadow-sm">
                    <ThemeToggle />
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/3 -translate-x-1/3"></div>

            {/* Main Form Content */}
            <div className="flex-1 flex items-center justify-center relative z-10 w-full mb-10 pt-8 pb-10">
                <div className="w-full max-w-[500px] bg-surface rounded-2xl shadow-xl border border-border p-8 relative">
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-text mb-2 tracking-tight">Create Account</h1>
                        <p className="text-text-secondary text-base font-medium">Join Smart LMS and start learning</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger text-danger rounded-xl text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-text mb-1">Full Name</label>
                                <div className="input-icon-wrapper relative">
                                    <User size={18} className="absolute left-4 opacity-50" />
                                    <input
                                        className="w-full bg-surface border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all shadow-sm"
                                        placeholder="Your full name"
                                        value={form.full_name}
                                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-text mb-1">Username</label>
                                <div className="input-icon-wrapper relative">
                                    <User size={18} className="absolute left-4 opacity-50" />
                                    <input
                                        className="w-full bg-surface border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all shadow-sm"
                                        placeholder="Choose username"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-text mb-1">Email Address</label>
                            <div className="input-icon-wrapper relative">
                                <Mail size={18} className="absolute left-4 opacity-50" />
                                <input
                                    className="w-full bg-surface border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all shadow-sm"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-text mb-1">Password</label>
                            <div className="input-icon-wrapper relative">
                                <Lock size={18} className="absolute left-4 opacity-50" />
                                <input
                                    className="w-full bg-surface border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-xl py-3 pl-10 pr-10 text-sm font-medium outline-none transition-all shadow-sm"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min 6 characters"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Role selector */}
                        <div className="pt-4 pb-1">
                            <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-3">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'student', label: 'Student', icon: GraduationCap },
                                    { value: 'teacher', label: 'Teacher', icon: BookOpen },
                                ].map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setForm({ ...form, role: value })}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all border ${form.role === value
                                                ? 'border-accent bg-accent-light text-accent shadow-sm ring-2 ring-accent/20'
                                                : 'border-border bg-surface text-text-muted hover:border-accent/40 hover:bg-surface-alt'
                                            }`}
                                    >
                                        <Icon size={18} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-base font-bold shadow-md shadow-accent/20 hover:shadow-lg transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>Create Account <UserPlus size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-text-secondary font-medium text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-accent font-bold hover:text-accent-hover transition-colors underline decoration-1 underline-offset-4 decoration-accent/30 hover:decoration-accent">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
