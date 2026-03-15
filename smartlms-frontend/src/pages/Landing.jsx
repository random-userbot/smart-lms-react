import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Brain, BarChart3, Users, Shield, ArrowRight, Play, Star, TrendingUp, Target, Sparkles, BookOpen
} from 'lucide-react';
import { LandingHero } from './LandingHero';

const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function Landing() {
    return (
        <div className="w-full flex justify-center bg-surface min-h-screen font-sans">
            <div className="w-full max-w-[100vw] overflow-x-hidden relative flex flex-col items-center">
                
                {/* Navigation is removed because AppLayout/Navbar now handles public nav via AppRoutes. 
                    Landing page is rendered inside AppRoutes, but Navbar is explicitly placed before the Routes 
                    for public pages in App.jsx. Handled globally. */}

                {/* Hero */}
                <LandingHero />

                {/* Stats */}
                <section className="w-full bg-surface py-32 md:py-40 px-6 relative z-20 flex justify-center border-none">
                    <motion.div
                        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
                        className="w-full max-w-[1440px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16"
                    >
                        {[
                            { value: '4', label: 'Engagement Dimensions', sub: 'Boredom • Engagement • Confusion • Frustration', icon: Brain, colorClass: 'text-accent', bgClass: 'bg-accent-light' },
                            { value: 'Live', label: 'Webcam Analysis', sub: 'MediaPipe + Action Units', icon: Play, colorClass: 'text-success', bgClass: 'bg-success-light' },
                            { value: 'SHAP', label: 'Explainable AI', sub: 'Feature-level attributions', icon: Target, colorClass: 'text-warning', bgClass: 'bg-warning-light' },
                            { value: 'ICAP', label: 'Learning Framework', sub: 'I • C • A • P Classification', icon: TrendingUp, colorClass: 'text-info', bgClass: 'bg-info-light' },
                        ].map((stat, i) => (
                            <motion.div variants={fadeInUp} key={i} className={`text-center p-8 rounded-2xl bg-surface hover:shadow-xl transition-all duration-300 flex flex-col items-center group cursor-default shadow-sm border border-border`}>
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${stat.bgClass} group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                                    <stat.icon size={32} className={stat.colorClass} />
                                </div>
                                <div className="text-5xl font-black text-text tracking-tight mb-4 drop-shadow-sm">{stat.value}</div>
                                <div className="text-xl font-bold text-text mb-4">{stat.label}</div>
                                <div className="text-xs text-text-muted mt-auto font-black uppercase tracking-wider bg-surface-alt px-4 py-2 rounded-lg shadow-sm border border-border/50">{stat.sub}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* Features */}
                <section className="w-full py-32 md:py-48 px-6 bg-surface-alt flex justify-center">
                    <div className="w-full max-w-[1440px] flex flex-col items-center">
                        <motion.div
                            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                            className="text-center mb-24 max-w-4xl"
                        >
                            <div className="inline-flex items-center justify-center gap-2 bg-accent-light text-accent px-6 py-3 rounded-full text-sm font-black mb-10 tracking-widest uppercase border border-accent/20 shadow-sm">
                                <Sparkles size={20} /> Core Architecture
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-text mb-10 tracking-tight leading-tight">
                                Intelligence at the Core of <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-violet-500">Smart Teaching</span>
                            </h2>
                            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed font-medium">
                                A comprehensive platform replacing legacy systems with modern AI-powered engagement tracking, instant personalized tutoring, and active learning frameworks.
                            </p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-20"
                        >
                            {[
                                { icon: Brain, title: 'AI Engagement Tracking', desc: 'Real-time webcam analysis using client-side MediaPipe face mesh. Tracks gaze, head pose, and behavioral signals securely in-browser without sending raw video.', colorClass: 'text-accent', bgClass: 'bg-accent-light', borderColor: 'group-hover:ring-accent/40' },
                                { icon: BarChart3, title: 'Explainable Analytics', desc: 'SHAP-powered explanations for every score. No black boxes — understand exactly which behavioral features drive engagement predictions for your class.', colorClass: 'text-info', bgClass: 'bg-info-light', borderColor: 'group-hover:ring-info/40' },
                                { icon: Target, title: 'Teaching Score', desc: 'Weighted composite score combining engagement, quiz performance, attendance, feedback, and completion rates with an understandable SHAP breakdown.', colorClass: 'text-success', bgClass: 'bg-success-light', borderColor: 'group-hover:ring-success/40' },
                                { icon: Shield, title: 'Anti-Cheating System', desc: 'Tab switch detection, copy-paste blocking, webcam monitoring during quizzes, integrity scoring, and complete session fingerprinting.', colorClass: 'text-danger', bgClass: 'bg-danger-light', borderColor: 'group-hover:ring-danger/40' },
                                { icon: Star, title: 'ICAP Framework', desc: 'Classify student behavior into Interactive, Constructive, Active, and Passive levels for deeper pedagogical insights. Auto-triggers constructivist pop-quizzes.', colorClass: 'text-warning', bgClass: 'bg-warning-light', borderColor: 'group-hover:ring-warning/40' },
                                { icon: Users, title: 'Complete Tracking', desc: 'Session-to-session tracking: playback speed, tab switches, notes taken, interactions, and comprehensive user journey analytics across the entire course.', colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10', borderColor: 'group-hover:ring-violet-500/40' },
                            ].map((feature, i) => (
                                <motion.div variants={fadeInUp} key={i} className={`group bg-surface p-8 lg:p-10 rounded-2xl border border-border hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-start`}>
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform ${feature.bgClass}`}>
                                        <feature.icon size={32} className={feature.colorClass} />
                                    </div>
                                    <h3 className="text-2xl font-black text-text mb-4 tracking-tight leading-snug">{feature.title}</h3>
                                    <p className="text-text-secondary leading-relaxed text-sm font-medium">
                                        {feature.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* How it works */}
                <section className="w-full py-48 md:py-56 px-6 bg-surface flex justify-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-accent/5 rounded-full blur-[200px] pointer-events-none"></div>
                    
                    <div className="w-full max-w-[1200px] flex flex-col items-center relative z-10">
                        <motion.div
                            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                            className="text-center mb-32"
                        >
                            <h2 className="text-6xl md:text-8xl font-black text-text tracking-tight">The Learning Loop</h2>
                            <p className="text-3xl text-text-secondary mt-10 max-w-3xl mx-auto font-medium">From passive watching to interactive mastery, seamlessly.</p>
                        </motion.div>

                        <div className="relative w-full flex flex-col gap-16 md:gap-24">
                            {/* Vertical Line for Desktop */}
                            <div className="hidden md:block absolute left-[5.5rem] top-10 bottom-10 w-3 bg-surface-alt rounded-full z-0"></div>

                            {[
                                { step: '01', title: 'Watch Lectures (Passive -> Active)', desc: 'Students watch video lectures. Playback speed, tab switches, and interactions are recorded to build the ICAP behavioral profile.' },
                                { step: '02', title: 'Client-Side AI Analyzes Engagement', desc: 'MediaPipe securely extracts facial landmarks and gaze entirely in the browser. Engagement scores are sent to the backend for black-box elimination.' },
                                { step: '03', title: 'Interactive Quizzes & Feedback', desc: 'Upon completion, a varied ICAP quiz (MCQs, fill in blanks, short notes) is auto-triggered, followed by mandatory feedback.' },
                                { step: '04', title: 'Actionable Teaching Analytics', desc: 'Dashboard shows comprehensive teaching score, SHAP attributions, ICAP distribution, at-risk students, and specific recommendations.' },
                            ].map((item, i) => (
                                <motion.div
                                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp}
                                    key={i} className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-start p-8 md:p-10 lg:p-12 rounded-2xl border border-border bg-surface hover:bg-surface-alt hover:shadow-xl transition-all duration-300 group"
                                >
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-accent to-violet-600 flex items-center justify-center text-white font-black text-3xl flex-shrink-0 shadow-lg shadow-accent/30 group-hover:scale-110 transition-transform duration-300">
                                        {item.step}
                                    </div>
                                    <div className="flex-1 mt-2">
                                        <h3 className="text-2xl md:text-3xl font-black text-text mb-4 tracking-tight">{item.title}</h3>
                                        <p className="text-text-secondary leading-relaxed text-base font-medium">
                                            {item.desc}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Research-Backed Methodology */}
                <section className="w-full py-48 px-6 bg-surface-alt border-none flex justify-center">
                    <div className="w-full max-w-[1440px]">
                        <motion.div
                            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                            className="text-center mb-32"
                        >
                            <div className="inline-flex items-center justify-center gap-2 bg-success-light text-success px-8 py-4 rounded-full text-sm font-black mb-12 tracking-widest uppercase shadow-sm">
                                <Shield size={24} /> Research-Backed
                            </div>
                            <h2 className="text-6xl md:text-8xl font-black text-text tracking-tight leading-tight">
                                Built on Peer-Reviewed <span className="text-transparent bg-clip-text bg-gradient-to-r from-success to-teal-500">Science</span>
                            </h2>
                            <p className="text-3xl text-text-secondary mt-10 max-w-4xl mx-auto font-medium">
                                Every engagement score is transparent and verifiable, grounded in published research.
                            </p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16"
                        >
                            <motion.div variants={fadeInUp} className="p-10 rounded-2xl bg-surface border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 rounded-xl bg-accent-light text-accent flex items-center justify-center mb-6 shadow-inner">
                                    <Brain size={32} strokeWidth={2.5}/>
                                </div>
                                <h3 className="text-2xl font-black text-text mb-4 tracking-tight">XGBoost + SHAP</h3>
                                <p className="text-text-secondary leading-relaxed text-sm font-medium">
                                    Following Das & Dev's approach with 82.9% accuracy on DAiSEE dataset. SHAP TreeExplainer provides feature-level attribution for every prediction.
                                </p>
                                <div className="mt-8 flex flex-wrap gap-2">
                                    {['Action Units', 'Gaze', 'Head Pose', 'Temporal'].map(t => (
                                        <span key={t} className="px-3 py-1.5 text-xs bg-surface-alt text-text font-bold rounded-lg border border-border">{t}</span>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="p-10 rounded-2xl bg-surface border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 rounded-xl bg-warning-light text-warning flex items-center justify-center mb-6 shadow-inner">
                                    <Star size={32} strokeWidth={2.5}/>
                                </div>
                                <h3 className="text-2xl font-black text-text mb-4 tracking-tight">ICAP Framework</h3>
                                <p className="text-text-secondary leading-relaxed text-sm font-medium">
                                    Chi & Wylie (2014) taxonomy classifies learning behaviors into Interactive, Constructive, Active, and Passive — proven to predict learning outcomes.
                                </p>
                                <div className="mt-8 flex gap-3">
                                    {[
                                        { l: 'I', c: 'bg-success' },
                                        { l: 'C', c: 'bg-info' },
                                        { l: 'A', c: 'bg-warning' },
                                        { l: 'P', c: 'bg-slate-400' },
                                    ].map(({ l, c }) => (
                                        <div key={l} className={`w-10 h-10 ${c} text-white font-black rounded-lg flex items-center justify-center text-sm shadow-sm`}>{l}</div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="p-10 rounded-2xl bg-surface border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 rounded-xl bg-danger-light text-danger flex items-center justify-center mb-6 shadow-inner">
                                    <Target size={32} strokeWidth={2.5}/>
                                </div>
                                <h3 className="text-2xl font-black text-text mb-4 tracking-tight">Fuzzy Logic</h3>
                                <p className="text-text-secondary leading-relaxed text-sm font-medium">
                                    Zhao et al. (2024) inspired human-readable IF/THEN rules that translate complex ML outputs into actionable insights for both teachers and students.
                                </p>
                                <div className="mt-8 p-4 bg-surface-alt rounded-xl border border-border text-sm font-mono text-text-secondary font-bold">
                                    IF gaze_score LOW ∧ head_stable<br/>
                                    THEN engagement = "distracted"
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* CTA */}
                <section className="w-full py-48 px-6 bg-gradient-hero text-white flex justify-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full bg-accent/30 blur-[200px]" />
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                        className="w-full max-w-5xl text-center relative z-10 flex flex-col items-center"
                    >
                        <h2 className="text-6xl md:text-8xl lg:text-[6rem] font-black mb-12 tracking-tight leading-tight">
                            Ready to Transform <br /> Your Classroom?
                        </h2>
                        <p className="text-2xl md:text-3xl text-indigo-100 mb-16 leading-relaxed font-medium max-w-4xl opacity-90">
                            Join Smart LMS and get AI-powered, explainable insights into student engagement and ICAP behaviors today.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-lg">
                            <Link to="/register" className="btn btn-primary btn-lg w-full py-6 text-2xl rounded-2xl shadow-2xl flex items-center justify-center group">
                                Get Started Free <ArrowRight size={28} className="translate-x-2 group-hover:translate-x-4 transition-transform ml-2" />
                            </Link>
                        </div>
                    </motion.div>
                </section>

                {/* Footer */}
                <footer className="w-full py-12 px-6 bg-[#020617] text-center text-slate-400 text-sm md:text-base border-t border-slate-800">
                    <p className="font-medium tracking-widest uppercase">
                        <span className="text-white font-black mr-2">Smart LMS</span> v2.0 — Built for Smart Engineering Campus &middot; Thesis Project 2026
                    </p>
                </footer>
            </div>
        </div>
    );
}
