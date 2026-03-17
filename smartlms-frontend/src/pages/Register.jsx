import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, BookOpen, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/layout/ThemeToggle';
import { AnimatedGradient } from '../components/ui/AnimatedGradient';

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
            <AnimatedGradient intensity="low" />

            {/* Top Header */}
            <div className="w-full flex justify-between items-center max-w-7xl mx-auto py-6 relative z-20">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-md group-hover:shadow-accent group-hover:scale-105 transition-all">
                        <BookOpen size={22} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-text">Smart<span className="text-accent">LMS</span></span>
                </Link>
                <ThemeToggle />
            </div>

            {/* Main Form */}
            <div className="flex-1 flex items-center justify-center relative z-10 w-full mb-10 pt-4 pb-10">
                <motion.div 
                    className="w-full max-w-[500px] auth-card p-8 md:p-10 relative"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-accent opacity-60" />
                    
                    <div className="text-center mb-8 mt-2">
                        <h1 className="text-3xl font-black text-text mb-3 tracking-tight">Create Account</h1>
                        <p className="text-text-muted text-base font-medium">Join Smart LMS and start learning</p>
                    </div>

                    {error && (
                        <motion.div 
                            className="mb-6 p-4 bg-danger-light border-l-4 border-danger text-danger rounded-xl text-sm font-bold text-center"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="block text-sm font-bold text-text mb-1">Full Name</label>
                                <div className="input-icon-wrapper">
                                    <User size={18} />
                                    <input className="input" placeholder="Your full name"
                                        value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="block text-sm font-bold text-text mb-1">Username</label>
                                <div className="input-icon-wrapper">
                                    <User size={18} />
                                    <input className="input" placeholder="Choose username"
                                        value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="block text-sm font-bold text-text mb-1">Email Address</label>
                            <div className="input-icon-wrapper">
                                <Mail size={18} />
                                <input className="input" type="email" placeholder="your@email.com"
                                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="block text-sm font-bold text-text mb-1">Password</label>
                            <div className="input-icon-wrapper relative">
                                <Lock size={18} />
                                <input className="input" style={{ paddingRight: '3rem' }}
                                    type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                                <button type="button" 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1.5 rounded-lg hover:bg-surface-alt"
                                    onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Role selector */}
                        <div className="pt-4 pb-1">
                            <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'student', label: 'Student', icon: GraduationCap },
                                    { value: 'teacher', label: 'Teacher', icon: BookOpen },
                                ].map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setForm({ ...form, role: value })}
                                        className={`flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-black transition-all border-2 ${form.role === value
                                                ? 'border-accent bg-accent-light text-accent shadow-sm shadow-accent/20'
                                                : 'border-border bg-surface text-text-muted hover:border-accent/40 hover:bg-surface-alt'
                                            }`}
                                    >
                                        <Icon size={18} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full mt-6 shadow-accent"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="flex items-center gap-2">Create Account <ArrowRight size={18} /></span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-text-muted font-medium text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-accent font-bold hover:text-accent-hover transition-colors underline decoration-1 underline-offset-4 decoration-accent/30 hover:decoration-accent">
                                Log in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
