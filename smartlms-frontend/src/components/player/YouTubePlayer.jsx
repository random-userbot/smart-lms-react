import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { 
    Maximize2, Minimize2, Settings, MessageSquare, 
    ChevronRight, ChevronLeft, Brain, Sparkles,
    Play, Pause, Volume2, VolumeX, SkipForward, SkipBack
} from 'lucide-react';
import EngagementCamera from './EngagementCamera';

/**
 * YouTubePlayer
 * A premium, integrated player component for SmartLMS.
 * Features: PiP Camera, Synchronized Transcripts, AI Insights.
 */
const YouTubePlayer = ({ 
    url, 
    transcript = "", 
    onProgress, 
    onFeaturesReady,
    onEnded,
    playing: externalPlaying = false,
    onPlayPause,
    playbackRate = 1,
    onPlaybackRateChange,
    lectureTitle = "",
    engagementScore = null,
}) => {
    const containerRef = useRef(null);
    const playerRef = useRef(null);
    const [playing, setPlaying] = useState(externalPlaying);
    const [volume, setVolume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [played, setPlayed] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showTranscript, setShowTranscript] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playerError, setPlayerError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [latestFeatures, setLatestFeatures] = useState(null);

    // Sync external playing state
    useEffect(() => {
        setPlaying(externalPlaying);
    }, [externalPlaying]);

    useEffect(() => {
        setPlayerError(false);
    }, [url]);

    useEffect(() => {
        const onChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (document.fullscreenElement === containerRef.current) {
                await document.exitFullscreen();
            } else if (containerRef.current?.requestFullscreen) {
                await containerRef.current.requestFullscreen();
            }
        } catch (err) {
            console.warn('Fullscreen toggle failed', err);
        }
    };

    const handlePlayPause = () => {
        const newState = !playing;
        setPlaying(newState);
        if (onPlayPause) onPlayPause(newState);
    };

    const handleProgress = (state) => {
        setPlayed(state.played);
        setCurrentTime(state.playedSeconds);
        if (onProgress) onProgress(state);
    };

    const handleDuration = (dur) => {
        setDuration(dur);
    };

    const seekTo = (seconds) => {
        playerRef.current?.seekTo(seconds, 'seconds');
    };

    // Simple transcript parser (splits by sentences or timestamps if present)
    const transcriptLines = transcript ? transcript.split('. ').map((text, i) => ({
        id: i,
        time: i * 5, // Simulated timestamps for now if not provided
        text: text.trim() + '.'
    })) : [];

    const liveAlerts = useMemo(() => {
        const alerts = [];
        const f = latestFeatures;
        if (!f) return alerts;
        if (!f.face_detected) alerts.push({ severity: 'high', text: 'Face not detected' });
        if ((f.gaze_score ?? 0) < 0.35) alerts.push({ severity: 'high', text: 'Low focus gaze' });
        if (Math.abs(f.head_pose_yaw ?? 0) > 20) alerts.push({ severity: 'medium', text: 'Head turned away' });
        if ((f.blink_rate ?? 0) > 35) alerts.push({ severity: 'medium', text: 'High blink rate' });
        if ((engagementScore?.engagement ?? 100) < 40) alerts.push({ severity: 'high', text: 'Low engagement score' });
        return alerts.slice(0, 3);
    }, [latestFeatures, engagementScore]);

    const onCameraFeaturesReady = (features) => {
        setLatestFeatures(features);
        if (onFeaturesReady) onFeaturesReady(features);
    };

    return (
        <div ref={containerRef} className="smart-player-container">
            <div className={`player-layout ${showTranscript ? 'with-sidebar' : 'full'}`}>
                {/* Main Video Section */}
                <div className="video-section">
                    <div className="player-wrapper">
                        {playerError ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-black text-white">
                                <p className="text-lg font-bold">Unable to load this video in the embedded player.</p>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 text-sm font-bold underline"
                                >
                                    Open video in YouTube
                                </a>
                            </div>
                        ) : (
                            <ReactPlayer
                                ref={playerRef}
                                src={url}
                                controls={true}
                                playsInline={true}
                                playing={playing}
                                volume={volume}
                                muted={muted}
                                width="100%"
                                height="100%"
                                onProgress={handleProgress}
                                onDuration={handleDuration}
                                onEnded={onEnded}
                                onError={(error) => {
                                    console.error('Video playback error:', error);
                                    setPlayerError(true);
                                }}
                                playbackRate={playbackRate}
                                onPlaybackRateChange={onPlaybackRateChange}
                                config={{
                                    youtube: {
                                        playerVars: {
                                            modestbranding: 1,
                                            rel: 0,
                                            controls: 1,
                                            playsinline: 1
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Companion Action Bar Below Video */}
                <div className="flex items-center justify-between p-4 bg-surface-alt border-t border-border mt-auto col-span-full xl:col-span-1 rounded-b-2xl">
                    <div className="flex items-center gap-3">
                        <span className="badge ai-badge bg-accent-light text-accent border border-accent/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={14} /> AI Enhanced Player
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleFullscreen}
                            className="btn btn-sm bg-surface text-text-secondary border-border hover:bg-surface-elevated hover:text-text font-bold transition-all shadow-sm"
                        >
                            {isFullscreen ? <><Minimize2 size={16} className="mr-2" /> Exit Fullscreen</> : <><Maximize2 size={16} className="mr-2" /> Fullscreen + AI</>}
                        </button>
                        <button 
                            onClick={() => setShowTranscript(!showTranscript)} 
                            className={`btn btn-sm ${showTranscript ? 'bg-accent text-white border-accent' : 'bg-surface text-text-secondary border-border hover:bg-surface-elevated hover:text-text'} font-bold transition-all shadow-sm`}
                        >
                            <MessageSquare size={16} className="mr-2" /> 
                            {showTranscript ? 'Hide Transcript' : 'Review Transcript'}
                        </button>
                    </div>
                </div>

                {/* Transcript Sidebar */}
                {showTranscript && (
                    <div className="transcript-sidebar">
                        <div className="sidebar-header">
                            <h4 className="sidebar-title">Lecture Transcript</h4>
                            <div className="header-icon"><Brain size={16} /></div>
                        </div>
                        <div className="transcript-content">
                            {transcriptLines.length > 0 ? (
                                transcriptLines.map((line) => (
                                    <div 
                                        key={line.id} 
                                        className={`transcript-line ${currentTime >= line.time && currentTime < line.time + 5 ? 'active' : ''}`}
                                        onClick={() => seekTo(line.time)}
                                    >
                                        <span className="line-time">{formatTime(line.time)}</span>
                                        <p className="line-text">{line.text}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="no-transcript">
                                    <div className="skeleton-line" style={{ width: '80%' }} />
                                    <div className="skeleton-line" style={{ width: '60%' }} />
                                    <div className="skeleton-line" style={{ width: '90%' }} />
                                    <p>Transcript loading...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Engagement Camera - Integrated and Automatic */}
            <EngagementCamera
                onFeaturesReady={onCameraFeaturesReady}
                autoStart={playing}
                shouldRun={playing}
                engagementScore={engagementScore}
                alerts={liveAlerts}
                fullscreenOverlay={isFullscreen}
            />

            <style dangerouslySetInnerHTML={{ __html: `
                .smart-player-container {
                    width: 100%;
                    border-radius: 24px;
                    background: #0f172a;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .player-layout {
                    display: grid;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .player-layout.with-sidebar {
                    grid-template-columns: 1fr 320px;
                }

                .player-layout.full {
                    grid-template-columns: 1fr 0px;
                }

                .video-section {
                    position: relative;
                    background: #000;
                    aspect-ratio: 16/9;
                }

                .player-wrapper {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .player-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.8) 100%);
                    opacity: 0;
                    transition: opacity 0.3s;
                    z-index: 10;
                }

                .player-wrapper:hover .player-overlay {
                    opacity: 1;
                }

                .overlay-top {
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .video-title {
                    color: white;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }

                .badge {
                    padding: 4px 12px;
                    border-radius: 99px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .ai-badge {
                    background: linear-gradient(45deg, #6366f1, #a855f7);
                    color: white;
                }

                .overlay-center {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .big-play-icon {
                    color: white;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));
                    transition: transform 0.2s;
                }

                .overlay-center:hover .big-play-icon {
                    transform: scale(1.1);
                }

                .overlay-bottom {
                    padding: 20px 24px;
                }

                .progress-bar-container {
                    margin-bottom: 12px;
                }

                .progress-bg {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: height 0.2s;
                }

                .progress-bg:hover {
                    height: 8px;
                }

                .progress-filled {
                    height: 100%;
                    background: #6366f1;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
                }

                .controls-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .controls-left, .controls-right, .controls-center {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .controls-center {
                    flex: 1;
                    justify-content: center;
                }

                .speed-selector {
                    display: flex;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 2px;
                    border-radius: 99px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .speed-btn {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 11px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 99px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .speed-btn:hover {
                    color: white;
                    background: rgba(255, 255, 255, 0.1);
                }

                .speed-btn.active {
                    background: #6366f1;
                    color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .control-btn {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.8);
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 4px;
                }

                .control-btn:hover {
                    color: white;
                    transform: scale(1.1);
                }

                .control-btn.active {
                    color: #6366f1;
                }

                .time-display {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 13px;
                    font-variant-numeric: tabular-nums;
                    font-weight: 500;
                }

                /* Transcript Sidebar */
                .transcript-sidebar {
                    background: #1e293b;
                    border-left: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }

                .sidebar-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .sidebar-title {
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    margin: 0;
                }

                .header-icon {
                    color: #6366f1;
                }

                .transcript-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                }

                .transcript-line {
                    padding: 12px 16px;
                    border-radius: 12px;
                    margin-bottom: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .transcript-line:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .transcript-line.active {
                    background: rgba(99, 102, 241, 0.15);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                }

                .line-time {
                    color: #6366f1;
                    font-size: 11px;
                    font-weight: 700;
                    display: block;
                    margin-bottom: 4px;
                }

                .line-text {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 13px;
                    line-height: 1.5;
                    margin: 0;
                }

                .active .line-text {
                    color: white;
                }

                .no-transcript {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 20px;
                }

                .skeleton-line {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    animation: shimmer 2s infinite linear;
                }

                @keyframes shimmer {
                    0% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                    100% { opacity: 0.5; }
                }

                /* Scrollbar Styles */
                .transcript-content::-webkit-scrollbar {
                    width: 6px;
                }
                .transcript-content::-webkit-scrollbar-track {
                    background: transparent;
                }
                .transcript-content::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                }
            `}} />
        </div>
    );
};

// Helper: Format seconds to MM:SS
const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export default YouTubePlayer;
