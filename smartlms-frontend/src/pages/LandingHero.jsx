import React from "react";
import { SplineScene } from "../components/ui/splite";
import { Spotlight } from "../components/ui/spotlight";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AnimatedGradient } from "../components/ui/AnimatedGradient";

export function LandingHero() {
    return (
        <section className="w-full min-h-[calc(100vh-80px)] relative overflow-hidden flex flex-col justify-center items-center"
            style={{ background: 'var(--gradient-hero)' }}>
            
            {/* Animated gradient mesh background */}
            <AnimatedGradient intensity="high" />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
                }}
            />
            
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20"
                fill="rgba(139, 92, 246, 0.35)"
            />

            <div className="w-full max-w-[1440px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 md:px-12 py-12 lg:py-0 text-center lg:text-left">
                {/* Left content */}
                <motion.div 
                    className="flex flex-col justify-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <motion.div 
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-8 mx-auto lg:mx-0 w-fit border"
                        style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            borderColor: 'rgba(139, 92, 246, 0.3)',
                            color: '#a78bfa',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <Zap size={16} className="text-violet-400" /> Next-Gen AI Learning Platform
                    </motion.div>
                    
                    <motion.h1 
                        className="text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white leading-[1.08] mb-8 tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.7 }}
                    >
                        Learn with <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-[length:200%_100%]"
                            style={{ animation: 'shimmerText 4s linear infinite' }}>
                            Immersive AI.
                        </span>
                    </motion.h1>
                    
                    <motion.p 
                        className="text-indigo-200/80 text-xl md:text-2xl md:max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                    >
                        A state-of-the-art learning management platform that tracks your engagement,
                        generates AI quizzes, and adapts to your behaviors in real-time.
                    </motion.p>
                    
                    <motion.div 
                        className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                    >
                        <Link to="/register" className="group relative inline-flex items-center gap-2 text-lg px-8 py-4 rounded-xl font-bold text-white overflow-hidden transition-all hover:-translate-y-0.5"
                            style={{ 
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
                                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                            }}>
                            <span className="relative z-10 flex items-center gap-2">
                                Get Started Free <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20}/>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </Link>
                        <Link to="/login" className="inline-flex items-center gap-2 text-lg px-8 py-4 rounded-xl font-bold text-indigo-200 border border-indigo-400/30 hover:border-indigo-400/60 hover:bg-white/5 transition-all backdrop-blur-sm">
                            Log in to Account
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Right content - Spline 3D */}
                <motion.div 
                    className="w-full h-[450px] md:h-[600px] lg:h-[800px] relative flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
                >
                    {/* Glow behind 3D model */}
                    <div className="absolute inset-0 rounded-full mix-blend-screen -z-10"
                        style={{
                            background: 'radial-gradient(circle at center, rgba(139,92,246,0.25) 0%, transparent 60%)',
                            filter: 'blur(60px)',
                            animation: 'spotlightPulse 4s ease-in-out infinite',
                        }}
                    />
                    <SplineScene
                        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                        className="w-full h-full scale-[1.1] lg:scale-[1.3] relative z-10"
                    />
                </motion.div>
            </div>
            
            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent z-20 pointer-events-none" />
        </section>
    )
}
