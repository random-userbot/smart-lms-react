import React from "react";
import { SplineScene } from "../components/ui/splite";
import { Spotlight } from "../components/ui/spotlight";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AnimatedGradient } from "../components/ui/AnimatedGradient";

export function LandingHero() {
    return (
        <section className="w-full min-h-[calc(100vh-64px)] relative overflow-hidden flex flex-col justify-center items-center"
            style={{ background: 'var(--gradient-hero)' }}>
            
            <AnimatedGradient intensity="high" />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                }}
            />
            
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="color-mix(in srgb, var(--color-primary) 42%, transparent)" />

            <div className="w-full max-w-[1400px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-6 md:px-10 py-12 lg:py-0 text-center lg:text-left">
                {/* Left content */}
                <motion.div 
                    className="flex flex-col justify-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <motion.div 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 mx-auto lg:mx-0 w-fit border"
                        style={{
                            background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
                            color: 'color-mix(in srgb, var(--color-accent) 78%, white)',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <Zap size={15} /> AI-Powered Learning Platform
                    </motion.div>
                    
                    <motion.h1 
                        className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.6 }}
                    >
                        Learn with <br /> 
                        <span className="text-transparent bg-clip-text" style={{
                            backgroundImage: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary), var(--color-accent))',
                        }}>
                            Immersive AI
                        </span>
                    </motion.h1>
                    
                    <motion.p 
                        className="text-lg md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10"
                        style={{ color: 'color-mix(in srgb, white 72%, var(--color-accent) 28%)' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        A state-of-the-art platform that tracks engagement with AI,
                        generates quizzes, and adapts to your learning behaviors in real-time.
                    </motion.p>
                    
                    <motion.div 
                        className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                    >
                        <Link to="/register" className="group inline-flex items-center gap-2 text-base px-7 py-3.5 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5"
                            style={{ 
                                background: 'var(--color-accent)',
                                boxShadow: 'var(--shadow-accent)',
                            }}>
                            Get Started Free <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18}/>
                        </Link>
                        <Link to="/login" className="inline-flex items-center gap-2 text-base px-7 py-3.5 rounded-xl font-semibold transition-all backdrop-blur-sm"
                            style={{ color: 'color-mix(in srgb, white 70%, var(--color-accent) 30%)', border: '1px solid color-mix(in srgb, var(--color-primary-light) 34%, transparent)' }}>
                            Log in to Account
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Right: Spline 3D */}
                <motion.div 
                    className="w-full h-[400px] md:h-[550px] lg:h-[700px] relative flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                >
                    <div className="absolute inset-0 rounded-full mix-blend-screen -z-10"
                        style={{
                            background: 'radial-gradient(circle at center, color-mix(in srgb, var(--color-primary) 24%, transparent) 0%, transparent 60%)',
                            filter: 'blur(60px)',
                            animation: 'spotlightPulse 4s ease-in-out infinite',
                        }}
                    />
                    <SplineScene
                        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                        className="w-full h-full scale-[1.1] lg:scale-[1.25] relative z-10"
                    />
                </motion.div>
            </div>
            
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-alt to-transparent z-20 pointer-events-none"
                style={{ background: 'linear-gradient(to top, var(--color-surface-alt), transparent)' }} />
        </section>
    );
}
