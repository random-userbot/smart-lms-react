import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { lecturesAPI, engagementAPI, quizzesAPI, feedbackAPI, gamificationAPI } from '../../api/client';
import {
    Pause, Brain, Sparkles, BarChart3, Info, Play, FileText,
    Clock, CheckCircle, ArrowRight
} from 'lucide-react';
import { useActivity } from '../../context/ActivityTracker';
import { SHAPWaterfall, TopFactors, FuzzyRulesList, EngagementGauge } from '../../components/engagement/SHAPVisualization';
import { EngagementHeatmap, ICAPBadge } from '../../components/engagement/EngagementHeatmap';

import YouTubePlayer from '../../components/player/YouTubePlayer';
import QuizPhase from './QuizPhase';
import FeedbackPhase from './FeedbackPhase';
import MaterialsTab from './MaterialsTab';

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
    const location = useLocation();
    const [lecture, setLecture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [engagementScore, setEngagementScore] = useState(null);
    const [phase, setPhase] = useState('lecture'); 
    const [quizzes, setQuizzes] = useState([]);
    const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const featureBuffer = useRef([]);
    const [faceDetected, setFaceDetected] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const [playbackSpeedHistory, setPlaybackSpeedHistory] = useState([{ timestamp: Date.now(), speed: 1.0 }]);
    const [watchDuration, setWatchDuration] = useState(0);
    const [materials, setMaterials] = useState([]);
    const [activeTab, setActiveTab] = useState('video'); 
    const { trackEvent } = useActivity();

    const behaviorState = useRef({ keyboardActive: false, mouseActive: false, playbackSpeed: 1, note_taking: false });

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

    const selectedQuizId = new URLSearchParams(location.search).get('quizId');
    const requestedPhase = new URLSearchParams(location.search).get('phase');

    useEffect(() => {
        if (requestedPhase === 'quiz' && quizzes.length > 0) {
            setPhase('quiz');
        }
    }, [requestedPhase, quizzes.length]);

    const activeQuiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0] || null;

    useEffect(() => {
        const handleVisibility = () => {
            // Visibility tracking can be restored here if needed
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    useEffect(() => {
        let keyTimer, mouseTimer;
        const handleKey = (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
            behaviorState.current.keyboardActive = true;
            if (isInput && playing) behaviorState.current.note_taking = true;
            clearTimeout(keyTimer);
            keyTimer = setTimeout(() => {
                behaviorState.current.keyboardActive = false;
                behaviorState.current.note_taking = false;
            }, 3000);
        };
        const handleMouse = () => {
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

    const submitEngagement = async () => {
        if (featureBuffer.current.length === 0) return;
        try {
            const res = await engagementAPI.submit({
                session_id: sessionId,
                lecture_id: lectureId,
                features: featureBuffer.current,
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
        try { await gamificationAPI.awardPoints('lecture_complete', 20); } catch (e) { console.warn("Score award failed:", e); }
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

    const extractYouTubeId = (rawUrl) => {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        const url = rawUrl.trim();

        // Accept plain 11-char IDs directly.
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

        const patterns = [
            /[?&]v=([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /embed\/([a-zA-Z0-9_-]{11})/,
            /shorts\/([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match?.[1]) return match[1];
        }

        return null;
    };

    const normalizeLectureVideoUrl = (lectureData) => {
        const candidates = [lectureData?.youtube_url, lectureData?.video_url];

        for (const candidate of candidates) {
            if (!candidate || typeof candidate !== 'string') continue;
            const cleaned = candidate.trim();
            if (!cleaned) continue;

            const youtubeId = extractYouTubeId(cleaned);
            if (youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;

            return cleaned;
        }

        return '';
    };

    const videoUrl = normalizeLectureVideoUrl(lecture);

    return (
        <div className="min-h-[calc(100vh-64px)] w-full bg-surface-alt pb-24 overflow-x-hidden">
            {phase === 'lecture' && (
                <div className="w-full px-4 md:px-8 xl:px-12 pt-8">
                    <div className="flex gap-8 mb-6 border-b border-border w-full">
                        <button
                            className={`flex items-center gap-3 pb-4 font-bold transition-all border-b-2 tracking-wide text-lg ${activeTab === 'video' ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text hover:border-border border-b-transparent'}`}
                            onClick={() => setActiveTab('video')}
                        >
                            <Play size={22} /> Video Lecture
                        </button>
                        <button
                            className={`flex items-center gap-3 pb-4 font-bold transition-all border-b-2 tracking-wide text-lg ${activeTab === 'materials' ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text hover:border-border border-b-transparent'}`}
                            onClick={() => setActiveTab('materials')}
                        >
                            <FileText size={22} /> Reading Materials <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${activeTab === 'materials' ? 'bg-accent/10 text-accent' : 'bg-surface-elevated text-text-muted'}`}>{materials.length}</span>
                        </button>
                    </div>

                    <div className="bg-surface rounded-3xl shadow-lg border border-border overflow-hidden ring-1 ring-border/50 w-full mb-10">
                        {activeTab === 'video' ? (
                            <div className="w-full">
                                {videoUrl ? (
                                    <YouTubePlayer 
                                        url={videoUrl}
                                        transcript={lecture?.transcript}
                                        lectureTitle={lecture?.title}
                                        playing={playing}
                                        engagementScore={engagementScore}
                                        onPlayPause={setPlaying}
                                        onEnded={handleVideoEnd}
                                        playbackRate={playbackSpeed}
                                        onPlaybackRateChange={handlePlaybackSpeedChange}
                                        onProgress={(state) => {
                                            setWatchDuration(Math.floor(state.playedSeconds));
                                        }}
                                        onFeaturesReady={(features) => {
                                            setFaceDetected(features.face_detected);
                                            const featureVector = {
                                                ...features,
                                                session_id: sessionId,
                                                lecture_id: lectureId,
                                                timestamp: Date.now(),
                                                keyboard_active: behaviorState.current.keyboardActive,
                                                mouse_active: behaviorState.current.mouseActive,
                                                tab_visible: !document.hidden,
                                                playback_speed: playbackSpeed,
                                                note_taking: behaviorState.current.note_taking,
                                            };
                                            featureBuffer.current.push(featureVector);
                                            if (featureBuffer.current.length >= 10) submitEngagement();
                                        }}
                                    />
                                ) : (
                                    <div className="p-10 md:p-14 bg-surface-alt border-b border-border">
                                        <p className="text-lg font-bold text-text">No playable video URL found for this lecture.</p>
                                        <p className="text-sm text-text-muted mt-2">Please verify the lecture YouTube link in course settings.</p>
                                    </div>
                                )}

                                <div className="bg-surface border-b border-border px-10 md:px-14 py-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                                    <h2 className="text-3xl md:text-4xl font-black text-text truncate max-w-3xl tracking-tight" title={lecture.title}>{lecture.title}</h2>
                                    <div className="flex flex-wrap items-center gap-5">
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

                            </div>
                        ) : (
                            <MaterialsTab materials={materials} trackEvent={trackEvent} />
                        )}
                    </div>
                </div>
            )}

            {phase === 'quiz' && activeQuiz && (
                <QuizPhase
                    quiz={activeQuiz}
                    lectureId={lectureId}
                    sessionId={sessionId}
                    onComplete={() => setPhase('feedback')}
                />
            )}

            {phase === 'feedback' && (
                <FeedbackPhase
                    lectureId={lectureId}
                    courseId={lecture?.course_id}
                    onComplete={() => { setPhase('done'); }}
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
        <div className="px-10 md:px-14 py-8 bg-gradient-to-r from-surface via-surface-alt to-surface border-t border-border/50">
            <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-8 flex-wrap">
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
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">Lecture Heatmap (All Students)</div>
                                <EngagementHeatmap lectureId={lectureId} height={48} scope="lecture" autoRefreshMs={12000} />
                            </div>
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">My Engagement Heatmap</div>
                                <EngagementHeatmap lectureId={lectureId} height={48} scope="student" autoRefreshMs={12000} />
                            </div>
                        </div>
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


