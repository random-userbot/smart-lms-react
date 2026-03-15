import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { lecturesAPI, engagementAPI, quizzesAPI, feedbackAPI, gamificationAPI } from '../../api/client';
import {
    Play, Pause, Camera, CameraOff, Activity, Clock,
    AlertTriangle, CheckCircle, Send, Star, ThumbsUp, ArrowRight,
    FileText, Download, FileArchive, FileIcon, Brain, Sparkles, BarChart3, Info, Scan
} from 'lucide-react';
import { useActivity } from '../../context/ActivityTracker';
import { SHAPWaterfall, TopFactors, FuzzyRulesList, EngagementGauge } from '../../components/engagement/SHAPVisualization';
import { EngagementHeatmap, ICAPBadge, ICAPProgressBar } from '../../components/engagement/EngagementHeatmap';
import { MediaPipeExtractor, createMediaPipeFeatureVector } from '../../utils/mediapipe';

function createActivityOnlyVector(sessionId, lectureId, behaviorState) {
    return {
        session_id: sessionId,
        lecture_id: lectureId,
        timestamp: Date.now(),
        gaze_score: 0,
        head_pose_yaw: 0, head_pose_pitch: 0, head_pose_roll: 0, head_pose_stability: 0,
        eye_aspect_ratio_left: 0, eye_aspect_ratio_right: 0,
        blink_rate: 0, mouth_openness: 0,
        au01_inner_brow_raise: 0, au02_outer_brow_raise: 0, au04_brow_lowerer: 0,
        au06_cheek_raiser: 0, au12_lip_corner_puller: 0, au15_lip_corner_depressor: 0,
        au25_lips_part: 0, au26_jaw_drop: 0,
        face_detected: false,
        keyboard_active: behaviorState.keyboardActive,
        mouse_active: behaviorState.mouseActive,
        tab_visible: !document.hidden,
        playback_speed: 0,
        note_taking: behaviorState.keyboardActive,
        is_paused: true,
    };
}

export default function LecturePage() {
    const { lectureId } = useParams();
    const navigate = useNavigate();
    const [lecture, setLecture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [webcamOn, setWebcamOn] = useState(false);
    const [engagementScore, setEngagementScore] = useState(null);
    const [phase, setPhase] = useState('lecture'); 
    const [quizzes, setQuizzes] = useState([]);
    const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const webcamRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const featureBuffer = useRef([]);
    const intervalRef = useRef(null);
    const mediapipeRef = useRef(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [mediapipeReady, setMediapipeReady] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [keyboardEvents, setKeyboardEvents] = useState(0);
    const [mouseEvents, setMouseEvents] = useState(0);
    const [playbackSpeedHistory, setPlaybackSpeedHistory] = useState([{ timestamp: Date.now(), speed: 1.0 }]);
    const [watchDuration, setWatchDuration] = useState(0);
    const [materials, setMaterials] = useState([]);
    const [activeTab, setActiveTab] = useState('video'); 
    const { trackEvent } = useActivity();

    const behaviorState = useRef({ keyboardActive: false, mouseActive: false, playbackSpeed: 1 });

    useEffect(() => {
        Promise.all([
            lecturesAPI.get(lectureId),
            quizzesAPI.getByLecture(lectureId).catch(() => ({ data: [] })),
            lecturesAPI.getMaterials(lectureId).catch(() => ({ data: [] }))
        ]).then(([lectureRes, quizzesRes, materialsRes]) => {
            setLecture(lectureRes.data);
            setQuizzes(quizzesRes.data || []);
            setMaterials(materialsRes.data || []);
        }).finally(() => setLoading(false));
    }, [lectureId]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) setTabSwitches(prev => prev + 1);
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    useEffect(() => {
        let keyTimer, mouseTimer;
        const handleKey = (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
            setKeyboardEvents(prev => prev + 1);
            behaviorState.current.keyboardActive = true;

            if (isInput && playing) behaviorState.current.note_taking = true;

            clearTimeout(keyTimer);
            keyTimer = setTimeout(() => {
                behaviorState.current.keyboardActive = false;
                behaviorState.current.note_taking = false;
            }, 3000);
        };
        const handleMouse = () => {
            setMouseEvents(prev => prev + 1);
            behaviorState.current.mouseActive = true;
            clearTimeout(mouseTimer);
            mouseTimer = setTimeout(() => { behaviorState.current.mouseActive = false; }, 3000);
        };
        window.addEventListener('keydown', handleKey);
        window.addEventListener('mousemove', handleMouse);
        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('mousemove', handleMouse);
        };
    }, [playing]);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
            streamRef.current = stream;
            if (webcamRef.current) webcamRef.current.srcObject = stream;
            setWebcamOn(true);

            if (!mediapipeRef.current) {
                const extractor = new MediaPipeExtractor();
                extractor.onFeaturesReady = (features) => setFaceDetected(features.face_detected);
                const ok = await extractor.initialize();
                if (ok) {
                    mediapipeRef.current = extractor;
                    setMediapipeReady(true);
                }
            }
        } catch (err) {
            console.error('Webcam access denied:', err);
        }
    };

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (mediapipeRef.current) {
            mediapipeRef.current.destroy();
            mediapipeRef.current = null;
            setMediapipeReady(false);
            setFaceDetected(false);
        }
        setWebcamOn(false);
    };

    useEffect(() => {
        if (playing && !webcamOn) startWebcam();
    }, [playing]);

    useEffect(() => {
        if (!webcamOn) return;
        intervalRef.current = setInterval(async () => {
            let feature;
            if (playing && mediapipeRef.current && webcamRef.current) {
                const facialFeatures = await mediapipeRef.current.processFrame(webcamRef.current);
                feature = createMediaPipeFeatureVector(sessionId, lectureId, facialFeatures, behaviorState.current);
            } else if (playing) {
                feature = createActivityOnlyVector(sessionId, lectureId, behaviorState.current);
                feature.is_paused = false;
            } else {
                feature = createActivityOnlyVector(sessionId, lectureId, behaviorState.current);
            }
            featureBuffer.current.push(feature);

            if (featureBuffer.current.length >= 6) submitEngagement();
        }, 5000);
        return () => clearInterval(intervalRef.current);
    }, [playing, webcamOn]);

    useEffect(() => {
        let timer;
        if (playing) timer = setInterval(() => setWatchDuration(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, [playing]);

    useEffect(() => {
        return () => {
            if (mediapipeRef.current) {
                mediapipeRef.current.destroy();
                mediapipeRef.current = null;
            }
        };
    }, []);

    const submitEngagement = async () => {
        if (featureBuffer.current.length === 0) return;
        try {
            const res = await engagementAPI.submit({
                session_id: sessionId,
                lecture_id: lectureId,
                features: featureBuffer.current,
                keyboard_events: keyboardEvents,
                mouse_events: mouseEvents,
                tab_switches: tabSwitches,
                idle_time: 0,
                playback_speeds: playbackSpeedHistory,
                watch_duration: watchDuration,
                total_duration: lecture?.duration || 0,
            });
            setEngagementScore(res.data);
            featureBuffer.current = [];
        } catch (err) {
            console.error('Engagement submit error:', err);
        }
    };

    const handleVideoEnd = async () => {
        setPlaying(false);
        await submitEngagement();
        stopWebcam();
        try { await gamificationAPI.awardPoints('lecture_complete', 20); } catch { }
        if (quizzes.length > 0) setPhase('quiz');
        else setPhase('feedback');
    };

    const handlePlaybackSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        behaviorState.current.playbackSpeed = speed;
        setPlaybackSpeedHistory(prev => [...prev, { timestamp: Date.now(), speed }]);
    };

    if (loading) return <div className="page-container"><div className="spinner" /></div>;
    if (!lecture) return <div className="page-container text-center pt-20 text-text-muted font-bold text-xl">Lecture not found</div>;

    const videoUrl = lecture.youtube_url || lecture.video_url;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-surface-alt pb-16">
            {phase === 'lecture' && (
                <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10">
                    <div className="flex gap-4 mb-4">
                        <button
                            className={`flex items-center gap-2 px-8 py-3.5 rounded-t-2xl font-black transition-all border-b-2 tracking-wide ${activeTab === 'video' ? 'bg-surface text-accent border-accent shadow-[0_-4px_10px_-5px_var(--color-accent-light)]' : 'bg-surface-elevated text-text-muted border-transparent hover:bg-border'}`}
                            onClick={() => setActiveTab('video')}
                        >
                            <Play size={20} /> Video Lecture
                        </button>
                        <button
                            className={`flex items-center gap-2 px-8 py-3.5 rounded-t-2xl font-black transition-all border-b-2 tracking-wide ${activeTab === 'materials' ? 'bg-surface text-accent border-accent shadow-[0_-4px_10px_-5px_var(--color-accent-light)]' : 'bg-surface-elevated text-text-muted border-transparent hover:bg-border'}`}
                            onClick={() => setActiveTab('materials')}
                        >
                            <FileText size={20} /> Reading Materials <span className="ml-2 bg-surface-alt text-text-muted px-2.5 py-0.5 rounded-lg text-xs font-black border border-border">{materials.length}</span>
                        </button>
                    </div>

                    <div className="bg-surface rounded-b-[2.5rem] rounded-tr-[2.5rem] shadow-md border border-border overflow-hidden">
                        {activeTab === 'video' ? (
                            <>
                                <div className="bg-black w-full relative flex justify-center items-center h-[50vh] md:h-[70vh] overflow-hidden group">
                                    {videoUrl ? (
                                        <>
                                            <ReactPlayer
                                                ref={videoRef}
                                                url={videoUrl}
                                                playing={playing}
                                                controls
                                                width="100%"
                                                height="100%"
                                                playbackRate={playbackSpeed}
                                                onPlay={() => setPlaying(true)}
                                                onPause={() => setPlaying(false)}
                                                onEnded={handleVideoEnd}
                                                style={{ position: 'absolute', top: 0, left: 0 }}
                                            />
                                            {!playing && (
                                                <button
                                                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 group/playbtn"
                                                    onClick={() => setPlaying(true)}
                                                    aria-label="Play video"
                                                >
                                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover/playbtn:scale-110 transition-transform duration-300">
                                                        <Play size={48} className="text-accent ml-2" fill="currentColor" />
                                                    </div>
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-white flex flex-col items-center justify-center h-full gap-4">
                                            <div className="p-6 bg-white/10 rounded-full"><Play size={48} className="text-white/50" /></div>
                                            <span className="text-xl font-bold text-white/70">No video available for this lecture</span>
                                        </div>
                                    )}

                                    {engagementScore && (
                                        <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-md text-white px-5 py-4 rounded-2xl text-sm flex flex-col gap-1.5 border border-white/10 shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                            <div className="flex items-center gap-2">
                                                <Activity size={20} className="text-success" />
                                                <span className="font-extrabold tracking-wide text-base">Engagement: {engagementScore.overall_score.toFixed(0)}%</span>
                                            </div>
                                            <div className="text-xs font-black text-white/50 uppercase tracking-widest mt-1 hidden md:block">
                                                ICAP Focus: {engagementScore.icap_classification}
                                            </div>
                                        </div>
                                    )}

                                    {tabSwitches > 0 && (
                                        <div className="absolute top-6 right-6 bg-warning/90 backdrop-blur-md text-slate-900 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 shadow-lg border border-warning-light animate-pulse">
                                            <AlertTriangle size={18} /> {tabSwitches} Warning{tabSwitches > 1 ? 's' : ''}
                                        </div>
                                    )}

                                    {webcamOn && (
                                        <div className={`absolute bottom-8 right-8 w-36 h-36 md:w-64 md:h-64 rounded-[2rem] overflow-hidden shadow-2xl border-4 bg-slate-900 z-50 flex flex-col transition-all hover:scale-105 ${
                                            !faceDetected && playing
                                                ? 'border-danger/60 hover:border-danger/90'
                                                : playing
                                                ? 'border-success/40 hover:border-success/70'
                                                : 'border-warning/40 hover:border-warning/70'
                                        }`}>
                                            <div className="relative flex-1 overflow-hidden">
                                                <video ref={webcamRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${!playing ? 'brightness-50 grayscale' : ''}`} />
                                                
                                                {playing && mediapipeReady && (
                                                    <div className="absolute inset-0 pointer-events-none p-4">
                                                        <div className={`absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 rounded-tl-md transition-colors duration-300 ${faceDetected ? 'border-success/70' : 'border-danger/70'}`} />
                                                        <div className={`absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 rounded-tr-md transition-colors duration-300 ${faceDetected ? 'border-success/70' : 'border-danger/70'}`} />
                                                        <div className={`absolute bottom-12 left-4 w-6 h-6 border-b-4 border-l-4 rounded-bl-md transition-colors duration-300 ${faceDetected ? 'border-success/70' : 'border-danger/70'}`} />
                                                        <div className={`absolute bottom-12 right-4 w-6 h-6 border-b-4 border-r-4 rounded-br-md transition-colors duration-300 ${faceDetected ? 'border-success/70' : 'border-danger/70'}`} />
                                                    </div>
                                                )}

                                                {playing && mediapipeReady && !faceDetected && (
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 animate-pulse z-10 bg-black/60 px-4 py-2 rounded-xl backdrop-blur-sm">
                                                        <Scan size={24} className="text-danger" />
                                                        <span className="text-xs font-black text-danger uppercase tracking-widest">No Face</span>
                                                    </div>
                                                )}
                                                
                                                {!playing && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                                                        <Pause size={32} className="text-white mb-2" />
                                                        <span className="text-xs font-black text-white uppercase tracking-widest">Paused</span>
                                                        <span className="text-[10px] font-bold text-white/50 mt-1 uppercase tracking-wider">Activity mode</span>
                                                    </div>
                                                )}

                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 pb-3 text-white flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {playing ? (
                                                            faceDetected ? (
                                                                <span className="relative flex h-3 w-3">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                                                                </span>
                                                            ) : (
                                                                <span className="relative flex h-3 w-3">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-danger"></span>
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="relative flex h-3 w-3">
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-black uppercase tracking-wider hidden md:inline">
                                                            {playing
                                                                ? faceDetected
                                                                    ? (engagementScore ? `Focus: ${engagementScore.overall_score.toFixed(0)}%` : 'Analyzing...')
                                                                    : 'Face not detected'
                                                                : 'Idle'
                                                            }
                                                        </span>
                                                    </div>
                                                    {mediapipeReady && (
                                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest hidden md:inline">
                                                            MediaPipe
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-surface border-b border-border px-8 md:px-12 py-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                    <h2 className="text-2xl md:text-3xl font-black text-text truncate max-w-2xl tracking-tight" title={lecture.title}>{lecture.title}</h2>

                                    <div className="flex flex-wrap items-center gap-5">
                                        <div className="flex items-center gap-3 text-sm hidden md:flex">
                                            <span className="text-text-muted font-black uppercase tracking-widest text-xs">Speed</span>
                                            <div className="flex bg-surface-alt rounded-xl p-1 shadow-inner border border-border">
                                                {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                                                    <button key={speed} className={`px-4 py-2 rounded-lg font-black transition-all text-xs ${playbackSpeed === speed ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-surface-elevated'}`}
                                                        onClick={() => handlePlaybackSpeedChange(speed)}>
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black transition-all text-sm border shadow-sm ${webcamOn ? 'bg-danger-light text-danger border-danger/30 hover:bg-danger/20' : 'bg-primary text-white border-primary-light hover:bg-primary-light hover:shadow-md'}`}
                                            onClick={() => webcamOn ? stopWebcam() : startWebcam()}>
                                            {webcamOn ? <><CameraOff size={18} /> Disable Focus</> : <><Camera size={18} /> Enable AI Focus</>}
                                        </button>

                                        {webcamOn && mediapipeReady && (
                                            <div className={`flex items-center gap-2 text-xs font-black px-4 py-3 rounded-xl border ${
                                                faceDetected
                                                    ? 'bg-success-light text-success border-success/30'
                                                    : 'bg-danger-light text-danger border-danger/30 animate-pulse'
                                            }`}>
                                                <Scan size={16} />
                                                {faceDetected ? 'Face Tracked' : 'No Face'}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm font-black text-text-secondary bg-surface-alt px-5 py-3 rounded-xl border border-border shadow-inner">
                                            <Clock size={16} className="text-text-muted" /> {Math.floor(watchDuration / 60)}:{(watchDuration % 60).toString().padStart(2, '0')}
                                        </div>
                                    </div>
                                </div>

                                {engagementScore && (
                                    <div className="border-b border-border">
                                        <EngagementIntelligencePanel engagementScore={engagementScore} lectureId={lectureId} />
                                    </div>
                                )}

                                <div className="p-8 md:p-12 bg-surface-alt border-t border-border">
                                    <label className="flex items-center gap-2 font-black mb-4 text-text text-xl tracking-tight"><FileText size={24} className="text-accent" /> Personal Notes <span className="ml-3 font-bold text-xs bg-accent-light text-accent border border-accent/20 px-3 py-1.5 rounded-lg uppercase tracking-widest hidden md:inline-block">Boosts Interaction Score</span></label>
                                    <textarea
                                        className="w-full p-6 border border-border rounded-2xl focus:ring-4 focus:ring-accent/20 focus:border-accent bg-surface shadow-inner resize-y text-text font-medium placeholder-text-muted transition-all text-lg leading-relaxed"
                                        placeholder="Taking active notes here will be detected by the AI Tutor to boost your ICAP interaction state to constructive..."
                                        rows={4}
                                    />
                                </div>

                            </>
                        ) : (
                            <MaterialsTab materials={materials} trackEvent={trackEvent} />
                        )}
                    </div>
                </div>
            )}

            {phase === 'quiz' && quizzes.length > 0 && (
                <QuizPhase
                    quiz={quizzes[0]}
                    lectureId={lectureId}
                    sessionId={sessionId}
                    webcamRef={webcamRef}
                    webcamOn={webcamOn}
                    onComplete={() => setPhase('feedback')}
                />
            )}

            {phase === 'feedback' && (
                <FeedbackPhase
                    lectureId={lectureId}
                    courseId={lecture?.course_id}
                    onComplete={() => { stopWebcam(); setPhase('done'); }}
                />
            )}

            {phase === 'done' && (
                <div className="max-w-4xl mx-auto px-6 py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="inline-flex items-center justify-center p-8 bg-success-light text-success border border-success/20 rounded-full mb-8 shadow-sm">
                        <CheckCircle size={80} strokeWidth={2.5}/>
                    </div>
                    <h2 className="text-5xl font-black text-text mb-4 tracking-tight">Session Complete!</h2>
                    <p className="text-xl text-text-secondary font-medium mb-12 max-w-2xl mx-auto">
                        Your engagement data, quiz results, and feedback have been successfully recorded.
                    </p>

                    {engagementScore && (
                        <div className="space-y-8 text-left mb-12">
                            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 overflow-hidden relative group">
                                <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><Activity size={240} /></div>
                                <h3 className="text-2xl font-black text-text mb-8 flex items-center gap-3 relative z-10"><Activity className="text-accent" size={28}/> Focus Summary</h3>
                                
                                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                    <EngagementGauge score={engagementScore.overall_score || engagementScore.engagement} size={180} />
                                    <div className="flex-1 space-y-4 w-full">
                                        <div className="flex justify-between items-center p-5 bg-surface-alt rounded-2xl border border-border">
                                            <span className="font-bold text-text-secondary text-lg">Engagement</span>
                                            <span className="text-2xl font-black text-accent">{engagementScore.engagement?.toFixed(0)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-5 bg-surface-alt rounded-2xl border border-border">
                                            <span className="font-bold text-text-secondary text-lg">Boredom Index</span>
                                            <span className="text-2xl font-black text-danger">{engagementScore.boredom?.toFixed(0)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-5 bg-accent-light rounded-2xl border border-accent/20">
                                            <span className="font-bold text-accent text-lg">ICAP Classification</span>
                                            <ICAPBadge level={engagementScore.icap_classification} size="lg" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {engagementScore.top_factors?.length > 0 && (
                                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10">
                                    <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
                                        <Brain className="text-violet-500" size={24} /> What Influenced Your Score
                                    </h3>
                                    <SHAPWaterfall 
                                        shapValues={engagementScore.top_factors?.map(f => ({
                                            feature: f.feature,
                                            value: f.importance,
                                        }))} 
                                    />
                                </div>
                            )}

                            {engagementScore.fuzzy_rules?.length > 0 && (
                                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10">
                                    <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
                                        <Sparkles className="text-warning" size={24} /> AI Observations
                                    </h3>
                                    <FuzzyRulesList rules={engagementScore.fuzzy_rules} />
                                </div>
                            )}

                            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10">
                                <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
                                    <BarChart3 className="text-success" size={24} /> Engagement Over Time
                                </h3>
                                <EngagementHeatmap lectureId={lectureId} height={64} />
                            </div>
                        </div>
                    )}

                    <button className="btn btn-primary btn-lg shadow-accent bg-primary text-white border-primary hover:bg-primary-light px-10 py-5 text-xl" onClick={() => navigate(-1)}>
                        <ArrowRight size={24} className="mr-3" /> Back to Course 
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Real-time Engagement Intelligence Panel ────────────
function EngagementIntelligencePanel({ engagementScore, lectureId }) {
    const [expanded, setExpanded] = useState(false);

    if (!engagementScore) return null;

    const score = engagementScore.overall_score || engagementScore.engagement || 0;
    const icap = engagementScore.icap_classification || 'passive';
    const confidence = engagementScore.confidence || engagementScore.icap_confidence || 0;
    const modelType = engagementScore.model_type || 'rule_based';

    return (
        <div className="px-8 md:px-12 py-6 bg-gradient-to-r from-surface via-surface-alt to-surface">
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border ${
                            score >= 70 ? 'bg-success-light text-success border-success/30' :
                            score >= 40 ? 'bg-warning-light text-warning border-warning/30' :
                            'bg-danger-light text-danger border-danger/30'
                        }`}>
                            {score.toFixed(0)}
                        </div>
                        <div>
                            <div className="text-sm font-black text-text tracking-tight uppercase">AI Engagement</div>
                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5">
                                {modelType === 'xgboost_shap' ? 'ML Model Run' : 'Rule Engine Run'}
                            </div>
                        </div>
                    </div>

                    <ICAPBadge level={icap} size="md" />

                    <div className="hidden md:flex items-center gap-3 text-xs font-black text-text-muted uppercase tracking-widest">
                        <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${confidence * 100}%` }} />
                        </div>
                        {(confidence * 100).toFixed(0)}% conf
                    </div>
                </div>

                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-sm font-black text-accent hover:text-accent-hover transition-colors px-4 py-2.5 rounded-xl border border-accent/20 hover:bg-accent-light"
                >
                    <Brain size={16} />
                    {expanded ? 'Hide Details' : 'Explain Score'}
                </button>
            </div>

            {expanded && (
                <div className="mt-6 border-t border-border pt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                            <h4 className="text-sm font-black text-text mb-5 flex items-center gap-2 uppercase tracking-wide">
                                <Sparkles size={16} className="text-violet-500" /> What's Driving Your Score
                            </h4>
                            {engagementScore.top_factors?.length > 0 ? (
                                <TopFactors factors={engagementScore.top_factors?.map(f => ({
                                    feature: f.feature,
                                    importance: f.importance,
                                }))} maxShow={5} />
                            ) : (
                                <div className="text-sm text-text-muted font-bold p-6 bg-surface-alt rounded-2xl text-center border border-border">
                                    Collecting more data to explain your score...
                                </div>
                            )}
                        </div>

                        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                            <h4 className="text-sm font-black text-text mb-5 flex items-center gap-2 uppercase tracking-wide">
                                <Info size={16} className="text-warning" /> AI Observations
                            </h4>
                            {engagementScore.fuzzy_rules?.length > 0 ? (
                                <FuzzyRulesList rules={engagementScore.fuzzy_rules.slice(0, 3)} />
                            ) : (
                                <div className="text-sm text-text-muted font-bold p-6 bg-surface-alt rounded-2xl text-center border border-border">
                                    No specific observations yet. Keep watching!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                        <h4 className="text-sm font-black text-text mb-5 flex items-center gap-2 uppercase tracking-wide">
                            <BarChart3 size={16} className="text-success" /> Engagement Timeline
                        </h4>
                        <EngagementHeatmap lectureId={lectureId} height={48} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Engagement', value: engagementScore.engagement, color: 'text-success bg-success-light border-success/20' },
                            { label: 'Boredom', value: engagementScore.boredom, color: 'text-danger bg-danger-light border-danger/20' },
                            { label: 'Confusion', value: engagementScore.confusion, color: 'text-warning bg-warning-light border-warning/20' },
                            { label: 'Frustration', value: engagementScore.frustration, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                        ].map(d => (
                            <div key={d.label} className={`text-center p-4 rounded-2xl border ${d.color}`}>
                                <div className="text-2xl font-black mb-1">{(d.value || 0).toFixed(0)}%</div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-80">{d.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Materials Tab ───────────────────────────────────────
function MaterialsTab({ materials, trackEvent }) {
    if (materials.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-center">
                <div className="p-8 bg-surface-alt text-text-muted rounded-[2rem] mb-6 inline-flex items-center justify-center">
                    <FileText size={64} strokeWidth={1}/>
                </div>
                <h3 className="text-2xl font-black text-text mb-3 tracking-tight">No materials available</h3>
                <p className="text-text-secondary font-medium text-lg max-w-sm">There are no reading materials or resources attached to this lecture.</p>
            </div>
        );
    }

    const handleDownload = (mat) => {
        trackEvent('material_download', { file_id: mat.id, file_name: mat.title, file_type: mat.file_type });
        window.open(mat.file_url, '_blank');
    };

    const getIcon = (type) => {
        if (type.includes('pdf')) return <div className="p-4 bg-danger-light text-danger rounded-2xl"><FileText size={28} /></div>;
        if (type.includes('zip') || type.includes('rar')) return <div className="p-4 bg-warning-light text-warning rounded-2xl"><FileArchive size={28} /></div>;
        return <div className="p-4 bg-info-light text-info rounded-2xl"><FileIcon size={28} /></div>;
    };

    return (
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-surface-alt">
            {materials.map(mat => (
                <div key={mat.id} className="bg-surface rounded-3xl p-6 shadow-sm border border-border flex items-center gap-5 hover:shadow-md hover:border-accent-light transition-all group">
                    <div>
                        {getIcon(mat.file_type)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-text text-lg mb-1 truncate" title={mat.title}>{mat.title}</h4>
                        <span className="text-xs font-black text-text-muted uppercase tracking-widest">
                            {mat.file_type} • {(mat.file_size / 1024).toFixed(0)} KB
                        </span>
                    </div>
                    <button
                        className="w-12 h-12 rounded-full bg-surface-elevated hover:bg-accent-light text-text-muted hover:text-accent flex items-center justify-center transition-colors border border-border focus:opacity-100 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDownload(mat)}
                        title="Download">
                        <Download size={20} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Quiz Phase ─────────────────────────────────────────

function QuizPhase({ quiz, lectureId, sessionId, onComplete }) {
    const [answers, setAnswers] = useState({});
    const [violations, setViolations] = useState([]);
    const [timeLeft, setTimeLeft] = useState(quiz.time_limit || 600);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handler = () => {
            if (document.hidden) {
                setViolations(prev => [...prev, { type: 'tab_switch', timestamp: new Date().toISOString(), details: 'Left quiz tab' }]);
            }
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setViolations(prev => [...prev, { type: 'copy_paste', timestamp: new Date().toISOString(), details: 'Paste attempted' }]);
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, []);

    const handleSubmit = async () => {
        if (submitted) return;
        setSubmitted(true);

        try {
            const res = await quizzesAPI.submitAttempt({
                quiz_id: quiz.id,
                answers,
                violations,
                started_at: new Date().toISOString(),
                time_spent: (quiz.time_limit || 600) - timeLeft,
            });
            setResult(res.data);
            try { await gamificationAPI.awardPoints('quiz_complete', 15); } catch { }
        } catch (err) {
            console.error('Quiz submit error:', err);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (result) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-16 text-center text-text relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700 -translate-y-8 translate-x-8"><CheckCircle size={300} /></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="p-6 bg-success-light text-success rounded-full mb-8 inline-flex border border-success/20 shadow-sm">
                            <CheckCircle size={64} strokeWidth={2.5}/>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-text mb-4 tracking-tight">Quiz Complete!</h2>

                        <div className="text-[6rem] md:text-[8rem] font-black text-accent tracking-tighter my-8 drop-shadow-sm leading-none">
                            {result.percentage.toFixed(0)}<span className="text-5xl md:text-6xl items-start">%</span>
                        </div>
                        <div className="text-xl font-black text-text-secondary uppercase tracking-widest bg-surface-alt px-10 py-4 rounded-3xl border border-border mb-12 shadow-sm">
                            {result.score} / {result.max_score} Points Earned
                        </div>

                        {violations.length > 0 && (
                            <div className="mb-12 w-full max-w-lg bg-warning-light border border-warning/30 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3 text-warning font-black uppercase tracking-wide"><AlertTriangle size={24} /> Proctoring Alert</div>
                                <span className="bg-surface text-warning px-4 py-2 rounded-xl text-sm font-black border border-warning/20 shadow-sm">Integrity: {result.integrity_score.toFixed(0)}%</span>
                            </div>
                        )}

                        <button className="btn btn-primary btn-lg shadow-accent px-12 py-5 text-xl w-full max-w-sm"
                            onClick={onComplete}>
                            Continue to Feedback <ArrowRight size={24} className="ml-2"/>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in">
            {/* Timer & Header */}
            <div className="bg-surface rounded-3xl shadow-sm border border-border p-8 md:p-10 mb-10 sticky top-6 z-40 backdrop-blur-xl bg-surface/90">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-3xl lg:text-4xl font-black text-text leading-tight flex-1 tracking-tight">{quiz.title}</h2>
                    <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black tracking-widest text-2xl shadow-sm border ${timeLeft < 60 ? 'bg-danger-light text-danger border-danger/30 animate-pulse w-full md:w-auto' : timeLeft < 120 ? 'bg-warning-light text-warning border-warning/30 w-full md:w-auto' : 'bg-surface-elevated text-text border-border w-full md:w-auto'}`}>
                        <Clock size={28} /> {formatTime(timeLeft)}
                    </div>
                </div>

                {violations.length > 0 && (
                    <div className="mt-6 p-5 bg-danger-light border border-danger/30 rounded-2xl text-danger text-base font-black flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={24} className="text-danger" /> {violations.length} Integrity violation(s) detected. Stay on this tab and do not paste.
                    </div>
                )}
            </div>

            {/* Questions */}
            <div className="space-y-8 md:space-y-12">
                {quiz.questions.map((q, i) => (
                    <div key={i} className="bg-surface rounded-[2.5rem] shadow-sm border border-border overflow-hidden group">
                        <div className="p-8 md:p-12 border-b border-border bg-surface-alt">
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <span className="bg-accent-light text-accent border border-accent/20 font-black uppercase tracking-widest text-xs px-4 py-1.5 rounded-xl">Question {i + 1}</span>
                                <span className="bg-surface border border-border text-text-secondary font-black uppercase tracking-widest text-xs px-4 py-1.5 rounded-xl shadow-sm">{q.icap_level || 'active'}</span>
                                <span className="bg-surface border border-border text-text-muted font-bold uppercase tracking-widest text-xs px-4 py-1.5 rounded-xl shadow-sm">{q.type.replace('_', ' ')}</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-text leading-relaxed tracking-tight group-hover:text-accent transition-colors">
                                {q.question}
                            </p>
                        </div>

                        <div className="p-8 md:p-12">
                            {q.type === 'mcq' || q.type === 'true_false' ? (
                                <div className="flex flex-col gap-4">
                                    {(q.options || ['True', 'False']).map((opt, j) => {
                                        const isSelected = answers[String(i)] === opt;
                                        return (
                                            <label key={j} className={`group/opt flex items-center gap-5 p-5 md:p-6 rounded-2xl cursor-pointer transition-all border-2 shadow-sm ${isSelected ? 'border-accent bg-accent-light shadow-md' : 'border-border bg-surface hover:border-accent/40 hover:bg-surface-alt'}`}>
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-accent bg-accent' : 'border-border group-hover/opt:border-accent/60 bg-surface'}`}>
                                                    {isSelected && <div className="w-3.5 h-3.5 bg-white rounded-full scale-in-center shadow-sm" />}
                                                </div>
                                                <input type="radio" className="hidden" value={opt} checked={isSelected} onChange={() => setAnswers({ ...answers, [String(i)]: opt })} />
                                                <span className={`font-bold text-lg md:text-xl ${isSelected ? 'text-accent' : 'text-text-secondary group-hover/opt:text-text'}`}>{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : q.type === 'fill_in_blank' ? (
                                <div className="text-xl font-medium text-text leading-[3rem]">
                                    {q.question.split('___').map((part, pIdx, arr) => (
                                        <React.Fragment key={pIdx}>
                                            {part}
                                            {pIdx < arr.length - 1 && (
                                                <input type="text"
                                                    className="inline-block mx-3 px-5 py-2 border-b-2.5 border-text-muted bg-surface-alt focus:bg-accent-light focus:border-accent outline-none w-40 md:w-56 text-center text-accent font-black rounded-t-xl transition-colors placeholder-text-muted"
                                                    placeholder="..."
                                                    value={answers[String(i)]?.[pIdx] || ''}
                                                    onChange={(e) => {
                                                        const newAns = [...(answers[String(i)] || [])];
                                                        newAns[pIdx] = e.target.value;
                                                        setAnswers({ ...answers, [String(i)]: newAns });
                                                    }}
                                                />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            ) : (
                                <textarea className="w-full p-6 rounded-2xl border-2 border-border focus:border-accent focus:ring-4 focus:ring-accent/20 outline-none min-h-[200px] resize-y text-text font-medium text-xl leading-relaxed bg-surface-alt focus:bg-surface transition-all shadow-inner placeholder-text-muted"
                                    placeholder="Write your detailed explanation or answer here..."
                                    value={answers[String(i)] || ''}
                                    onChange={e => setAnswers({ ...answers, [String(i)]: e.target.value })}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button className="btn btn-primary btn-lg shadow-accent mt-12 w-full py-6 text-2xl" onClick={handleSubmit}>
                <Send size={28} className="mr-3 animate-pulse" /> Submit Quiz Answers
            </button>
        </div>
    );
}

// ─── Feedback Phase ─────────────────────────────────────

function FeedbackPhase({ lectureId, courseId, onComplete }) {
    const [form, setForm] = useState({
        overall_rating: 0, content_quality: 0, teaching_clarity: 0, pacing: 0,
        difficulty_level: 0, text: '', suggestions: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (form.overall_rating === 0) return;
        try {
            await feedbackAPI.submit({
                lecture_id: lectureId,
                course_id: courseId,
                ...form,
            });
            try { await gamificationAPI.awardPoints('feedback', 10); } catch { }
            setSubmitted(true);
            setTimeout(onComplete, 1500);
        } catch (err) {
            console.error('Feedback error:', err);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-24 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="inline-flex items-center justify-center p-8 bg-success-light text-success rounded-full mb-8 border border-success/20 shadow-sm">
                    <ThumbsUp size={80} strokeWidth={2.5}/>
                </div>
                <h2 className="text-4xl lg:text-5xl font-black text-text tracking-tight mb-4">Thank you for your feedback!</h2>
                <p className="text-text-secondary text-xl font-medium mt-3">Your insights help us improve the course experience.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-12 animate-in fade-in">
            <div className="text-center md:text-left mb-10">
                <h2 className="text-4xl font-black text-text mb-4 tracking-tight">How was this lecture?</h2>
                <div className="inline-flex items-center gap-3 bg-success-light border border-success/30 px-5 py-2.5 rounded-2xl text-success text-sm font-black shadow-sm uppercase tracking-wide">
                    <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></span>
                    Your feedback is 100% anonymized.
                </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-14 mb-10 space-y-12">
                <div>
                    <label className="block text-2xl font-black text-text mb-6 text-center md:text-left tracking-tight">Overall Experience Rating</label>
                    <div className="flex justify-center md:justify-start gap-3">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setForm({ ...form, overall_rating: s })}
                                className="p-2 transition-transform hover:scale-110 focus:outline-none cursor-pointer">
                                <Star size={56}
                                    fill={s <= form.overall_rating ? '#f59e0b' : 'none'}
                                    color={s <= form.overall_rating ? '#f59e0b' : '#cbd5e1'}
                                    className={`transition-colors ${s <= form.overall_rating ? 'drop-shadow-sm scale-110' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full h-px bg-border"></div>

                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-text mb-6 flex items-center gap-4"><div className="w-1.5 h-8 bg-accent rounded-full"></div> Detailed Metrics</h3>
                    {[
                        { key: 'teaching_clarity', label: 'Clarity (Did you understand?)' },
                        { key: 'pacing', label: 'Pacing (Too fast or slow?)' },
                        { key: 'difficulty_level', label: 'Perceived Difficulty' },
                    ].map(({ key, label }) => (
                        <div key={key} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 bg-surface-alt rounded-2xl border border-border shadow-sm">
                            <label className="text-base font-bold text-text-secondary">{label}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setForm({ ...form, [key]: s })}
                                        className="p-1.5 focus:outline-none transition-transform hover:scale-110 cursor-pointer">
                                        <Star size={32}
                                            fill={s <= form[key] ? '#f59e0b' : 'none'}
                                            color={s <= form[key] ? '#f59e0b' : '#cbd5e1'} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full h-px bg-border"></div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-xl font-black text-text flex items-center gap-4"><div className="w-1.5 h-6 bg-accent rounded-full"></div> Your Feedback</label>
                        <textarea className="input min-h-[160px] resize-y placeholder-text-muted py-5 px-6 rounded-2xl text-lg shadow-inner bg-surface-alt focus:bg-surface border-2"
                            placeholder="What did you think about this lecture? Be honest!"
                            value={form.text}
                            onChange={e => setForm({ ...form, text: e.target.value })} />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xl font-black text-text flex items-center gap-4"><div className="w-1.5 h-6 bg-accent rounded-full"></div> Suggestions for Improvement</label>
                        <textarea className="input min-h-[140px] resize-y placeholder-text-muted py-5 px-6 rounded-2xl text-lg shadow-inner bg-surface-alt focus:bg-surface border-2"
                            placeholder="How could we make this lecture even better?"
                            value={form.suggestions}
                            onChange={e => setForm({ ...form, suggestions: e.target.value })} />
                    </div>
                </div>
            </div>

            <button className="btn btn-primary btn-lg shadow-accent w-full py-6 text-xl disabled:opacity-50 disabled:bg-border disabled:border-border disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
                onClick={handleSubmit} disabled={form.overall_rating === 0}>
                <Send size={24} className="mr-3" /> Submit Feedback Anonymously
            </button>
        </div>
    );
}
