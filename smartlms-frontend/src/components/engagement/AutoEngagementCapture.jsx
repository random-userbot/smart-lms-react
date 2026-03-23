import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import EngagementCamera from '../player/EngagementCamera';

/**
 * AutoEngagementCapture
 * Auto-starts webcam, captures MediaPipe features, and auto-closes when enabled=false
 * Feeds features directly to parent component
 */
export default function AutoEngagementCapture({ 
  enabled = false, 
  onFeaturesReady
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const initAttemptRef = useRef(0);

  // Auto-start camera when enabled
  useEffect(() => {
    if (enabled && !cameraActive) {
      startCamera();
    }
  }, [enabled]);

  // Auto-stop camera when disabled
  useEffect(() => {
    if (!enabled && cameraActive) {
      stopCamera();
    }
  }, [enabled]);

  // Request camera permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        setPermissionGranted(permission.state === 'granted');
        
        if (permission.state === 'granted' && enabled) {
          startCamera();
        }
      } catch (err) {
        console.warn('Camera permission check failed:', err);
      }
    };

    checkPermission();
  }, []);

  const startCamera = async () => {
    if (cameraActive) return;
    
    initAttemptRef.current += 1;
    const attemptId = initAttemptRef.current;

    try {
      // Request camera access
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Only update if this is still the latest attempt
      if (attemptId === initAttemptRef.current) {
        setCameraActive(true);
        setPermissionGranted(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      
      if (err.name === 'NotAllowedError') {
        setPermissionGranted(false);
      } else if (err.name === 'NotFoundError') {
        console.error('No camera device found');
      }
      
      if (attemptId === initAttemptRef.current) {
        setCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    // EngagementCamera component handles cleanup
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Camera Status Badge */}
      <div className="absolute -top-12 right-0 flex items-center gap-2 bg-surface-elevated border border-border rounded-xl px-3 py-2 shadow-md">
        <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
        <span className="text-xs font-bold text-text-secondary">
          {cameraActive ? 'Camera Active' : permissionGranted === false ? 'Camera Denied' : 'Initializing...'}
        </span>
      </div>

      {/* Camera PiP Container */}
      {cameraActive && permissionGranted && (
        <div 
          className="bg-surface-elevated border-2 border-accent rounded-2xl shadow-2xl overflow-hidden ring-2 ring-accent-light"
          style={{ width: '280px', aspectRatio: '9/16' }}
        >
          <EngagementCamera
            onFeaturesReady={onFeaturesReady}
            autoStart={true}
          />

          {/* Close Button */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={stopCamera}
              className="bg-danger/80 hover:bg-danger text-white p-2 rounded-lg transition-colors"
              title="Close camera"
            >
              <VideoOff size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {cameraActive && !permissionGranted && (
        <div 
          className="bg-surface-elevated border-2 border-accent rounded-2xl shadow-2xl flex items-center justify-center"
          style={{ width: '280px', height: '140px' }}
        >
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      )}

      {/* Permission Denied State */}
      {!cameraActive && permissionGranted === false && (
        <div 
          className="bg-danger/10 border-2 border-danger rounded-2xl shadow-2xl p-4 flex flex-col items-center justify-center gap-2"
          style={{ width: '280px', height: '140px' }}
        >
          <VideoOff size={28} className="text-danger" />
          <p className="text-xs font-bold text-danger text-center">Camera access denied</p>
          <button
            onClick={startCamera}
            className="text-xs font-bold text-danger hover:text-danger-hover bg-danger/10 hover:bg-danger/20 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
