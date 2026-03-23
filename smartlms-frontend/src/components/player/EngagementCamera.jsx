import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Maximize2, Minimize2, AlertTriangle, Gauge } from 'lucide-react';
import { MediaPipeExtractor } from '../../utils/mediapipe';

const EngagementCamera = ({
    onFeaturesReady,
    autoStart = false,
    shouldRun = false,
    engagementScore = null,
    alerts = [],
    fullscreenOverlay = false,
}) => {
    const videoRef = useRef(null);
    const extractorRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const mountedRef = useRef(true);
    const onFeaturesReadyRef = useRef(onFeaturesReady);

    const [isReady, setIsReady] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        onFeaturesReadyRef.current = onFeaturesReady;
    }, [onFeaturesReady]);

    useEffect(() => {
        mountedRef.current = true;
        const extractor = new MediaPipeExtractor();
        extractorRef.current = extractor;

        extractor.onFeaturesReady = (features) => {
            if (onFeaturesReadyRef.current) onFeaturesReadyRef.current(features);
        };

        const init = async () => {
            const ok = await extractor.initialize();
            if (!mountedRef.current) return;
            setIsReady(!!ok);
        };

        init();

        return () => {
            mountedRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
            if (extractorRef.current) extractorRef.current.destroy();
        };
    }, []);

    const startProcessing = () => {
        const loop = async () => {
            if (!mountedRef.current || !videoRef.current || !extractorRef.current || !isActive) return;
            await extractorRef.current.processFrame(videoRef.current);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    };

    const startCamera = async () => {
        if (streamRef.current || !isReady) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 960, height: 540, frameRate: 15 },
                audio: false,
            });
            if (!mountedRef.current) return;
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsActive(true);
            startProcessing();
        } catch (err) {
            console.error('Failed to start webcam:', err);
            setIsActive(false);
        }
    };

    const stopCamera = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsActive(false);
    };

    useEffect(() => {
        if (!isReady) return;
        const shouldAutoRun = autoStart || shouldRun;
        if (shouldAutoRun) startCamera();
        else stopCamera();
    }, [autoStart, shouldRun, isReady]);

    if (!isReady && !autoStart) return null;

    const score = Math.round(engagementScore?.engagement || engagementScore?.overall_score || 0);
    const visibleAlerts = (alerts || []).slice(0, fullscreenOverlay ? 3 : 2);

    return (
        <div className={`engagement-camera-pip ${fullscreenOverlay ? 'fullscreen-overlay' : ''} ${isMinimized ? 'minimized' : ''} ${isActive ? 'active' : 'inactive'}`}>
            <div className="camera-header">
                <div className="header-left">
                    <ActivityIcon isActive={isActive} />
                    <span className="camera-label">AI Monitor</span>
                </div>
                <div className="header-actions">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="action-btn" title={isMinimized ? 'Maximize' : 'Minimize'}>
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={isActive ? stopCamera : startCamera} className="action-btn" title={isActive ? 'Disable Camera' : 'Enable Camera'}>
                        {isActive ? <CameraOff size={14} /> : <Camera size={14} />}
                    </button>
                </div>
            </div>

            <div className="camera-content">
                <video ref={videoRef} autoPlay muted playsInline className="webcam-video" />
                {!isActive && (
                    <div className="camera-placeholder">
                        <CameraOff size={28} />
                        <span>Camera Offline</span>
                    </div>
                )}
                {isActive && (
                    <div className="camera-overlay-metrics">
                        <div className="score-pill">
                            <Gauge size={14} />
                            Engagement {score}%
                        </div>
                        {visibleAlerts.length > 0 && (
                            <div className="alert-stack">
                                {visibleAlerts.map((a, idx) => (
                                    <div key={idx} className={`alert-pill ${a.severity || 'medium'}`}>
                                        <AlertTriangle size={12} />
                                        <span>{a.text || a}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .engagement-camera-pip {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 260px;
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 12px;
                    overflow: hidden;
                    z-index: 1000;
                    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.35);
                    transition: all 0.25s ease;
                }
                .engagement-camera-pip.fullscreen-overlay {
                    width: 340px;
                    bottom: 18px;
                    right: 18px;
                    z-index: 2147483600;
                }
                .engagement-camera-pip.minimized {
                    width: 170px;
                }
                .camera-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 10px;
                    background: rgba(255, 255, 255, 0.06);
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .camera-label {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .header-actions { display: flex; gap: 4px; }
                .action-btn {
                    width: 22px;
                    height: 22px;
                    border: none;
                    border-radius: 6px;
                    background: transparent;
                    color: rgba(148, 163, 184, 0.9);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .action-btn:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: white;
                }
                .camera-content {
                    position: relative;
                    aspect-ratio: 4/3;
                    background: #020617;
                    overflow: hidden;
                }
                .engagement-camera-pip.minimized .camera-content {
                    height: 0;
                    aspect-ratio: auto;
                }
                .webcam-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1);
                }
                .camera-placeholder {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    color: rgba(148, 163, 184, 0.7);
                    font-size: 11px;
                    font-weight: 700;
                }
                .camera-overlay-metrics {
                    position: absolute;
                    left: 8px;
                    right: 8px;
                    bottom: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .score-pill {
                    align-self: flex-start;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(2, 132, 199, 0.85);
                    color: #e0f2fe;
                    font-size: 10px;
                    font-weight: 800;
                }
                .alert-stack { display: flex; flex-direction: column; gap: 4px; }
                .alert-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 7px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    line-height: 1.2;
                }
                .alert-pill.high { background: rgba(185, 28, 28, 0.85); color: #fee2e2; }
                .alert-pill.medium { background: rgba(146, 64, 14, 0.85); color: #ffedd5; }
                .alert-pill.low { background: rgba(13, 148, 136, 0.82); color: #ccfbf1; }
                .status-circle {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #64748b;
                }
                .status-circle.active {
                    background: #22c55e;
                    box-shadow: 0 0 10px #22c55e;
                }
            `}} />
        </div>
    );
};

const ActivityIcon = ({ isActive }) => (
    <div className={`status-circle ${isActive ? 'active' : ''}`} />
);

export default EngagementCamera;
