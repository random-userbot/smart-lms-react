import React from "react";
import { SplineScene } from "../components/ui/splite";
import { Spotlight } from "../components/ui/spotlight";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingHero() {
    return (
        <section className="w-full min-h-[calc(100vh-80px)] bg-surface relative overflow-hidden flex flex-col justify-center items-center border-[0px]">
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20 opacity-50"
                fill="var(--color-accent)"
            />

            <div className="w-full max-w-[1440px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 md:px-12 py-12 lg:py-0 text-center lg:text-left">
                {/* Left content */}
                <div className="flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-5 py-2.5 rounded-full text-sm font-black mb-8 tracking-widest uppercase mx-auto lg:mx-0 shadow-sm border border-accent/20 w-fit">
                        <Sparkles size={18} /> Next Generation Learning
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black text-text leading-[1.1] mb-8 tracking-tight">
                        Learn with <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-violet-500">Immersive AI.</span>
                    </h1>
                    
                    <p className="text-text-secondary text-xl md:text-2xl md:max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium mb-12">
                        A state-of-the-art learning management platform that tracks your engagement,
                        generates AI quizzes, and adapts to your behaviors in real-time.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                        <Link to="/register" className="btn btn-primary btn-lg shadow-accent flex items-center gap-2 group text-lg px-8 py-4 rounded-xl">
                            Get Started Free <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20}/>
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg text-lg px-8 py-4 rounded-xl">
                            Log in to Account
                        </Link>
                    </div>
                </div>

                {/* Right content - Spline */}
                <div className="w-full h-[450px] md:h-[600px] lg:h-[800px] relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-accent/20 blur-[120px] rounded-full mix-blend-screen -z-10" />
                    <SplineScene
                        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                        className="w-full h-full scale-[1.1] lg:scale-[1.3] relative z-10"
                    />
                </div>
            </div>
        </section>
    )
}
