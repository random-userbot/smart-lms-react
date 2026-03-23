import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Maximize2, Minimize2, AlertTriangle, Gauge } from 'lucide-react';
import { MediaPipeExtractor } from '../../utils/mediapipe';

const EngagementCamera = ({
    onFeaturesReady,
    autoStart = false,
    shouldRun = false,
    engagementScore = null,
    alerts = [],
    fullscreenOverlay = false,
    modelLabel = null,
    latestFeatures = null,
    hybridCatalog = null,
}) => {
    const videoRef = useRef(null);
    const extractorRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const mountedRef = useRef(true);
    const onFeaturesReadyRef = useRef(onFeaturesReady);
    const isActiveRef = useRef(false);

    const [isReady, setIsReady] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        onFeaturesReadyRef.current = onFeaturesReady;
    }, [onFeaturesReady]);

    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

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
            if (!mountedRef.current || !videoRef.current || !extractorRef.current || !isActiveRef.current) return;
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
            isActiveRef.current = true;
            setIsActive(true);
            startProcessing();
        } catch (err) {
            console.error('Failed to start webcam:', err);
            isActiveRef.current = false;
            setIsActive(false);
        }
    };

    const stopCamera = () => {
        isActiveRef.current = false;
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

    useEffect(() => {
        if (fullscreenOverlay && isMinimized) {
            setIsMinimized(false);
        }
    }, [fullscreenOverlay, isMinimized]);

    const liveScore = useMemo(() => {
        if (!latestFeatures) return null;
        if (!latestFeatures.face_detected) return 0;
        const gaze = Math.max(0, Math.min(1, latestFeatures.gaze_score ?? 0.5));
        const stability = Math.max(0, Math.min(1, latestFeatures.head_pose_stability ?? 0.5));
        const blink = Math.max(0, Math.min(1, 1 - ((latestFeatures.blink_rate ?? 12) / 45)));
        return Math.round(((gaze * 0.6) + (stability * 0.3) + (blink * 0.1)) * 100);
    }, [latestFeatures]);

    const modelScore = engagementScore?.engagement ?? engagementScore?.overall_score;
    const score = Math.round(modelScore ?? liveScore ?? 0);
    const scoreLabel = modelScore != null ? 'Engagement' : 'Live';
    const modelConfidence = Number(engagementScore?.confidence || 0);
    const modelType = engagementScore?.model_type || modelLabel || '';
    const isHybridEnsemble = String(modelType).includes('ensemble');
    const ensembleCount = Number(
        engagementScore?.ensemble_model_count ||
        (Array.isArray(engagementScore?.ensemble_models) ? engagementScore.ensemble_models.length : 0)
    );

    const dimensionChips = useMemo(() => {
        if (!engagementScore) return [];
        return [
            { key: 'B', label: 'Boredom', value: Math.round(Number(engagementScore?.boredom || 0)), tone: 'warn' },
            { key: 'C', label: 'Confusion', value: Math.round(Number(engagementScore?.confusion || 0)), tone: 'warn' },
            { key: 'F', label: 'Frustration', value: Math.round(Number(engagementScore?.frustration || 0)), tone: 'danger' },
        ];
    }, [engagementScore]);
    const visibleAlerts = (alerts || []).slice(0, fullscreenOverlay ? 3 : 2);
    const hasFeatureStream = latestFeatures != null;
    const isTracking = hasFeatureStream ? !!latestFeatures?.face_detected : null;

    if (!isReady && !autoStart) return null;

    return (
        <div className={`engagement-camera-pip ${fullscreenOverlay ? 'fullscreen-overlay' : ''} ${isMinimized ? 'minimized' : ''} ${isActive ? 'active' : 'inactive'}`}>
            <div className="camera-header">
                <div className="header-left">
                    <ActivityIcon isActive={isActive} />
                    <span className="camera-label">AI Monitor</span>
                    <span className={`tracking-pill ${isTracking === null ? 'tracking-pending' : isTracking ? 'tracking-on' : 'tracking-off'}`}>
                        {isTracking === null ? 'Detecting' : isTracking ? 'Tracking' : 'No Face'}
                    </span>
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
                            {scoreLabel} {score}%
                        </div>
                        {modelLabel && (
                            <div className="model-pill" title={modelLabel}>
                                Model: {modelLabel}
                            </div>
                        )}
                        {isHybridEnsemble && (
                            <div className="hybrid-pill" title="Hybrid ensemble inference enabled for engagement scoring">
                                Hybrid Ensemble • {ensembleCount || 0} exports
                            </div>
                        )}
                        {hybridCatalog?.exportAvailable > 0 && (
                            <div className="hybrid-ready-pill" title="Export models available for hybrid blending">
                                Hybrid Ready: {hybridCatalog.exportAvailable} exports ({hybridCatalog.recommended || 0} recommended)
                            </div>
                        )}
                        {modelConfidence > 0 && (
                            <div className="confidence-pill" title="Model confidence">
                                Confidence {Math.round(modelConfidence * 100)}%
                            </div>
                        )}
                        {dimensionChips.length > 0 && (
                            <div className="dimension-chip-row">
                                {dimensionChips.map((chip) => (
                                    <div key={chip.key} className={`dimension-chip ${chip.tone}`} title={`${chip.label}: ${chip.value}%`}>
                                        {chip.key} {chip.value}%
                                    </div>
                                ))}
                            </div>
                        )}
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
                    position: absolute;
                    bottom: 24px;
                    right: 24px;
                    width: 260px;
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 12px;
                    overflow: hidden;
                    z-index: 2147483600;
                    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.35);
                    transition: all 0.25s ease;
                }
                .engagement-camera-pip.fullscreen-overlay {
                    position: fixed;
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
                .tracking-pill {
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    border-radius: 999px;
                    padding: 2px 7px;
                    border: 1px solid transparent;
                }
                .tracking-pill.tracking-on {
                    background: rgba(21, 128, 61, 0.28);
                    color: #bbf7d0;
                    border-color: rgba(34, 197, 94, 0.35);
                }
                .tracking-pill.tracking-pending {
                    background: rgba(8, 47, 73, 0.4);
                    color: #bae6fd;
                    border-color: rgba(56, 189, 248, 0.35);
                }
                .tracking-pill.tracking-off {
                    background: rgba(185, 28, 28, 0.28);
                    color: #fecaca;
                    border-color: rgba(239, 68, 68, 0.35);
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
                .model-pill {
                    align-self: flex-start;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(88, 28, 135, 0.86);
                    color: #f3e8ff;
                    font-size: 10px;
                    font-weight: 800;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .hybrid-pill {
                    align-self: flex-start;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(30, 64, 175, 0.88);
                    color: #dbeafe;
                    font-size: 10px;
                    font-weight: 800;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .hybrid-ready-pill {
                    align-self: flex-start;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(8, 47, 73, 0.85);
                    color: #bae6fd;
                    font-size: 10px;
                    font-weight: 800;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .confidence-pill {
                    align-self: flex-start;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(21, 128, 61, 0.84);
                    color: #dcfce7;
                    font-size: 10px;
                    font-weight: 800;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .dimension-chip-row {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                }
                .dimension-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 6px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                }
                .dimension-chip.warn {
                    background: rgba(120, 53, 15, 0.86);
                    color: #ffedd5;
                }
                .dimension-chip.danger {
                    background: rgba(153, 27, 27, 0.86);
                    color: #fee2e2;
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
