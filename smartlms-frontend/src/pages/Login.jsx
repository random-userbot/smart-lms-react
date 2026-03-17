import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight } from 'lucide-react';
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
            <div className="flex-1 flex items-center justify-center relative z-10 w-full mb-10">
                <motion.div 
                    className="w-full max-w-[500px] auth-card p-10 md:p-14 relative"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-accent opacity-60" />
                    
                    <div className="text-center mb-10 mt-2">
                        <h1 className="text-3xl md:text-4xl font-black text-text mb-4 tracking-tight">Welcome Back</h1>
                        <p className="text-text-muted text-base md:text-lg font-medium">Log in to continue learning</p>
                    </div>

                    {error && (
                        <motion.div 
                            className="mb-8 p-4 bg-danger-light border-l-4 border-danger text-danger rounded-xl text-sm font-bold"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="input-group">
                            <label className="block text-sm font-bold text-text mb-2">Username</label>
                            <div className="input-icon-wrapper">
                                <Mail size={18} />
                                <input
                                    className="input py-4 text-base"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="block text-sm font-bold text-text mb-2">Password</label>
                            <div className="input-icon-wrapper relative">
                                <Lock size={18} />
                                <input
                                    className="input py-4 text-base"
                                    style={{ paddingRight: '3.5rem' }}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-2 rounded-lg hover:bg-surface-alt"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full mt-8 shadow-accent py-4 text-lg"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="flex items-center justify-center gap-3">Log In <ArrowRight size={20} /></span>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-border text-center">
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
