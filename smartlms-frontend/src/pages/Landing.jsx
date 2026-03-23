import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, BarChart3, Users, Shield, ArrowRight, Play, Star, TrendingUp, Target, Sparkles, BookOpen } from 'lucide-react';
import { LandingHero } from './LandingHero';

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function Landing() {
    return (
        <div className="w-full flex justify-center min-h-screen font-sans" style={{ background: 'var(--color-surface)' }}>
            <div className="w-full max-w-[100vw] overflow-x-hidden relative flex flex-col items-center">

                <LandingHero />

                {/* Stats */}
                <section className="w-full py-24 md:py-32 px-6 relative z-20 flex justify-center" style={{ background: 'var(--color-surface)' }}>
                    <motion.div
                        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
                        className="w-full max-w-[1400px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
                    >
                        {[
                            { value: '4', label: 'Engagement Dimensions', sub: 'Boredom • Engagement • Confusion • Frustration', icon: Brain, colorClass: 'text-accent', bgClass: 'bg-accent-light' },
                            { value: 'Live', label: 'Webcam Analysis', sub: 'MediaPipe + Action Units', icon: Play, colorClass: 'text-success', bgClass: 'bg-success-light' },
                            { value: 'SHAP', label: 'Explainable AI', sub: 'Feature-level attributions', icon: Target, colorClass: 'text-warning', bgClass: 'bg-warning-light' },
                            { value: 'ICAP', label: 'Learning Framework', sub: 'I • C • A • P Classification', icon: TrendingUp, colorClass: 'text-info', bgClass: 'bg-info-light' },
                        ].map((stat, i) => (
                            <motion.div variants={fadeInUp} key={i} className="text-center p-6 rounded-xl border border-border hover:shadow-lg transition-all flex flex-col items-center group cursor-default"
                                style={{ background: 'var(--color-surface)' }}>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${stat.bgClass} group-hover:scale-110 transition-transform`}>
                                    <stat.icon size={24} className={stat.colorClass} />
                                </div>
                                <div className="text-3xl font-extrabold tracking-tight mb-2 font-mono" style={{ color: 'var(--color-text)' }}>{stat.value}</div>
                                <div className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{stat.label}</div>
                                <div className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-alt)' }}>{stat.sub}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* Features */}
                <section className="w-full py-24 md:py-32 px-6 flex justify-center" style={{ background: 'var(--color-surface-alt)' }}>
                    <div className="w-full max-w-[1400px] flex flex-col items-center">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-16 max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
                                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)', borderColor: 'var(--color-border)' }}>
                                <Sparkles size={14} /> Core Architecture
                            </div>
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight" style={{ color: 'var(--color-text)' }}>
                                Intelligence at Every Layer
                            </h2>
                            <p className="text-lg leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                A comprehensive platform replacing legacy systems with modern AI-powered engagement tracking, instant personalized tutoring, and active learning frameworks.
                            </p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
                            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {[
                                { icon: Brain, title: 'AI Engagement Tracking', desc: 'Real-time webcam analysis using client-side MediaPipe face mesh. Tracks gaze, head pose, and behavioral signals securely in-browser.', color: 'accent' },
                                { icon: BarChart3, title: 'Explainable Analytics', desc: 'SHAP-powered explanations for every score. No black boxes — understand exactly which behavioral features drive engagement predictions.', color: 'info' },
                                { icon: Target, title: 'Teaching Score', desc: 'Weighted composite score combining engagement, quiz performance, attendance, feedback, and completion rates with SHAP breakdown.', color: 'success' },
                                { icon: Shield, title: 'Anti-Cheating System', desc: 'Tab switch detection, copy-paste blocking, webcam monitoring during quizzes, integrity scoring, and session fingerprinting.', color: 'danger' },
                                { icon: Star, title: 'ICAP Framework', desc: 'Classify behavior into Interactive, Constructive, Active, and Passive levels for deeper pedagogical insights.', color: 'warning' },
                                { icon: Users, title: 'Complete Tracking', desc: 'Session-to-session tracking: playback speed, tab switches, notes taken, interactions, and comprehensive journey analytics.', color: 'accent' },
                            ].map((feature, i) => (
                                <motion.div variants={fadeInUp} key={i} className="group p-6 rounded-xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-start"
                                    style={{ background: 'var(--color-surface)' }}>
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-${feature.color}-light`}>
                                        <feature.icon size={20} className={`text-${feature.color}`} />
                                    </div>
                                    <h3 className="text-lg font-bold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>{feature.title}</h3>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{feature.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* How it works */}
                <section className="w-full py-24 md:py-32 px-6 flex justify-center relative overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                    <div className="w-full max-w-[1000px] flex flex-col items-center relative z-10">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>The Learning Loop</h2>
                            <p className="text-lg mt-4 max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>From passive watching to interactive mastery, seamlessly.</p>
                        </motion.div>

                        <div className="relative w-full flex flex-col gap-6">
                            {[
                                { step: '01', title: 'Watch Lectures', desc: 'Students watch video lectures. Playback speed, tab switches, and interactions are recorded to build the ICAP behavioral profile.' },
                                { step: '02', title: 'AI Analyzes Engagement', desc: 'MediaPipe securely extracts facial landmarks and gaze entirely in the browser. Engagement scores are sent to the backend.' },
                                { step: '03', title: 'Interactive Quizzes', desc: 'Upon completion, a varied ICAP quiz (MCQs, fill in blanks, short notes) is auto-triggered, followed by mandatory feedback.' },
                                { step: '04', title: 'Actionable Analytics', desc: 'Dashboard shows comprehensive teaching score, SHAP attributions, ICAP distribution, at-risk students, and recommendations.' },
                            ].map((item, i) => (
                                <motion.div
                                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={fadeInUp}
                                    key={i} className="relative z-10 flex flex-col md:flex-row gap-5 items-start p-6 rounded-xl border border-border hover:shadow-md transition-all group"
                                    style={{ background: 'var(--color-surface)' }}
                                >
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 group-hover:scale-105 transition-transform"
                                        style={{ background: 'var(--color-accent)', boxShadow: 'var(--shadow-accent)' }}>
                                        {item.step}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                                        <p className="leading-relaxed text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Research */}
                <section className="w-full py-24 px-6 flex justify-center" style={{ background: 'var(--color-surface-alt)' }}>
                    <div className="w-full max-w-[1400px]">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
                                style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', borderColor: 'var(--color-border)' }}>
                                <Shield size={14} /> Research-Backed
                            </div>
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight" style={{ color: 'var(--color-text)' }}>
                                Built on Peer-Reviewed Science
                            </h2>
                            <p className="text-lg mt-4 max-w-3xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                                Every engagement score is transparent and verifiable.
                            </p>
                        </motion.div>

                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { icon: Brain, title: 'XGBoost + SHAP', desc: "Following Das & Dev's approach with 82.9% accuracy on DAiSEE dataset. SHAP TreeExplainer provides feature-level attribution.", tags: ['Action Units', 'Gaze', 'Head Pose', 'Temporal'], color: 'accent' },
                                { icon: Star, title: 'ICAP Framework', desc: 'Chi & Wylie (2014) taxonomy classifies learning behaviors into Interactive, Constructive, Active, and Passive categories.', tags: ['I', 'C', 'A', 'P'], color: 'warning' },
                                { icon: Target, title: 'Fuzzy Logic', desc: 'Zhao et al. (2024) inspired human-readable IF/THEN rules that translate complex ML outputs into actionable insights.', tags: null, color: 'danger' },
                            ].map((item, i) => (
                                <motion.div variants={fadeInUp} key={i} className="p-6 rounded-xl border border-border hover:shadow-lg transition-all hover:-translate-y-1"
                                    style={{ background: 'var(--color-surface)' }}>
                                    <div className={`w-10 h-10 rounded-lg bg-${item.color}-light text-${item.color} flex items-center justify-center mb-4`}>
                                        <item.icon size={20} strokeWidth={2.5}/>
                                    </div>
                                    <h3 className="text-lg font-bold tracking-tight mb-3" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                                    {item.tags && (
                                        <div className="flex flex-wrap gap-2">
                                            {item.tags.map(t => (
                                                <span key={t} className="px-2.5 py-1 text-xs font-medium rounded-md border" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>{t}</span>
                                            ))}
                                        </div>
                                    )}
                                    {!item.tags && (
                                        <div className="p-3 rounded-lg text-xs font-mono" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                                            IF gaze_score LOW ∧ head_stable<br/>THEN engagement = "distracted"
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* CTA */}
                <section className="w-full py-24 px-6 text-white flex justify-center relative overflow-hidden"
                    style={{ background: 'var(--gradient-hero)' }}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px]"
                        style={{ background: 'color-mix(in srgb, var(--color-primary) 24%, transparent)' }} />
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                        className="w-full max-w-4xl text-center relative z-10 flex flex-col items-center"
                    >
                        <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
                            Ready to Transform<br/>Your Classroom?
                        </h2>
                        <p className="text-lg md:text-xl mb-10 max-w-3xl opacity-80">
                            Join Smart LMS and get AI-powered, explainable insights into student engagement today.
                        </p>
                        <Link to="/register" className="btn btn-lg px-10 py-4 text-lg rounded-xl group"
                            style={{ background: 'var(--color-accent)', color: 'white', boxShadow: 'var(--shadow-accent)' }}>
                            Get Started Free <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform ml-2" />
                        </Link>
                    </motion.div>
                </section>

                {/* Footer */}
                <footer className="w-full py-8 px-6 text-center text-sm" style={{ background: 'hsl(209, 61%, 9%)', color: 'hsl(203, 22%, 68%)' }}>
                    <p className="font-medium tracking-wide">
                        <span className="text-white font-bold mr-2">Smart LMS</span> v2.0 — AI-powered learning, analytics, and engagement platform
                    </p>
                </footer>
            </div>
        </div>
    );
}
