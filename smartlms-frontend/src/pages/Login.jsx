import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff, BookOpen } from 'lucide-react';
import ThemeToggle from '../components/layout/ThemeToggle';

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
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

            {/* Main Form Content */}
            <div className="flex-1 flex items-center justify-center relative z-10 w-full mb-10">
                <div className="w-full max-w-[440px] bg-surface rounded-2xl shadow-xl border border-border p-8 relative">
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-text mb-2 tracking-tight">Welcome Back</h1>
                        <p className="text-text-secondary text-base font-medium">Log in to your account</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger text-danger rounded-xl text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-text mb-2">Username</label>
                            <div className="input-icon-wrapper relative">
                                <Mail size={18} className="absolute left-4 opacity-50" />
                                <input
                                    className="w-full bg-surface border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all shadow-sm"
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
                            <div className="input-icon-wrapper relative">
                                <Lock size={18} className="absolute left-4 opacity-50" />
                                <input
                                    className="w-full bg-surface border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-xl py-3 pl-10 pr-12 text-sm font-medium outline-none transition-all shadow-sm"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
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

                        <button
                            className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-base font-bold shadow-md shadow-accent/20 hover:shadow-lg transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>Log In <LogIn size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-text-secondary font-medium text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-accent font-bold hover:text-accent-hover transition-colors underline decoration-1 underline-offset-4 decoration-accent/30 hover:decoration-accent">
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
