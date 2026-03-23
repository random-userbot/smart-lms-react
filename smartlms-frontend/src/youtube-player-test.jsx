import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactPlayer from 'react-player';
import { MediaPipeExtractor } from './utils/mediapipe';
import { engagementAPI } from './api/client';

function YouTubePlayerTestPage() {
  const videoUrl = 'https://youtu.be/z4qh8BVrb3w?si=xiTNywoHVDWHeEf_';
  const webcamRef = useRef(null);
  const extractorRef = useRef(null);
  const intervalRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('builtin::xgboost');
  const [features, setFeatures] = useState([]);
  const [latestFeature, setLatestFeature] = useState(null);
  const [inferenceResult, setInferenceResult] = useState(null);

  useEffect(() => {
    engagementAPI.listModels()
      .then((res) => {
        const list = res?.data?.models || [];
        setModels(list);
        const firstAvailable = list.find((m) => m.status === 'available');
        if (firstAvailable) setSelectedModelId(firstAvailable.model_id);
      })
      .catch(() => {
        setModels([]);
      });
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        await webcamRef.current.play();
      }

      const extractor = new MediaPipeExtractor();
      const ok = await extractor.initialize();
      if (!ok) throw new Error('MediaPipe initialization failed');
      extractorRef.current = extractor;

      intervalRef.current = setInterval(async () => {
        if (!webcamRef.current || !extractorRef.current) return;
        const f = await extractorRef.current.processFrame(webcamRef.current);
        if (!f) return;

        const payload = {
          session_id: `yt_test_${Date.now()}`,
          lecture_id: 'youtube-test',
          timestamp: Date.now(),
          ...f,
          keyboard_active: false,
          mouse_active: false,
          tab_visible: !document.hidden,
          playback_speed: 1,
          note_taking: false,
        };

        setLatestFeature(payload);
        setFeatures((prev) => {
          const next = [...prev, payload];
          if (next.length > 30) next.shift();
          return next;
        });
      }, 1500);

      setRunning(true);
      setStatus('Camera running, collecting real features');
    } catch (e) {
      setError(e?.message || 'Camera start failed');
      setStatus('Camera failed');
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (webcamRef.current?.srcObject) {
      const tracks = webcamRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      webcamRef.current.srcObject = null;
    }
    setRunning(false);
    setStatus('Stopped');
  };

  const runInference = async () => {
    setError('');
    if (!features.length) {
      setError('No real features captured yet. Start camera first.');
      return;
    }
    try {
      setStatus('Running selected model inference...');
      const res = await engagementAPI.inferModel({
        model_id: selectedModelId,
        features,
      });
      setInferenceResult(res.data);
      setStatus('Inference complete');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Inference failed');
      setStatus('Inference failed');
    }
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <main style={{ minHeight: '100vh', padding: '24px', background: 'linear-gradient(180deg, #ecfeff 0%, #f8fafc 100%)' }}>
      <section style={{ width: 'min(1220px, 100%)', margin: '0 auto', background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '24px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.1)', overflow: 'hidden' }}>
        <header style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 900, color: '#0f172a' }}>
          Temporary YouTube Player + Model Inference Test
        </header>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 700, color: '#334155' }}>Model</label>
            <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} style={{ minWidth: 320, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5e1' }}>
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.name} [{m.status}]
                </option>
              ))}
            </select>
            {!running ? (
              <button onClick={startCamera} style={btn('#0ea5e9')}>Start Camera</button>
            ) : (
              <button onClick={stopCamera} style={btn('#ef4444')}>Stop Camera</button>
            )}
            <button onClick={runInference} style={btn('#16a34a')}>Run Inference</button>
            <span style={{ fontWeight: 700, color: '#334155' }}>{status}</span>
          </div>
          {error && <div style={{ color: '#b91c1c', fontWeight: 700 }}>{error}</div>}
        </div>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 16, overflow: 'hidden' }}>
            <ReactPlayer
              src={videoUrl}
              width="100%"
              height="100%"
              controls
              playing={false}
              playsInline
              config={{
                youtube: {
                  playerVars: {
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                  },
                },
              }}
              onError={(err) => {
                console.error('YouTube test player error:', err);
              }}
            />
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 10, background: '#f8fafc' }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Webcam Preview</div>
            <video ref={webcamRef} muted playsInline style={{ width: '100%', borderRadius: 10, background: '#0f172a' }} />
            <div style={{ marginTop: 8, color: '#334155', fontSize: 13 }}>Captured frames: {features.length}</div>
            {latestFeature && (
              <div style={{ marginTop: 8, color: '#334155', fontSize: 13 }}>
                Gaze: {Math.round((latestFeature.gaze_score || 0) * 100)}% | Blink: {Math.round(latestFeature.blink_rate || 0)}
              </div>
            )}
          </div>
        </div>

        {inferenceResult && (
          <div style={{ margin: '0 16px 16px', border: '1px solid #dbeafe', borderRadius: 14, padding: 14, background: '#eff6ff' }}>
            <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Model Output</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: 12 }}>{JSON.stringify(inferenceResult, null, 2)}</pre>
          </div>
        )}

        <footer style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', color: '#334155', fontSize: '14px' }}>
          Source: {videoUrl}
        </footer>
      </section>
    </main>
  );
}

function btn(bg) {
  return {
    border: 'none',
    background: bg,
    color: '#fff',
    borderRadius: 10,
    padding: '8px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  };
}

createRoot(document.getElementById('root')).render(<YouTubePlayerTestPage />);
