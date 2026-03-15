import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/layout/ThemeToggle';
import { AnimatedGradient } from '../components/ui/AnimatedGradient';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.username, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col p-6 bg-surface-alt relative overflow-hidden font-sans">
            <AnimatedGradient intensity="low" />

            {/* Top Navbar Header */}
            <div className="w-full flex justify-between items-center max-w-7xl mx-auto py-6 relative z-20">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:shadow-accent/30 group-hover:scale-105 transition-all">
                        <BookOpen size={22} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-text">Smart<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">LMS</span></span>
                </Link>
                <ThemeToggle />
            </div>

            {/* Main Form Content */}
            <div className="flex-1 flex items-center justify-center relative z-10 w-full mb-10">
                <motion.div 
                    className="w-full max-w-[440px] auth-card p-8 md:p-10 relative"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {/* Subtle top accent line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60" />
                    
                    <div className="text-center mb-8 mt-2">
                        <h1 className="text-3xl font-black text-text mb-3 tracking-tight">Welcome Back</h1>
                        <p className="text-text-muted text-base font-medium">Log in to continue learning</p>
                    </div>

                    {error && (
                        <motion.div 
                            className="mb-6 p-4 bg-danger-light border-l-4 border-danger text-danger rounded-xl text-sm font-bold"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-text mb-2">Username</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-60" />
                                <input
                                    className="input-premium"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-text mb-2">Password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-60" />
                                <input
                                    className="input-premium"
                                    style={{ paddingRight: '3rem' }}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1.5 rounded-lg hover:bg-surface-alt"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            className="w-full rounded-xl py-3.5 text-base font-bold shadow-lg transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2 text-white relative overflow-hidden group"
                            style={{ 
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)',
                            }}
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="relative z-10 flex items-center gap-2">Log In <ArrowRight size={18} /></span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-text-muted font-medium text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-accent font-bold hover:text-accent-hover transition-colors underline decoration-1 underline-offset-4 decoration-accent/30 hover:decoration-accent">
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
