import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactPlayer from 'react-player';
import { MediaPipeExtractor } from './utils/mediapipe';
import { engagementAPI, coursesAPI, lecturesAPI } from './api/client';
import { SHAPWaterfall, TopFactors, FuzzyRulesList, EngagementGauge } from './components/engagement/SHAPVisualization';
import { EngagementHeatmap, ICAPBadge, ICAPProgressBar } from './components/engagement/EngagementHeatmap';

function LiveEngagementTestPage() {
  const params = new URLSearchParams(window.location.search);
  const [lectureId, setLectureId] = useState(params.get('lectureId') || '');
  const [videoUrl, setVideoUrl] = useState(params.get('video') || 'https://youtu.be/z4qh8BVrb3w?si=xiTNywoHVDWHeEf_');
  const [playing, setPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [creatingLecture, setCreatingLecture] = useState(false);

  const [modelInfo, setModelInfo] = useState(null);
  const [runtimeModels, setRuntimeModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsDebug, setModelsDebug] = useState({
    lastLoadedAt: null,
    count: 0,
    error: '',
  });
  const [selectedModelId, setSelectedModelId] = useState('builtin::xgboost');
  const [selectedModelOutput, setSelectedModelOutput] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [ensembleResults, setEnsembleResults] = useState(null);
  const [ensembleLog, setEnsembleLog] = useState([]);
  const [liveModelResults, setLiveModelResults] = useState({});
  const [ensembleRunning, setEnsembleRunning] = useState(false);
  const [latestFeature, setLatestFeature] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [playerError, setPlayerError] = useState(false);

  const featureBufferRef = useRef([]);
  const startedAtRef = useRef(0);
  const playedSecondsRef = useRef(0);
  const sessionIdRef = useRef(`live_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const lectureIdRef = useRef(lectureId);
  const isRunningRef = useRef(isRunning);
  const submitInFlightRef = useRef(false);
  const ensembleInFlightRef = useRef(false);
  const cachedModelsRef = useRef([]);
  const consecutiveFailuresRef = useRef(0);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const appendEnsembleLog = useCallback((message) => {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${message}`;
    setEnsembleLog((prev) => [line, ...prev].slice(0, 80));
    console.log(`[ensemble] ${line}`);
  }, []);

  const normalizeModelScores = useCallback((modelResult) => {
    const payload = modelResult?.output || modelResult;
    const out = payload?.output || payload;

    if (out && typeof out.engagement === 'number') {
      return {
        engagement: Number(out.engagement || 0),
        boredom: Number(out.boredom || 0),
        confusion: Number(out.confusion || 0),
        frustration: Number(out.frustration || 0),
      };
    }

    // Export models return class probabilities per dimension.
    const dims = out?.dimensions;
    if (dims && typeof dims === 'object') {
      const toPercent = (dim) => {
        const probs = dim?.probabilities;
        if (!Array.isArray(probs) || probs.length === 0) return 0;
        const maxLevel = Math.max(1, probs.length - 1);
        const weighted = probs.reduce((sum, p, idx) => sum + (Number(p) || 0) * idx, 0);
        return Math.round((weighted / maxLevel) * 100);
      };

      return {
        engagement: toPercent(dims.engagement),
        boredom: toPercent(dims.boredom),
        confusion: toPercent(dims.confusion),
        frustration: toPercent(dims.frustration),
      };
    }

    return {
      engagement: Number(out?.overall_proxy || 0),
      boredom: 0,
      confusion: 0,
      frustration: 0,
    };
  }, []);

  const loadRuntimeModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsDebug((prev) => ({ ...prev, error: '' }));
    try {
      const res = await engagementAPI.listModels();
      const models = res?.data?.models || [];
      console.log('Loaded models:', res?.data, models);
      if (!Array.isArray(models) || models.length === 0) {
        setRuntimeModels([]);
        setSelectedModelId('builtin::xgboost');
        setModelsDebug({
          lastLoadedAt: new Date().toISOString(),
          count: 0,
          error: 'Model list returned empty array',
        });
        return [];
      }
      setRuntimeModels(models);
      cachedModelsRef.current = models;
      const firstAvailable = models.find((m) => m.status === 'available');
      if (firstAvailable) {
        setSelectedModelId(firstAvailable.model_id);
      } else {
        setSelectedModelId(models[0].model_id);
      }
      setModelsDebug({
        lastLoadedAt: new Date().toISOString(),
        count: models.length,
        error: '',
      });
      return models;
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown models error';
      console.error('Failed to fetch models:', err);
      setRuntimeModels([]);
      setSelectedModelId('builtin::xgboost');
      setModelsDebug({
        lastLoadedAt: new Date().toISOString(),
        count: 0,
        error: detail,
      });
      return [];
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    engagementAPI.getModelInfo().then((res) => setModelInfo(res.data)).catch((err) => {
      console.error('Failed to fetch model info:', err);
      setModelInfo(null);
    });
    loadRuntimeModels();
  }, [loadRuntimeModels]);

  const runSelectedModelInference = async (batchOverride = null) => {
    const batch = batchOverride || featureBufferRef.current.slice();
    if (!batch.length || !selectedModelId) {
      console.warn('Cannot run inference: batch empty or no model selected');
      return;
    }
    try {
      console.log(`Inferencing with model ${selectedModelId}...`);
      const res = await engagementAPI.inferModel({
        model_id: selectedModelId,
        features: batch,
      });
      console.log('Selected model output:', res.data);
      setSelectedModelOutput(res.data);
      setStatus(`Model "${selectedModelId}" inference complete`);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Selected model inference failed.';
      console.error('Model inference error:', msg);
      setSelectedModelOutput(null);
      setError(`Model inference failed: ${msg}`);
    }
  };

  const runEnsembleInference = async (batchOverride = null) => {
    const buffered = featureBufferRef.current.slice();
    const fallbackLatest = latestFeature ? [latestFeature] : [];
    const batch = batchOverride || (buffered.length ? buffered : fallbackLatest);

    if (ensembleInFlightRef.current) {
      appendEnsembleLog('Skipped ensemble tick: previous run still in progress');
      return;
    }

    let modelsToRun = runtimeModels;
    if (modelsToRun.length === 0) {
      appendEnsembleLog('No runtime models in state, reloading models from backend...');
      modelsToRun = await loadRuntimeModels();
    }
    if (modelsToRun.length === 0 && cachedModelsRef.current.length > 0) {
      modelsToRun = cachedModelsRef.current;
      appendEnsembleLog(`Using cached model catalog (${modelsToRun.length} models)`);
    }
    if (modelsToRun.length === 0) {
      setError('No runtime models available. Use Reload Models and check diagnostics below.');
      setStatus('Ensemble warning: no models');
      appendEnsembleLog('No runtime models available from backend after reload');
      return;
    }
    if (!batch.length) {
      setError('No features available yet. Turn on camera and wait for feature capture.');
      setStatus('Ensemble waiting for features');
      appendEnsembleLog('Cannot run ensemble: no captured features yet');
      return;
    }

    try {
      ensembleInFlightRef.current = true;
      setError('');
      setEnsembleResults(null);
      setLiveModelResults({});
      setEnsembleRunning(true);
      setStatus('Running ensemble voting across all models...');
      appendEnsembleLog(`Starting ensemble run with ${modelsToRun.length} models and ${batch.length} features`);
      const results = {};
      
      // Run inference on each available model
      for (const model of modelsToRun) {
        const modelNotes = String(model?.notes || '').toLowerCase();
        if (model.status === 'error') {
          appendEnsembleLog(`Skipping ${model.model_id} (status=error)`);
          setLiveModelResults((prev) => ({ ...prev, [model.model_id]: { name: model.name, family: model.family, status: 'skipped', reason: 'status=error' } }));
          continue;
        }
        if (modelNotes.includes('biased')) {
          appendEnsembleLog(`Skipping ${model.model_id} (biased artifact)`);
          setLiveModelResults((prev) => ({ ...prev, [model.model_id]: { name: model.name, family: model.family, status: 'skipped', reason: 'biased' } }));
          continue;
        }
        setLiveModelResults((prev) => ({ ...prev, [model.model_id]: { name: model.name, family: model.family, status: 'running' } }));
        try {
          appendEnsembleLog(`Running ${model.model_id}`);
          const res = await engagementAPI.inferModel({
            model_id: model.model_id,
            features: batch,
          });
          const normalizedScores = normalizeModelScores(res.data);
          const zeroSignal = ['engagement', 'boredom', 'confusion', 'frustration']
            .every((k) => Number(normalizedScores?.[k] || 0) === 0);
          if (zeroSignal) {
            appendEnsembleLog(`Skipping ${model.model_id} (zero-signal output)`);
            setLiveModelResults((prev) => ({ ...prev, [model.model_id]: { ...prev[model.model_id], status: 'skipped', reason: 'zero-signal' } }));
            continue;
          }
          results[model.model_id] = {
            name: model.name,
            output: res.data,
            normalized_scores: normalizedScores,
            family: model.family,
            status: model.status,
          };
          setLiveModelResults((prev) => ({ ...prev, [model.model_id]: { name: model.name, family: model.family, status: 'success', scores: normalizedScores } }));
          appendEnsembleLog(`Success ${model.model_id} -> E:${normalizedScores.engagement}% B:${normalizedScores.boredom}% C:${normalizedScores.confusion}% F:${normalizedScores.frustration}%`);
        } catch (err) {
          const detail = err?.response?.data?.detail || err.message;
          appendEnsembleLog(`Failed ${model.model_id} -> ${detail}`);
          results[model.model_id] = {
            name: model.name,
            error: detail,
            family: model.family,
            status: 'error',
          };
          setLiveModelResults((prev) => ({ ...prev, [model.model_id]: { name: model.name, family: model.family, status: 'error', error: detail } }));
        }
      }
      
      // Compute ensemble voting
      const successResults = Object.entries(results).filter(([, r]) => !r.error);
      if (successResults.length > 0) {
        const votes = {
          engagement: [],
          boredom: [],
          confusion: [],
          frustration: [],
        };
        
        successResults.forEach(([, result]) => {
          const scores = result.normalized_scores;
          if (scores) {
            votes.engagement.push(Number(scores.engagement || 0));
            votes.boredom.push(Number(scores.boredom || 0));
            votes.confusion.push(Number(scores.confusion || 0));
            votes.frustration.push(Number(scores.frustration || 0));
          }
        });
        
        const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        setEnsembleResults({
          all_results: results,
          consensus: {
            engagement: Math.round(avg(votes.engagement)),
            boredom: Math.round(avg(votes.boredom)),
            confusion: Math.round(avg(votes.confusion)),
            frustration: Math.round(avg(votes.frustration)),
          },
          model_count: successResults.length,
          timestamp: new Date().toISOString(),
        });
        setStatus(`Ensemble voting complete (${successResults.length} models)`);
        appendEnsembleLog(`Ensemble complete (${successResults.length} successful models)`);
      } else {
        setStatus('Ensemble warning: no successful outputs this tick');
        appendEnsembleLog('No successful model outputs for ensemble');
      }
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Unknown error';
      console.error('Ensemble error:', detail);
      setError(`Ensemble warning: ${detail}`);
      setStatus('Ensemble warning');
      appendEnsembleLog(`Ensemble failed: ${detail}`);
    } finally {
      ensembleInFlightRef.current = false;
      setEnsembleRunning(false);
    }
  };

  const fetchHistory = async () => {
    if (!lectureId) return;
    try {
      const res = await engagementAPI.getHistory(lectureId);
      setHistoryRows(res.data || []);
    } catch {
      setHistoryRows([]);
    }
  };

  useEffect(() => {
    if (!lectureId) return;
    fetchHistory();
  }, [lectureId]);

  useEffect(() => {
    lectureIdRef.current = lectureId;
  }, [lectureId]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const handleFeaturesReady = useCallback((features) => {
    const currentLectureId = lectureIdRef.current;
    const normalized = {
      session_id: sessionIdRef.current,
      lecture_id: currentLectureId,
      timestamp: Date.now(),
      face_detected: features.face_detected ?? true,
      gaze_score: features.gaze_score ?? 0,
      head_pose_yaw: features.head_pose_yaw ?? 0,
      head_pose_pitch: features.head_pose_pitch ?? 0,
      head_pose_roll: features.head_pose_roll ?? 0,
      head_pose_stability: features.head_pose_stability ?? 0,
      eye_aspect_ratio_left: features.eye_aspect_ratio_left ?? 0,
      eye_aspect_ratio_right: features.eye_aspect_ratio_right ?? 0,
      blink_rate: features.blink_rate ?? 0,
      mouth_openness: features.mouth_openness ?? 0,
      au01_inner_brow_raise: features.au01_inner_brow_raise ?? 0,
      au02_outer_brow_raise: features.au02_outer_brow_raise ?? 0,
      au04_brow_lowerer: features.au04_brow_lowerer ?? 0,
      au06_cheek_raiser: features.au06_cheek_raiser ?? 0,
      au12_lip_corner_puller: features.au12_lip_corner_puller ?? 0,
      au15_lip_corner_depressor: features.au15_lip_corner_depressor ?? 0,
      au25_lips_part: features.au25_lips_part ?? 0,
      au26_jaw_drop: features.au26_jaw_drop ?? 0,
      keyboard_active: false,
      mouse_active: false,
      tab_visible: !document.hidden,
      playback_speed: 1.0,
      note_taking: false,
    };

    setLatestFeature(normalized);
    if (isRunningRef.current && currentLectureId) {
      featureBufferRef.current.push(normalized);
      if (featureBufferRef.current.length > 30) {
        featureBufferRef.current.shift();
      }
    }
  }, []);

  const submitBatch = async () => {
    if (submitInFlightRef.current) {
      appendEnsembleLog('Skipped submit tick: previous submit still in progress');
      return;
    }
    if (!lectureId) {
      setError('Please provide a valid lecture ID before starting analysis.');
      return;
    }

    const buffered = featureBufferRef.current.slice();
    const fallbackLatest = latestFeature ? [latestFeature] : [];
    const batch = buffered.length ? buffered : fallbackLatest;
    if (!batch.length) return;

    try {
      submitInFlightRef.current = true;
      setStatus('Submitting live batch...');
      const watchDuration = Math.max(0, Math.floor(playedSecondsRef.current || ((Date.now() - startedAtRef.current) / 1000)));
      const res = await engagementAPI.submit({
        session_id: sessionIdRef.current,
        lecture_id: lectureId,
        features: batch,
        keyboard_events: 0,
        mouse_events: 0,
        tab_switches: 0,
        idle_time: 0,
        playback_speeds: [{ timestamp: Date.now(), speed: 1.0 }],
        watch_duration: watchDuration,
        total_duration: 600,
      });
      setLiveResult(res.data);
      appendEnsembleLog(`Submit API model: ${res?.data?.model_type || 'unknown'} | confidence=${Math.round((Number(res?.data?.confidence || 0)) * 100)}% | ensemble_models=${Number(res?.data?.ensemble_model_count || 0)}`);
      await runSelectedModelInference(batch);
      await runEnsembleInference(batch);
      featureBufferRef.current = [];
      consecutiveFailuresRef.current = 0;
      setStatus('Live model output updated');
      fetchHistory();
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to submit live features. Ensure you are logged in and lecture ID exists.';
      setError(msg);
      consecutiveFailuresRef.current += 1;
      setStatus(`Submission warning (${consecutiveFailuresRef.current})`);
      appendEnsembleLog(`Submit warning: ${msg}`);
      if (consecutiveFailuresRef.current >= 3) {
        appendEnsembleLog('Auto-recovery: reloading runtime models after repeated submit warnings');
        await loadRuntimeModels();
      }
      // Continue running ensemble locally even if submit fails.
      await runEnsembleInference(batch);
    } finally {
      submitInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      submitBatch();
    }, 8000);
    return () => clearInterval(id);
  }, [isRunning, lectureId]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      if (runtimeModels.length === 0) {
        loadRuntimeModels();
      }
    }, 15000);
    return () => clearInterval(id);
  }, [isRunning, runtimeModels.length, loadRuntimeModels]);

  const start = () => {
    setError('');
    setPlayerError(false);
    if (!lectureId) {
      setError('Lecture ID is required to run model scoring and heatmap.');
      return;
    }
    sessionIdRef.current = `live_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    featureBufferRef.current = [];
    startedAtRef.current = Date.now();
    setLiveResult(null);
    setSelectedModelOutput(null);
    setEnsembleResults(null);
    setEnsembleLog([]);
    setLiveModelResults({});
    setIsRunning(true);
    setStatus('Collecting camera features...');
  };

  const stop = async () => {
    setIsRunning(false);
    await submitBatch();
    setStatus('Stopped');
  };

  const autoCreateTestLecture = async () => {
    setError('');
    setCreatingLecture(true);
    try {
      const now = new Date();
      const stamp = now.toISOString().replace(/[.:]/g, '-');

      setStatus('Creating temporary test course...');
      const courseRes = await coursesAPI.create({
        title: `Live Analytics Test ${stamp}`,
        description: 'Temporary course auto-created for live engagement analytics testing.',
        category: 'Testing',
      });

      const courseId = courseRes?.data?.id;
      if (!courseId) {
        throw new Error('Could not create course.');
      }

      setStatus('Creating temporary test lecture...');
      const lectureRes = await lecturesAPI.create({
        course_id: courseId,
        title: 'Live Analytics Test Lecture',
        youtube_url: videoUrl,
        duration: 600,
      });

      const newLectureId = lectureRes?.data?.id;
      if (!newLectureId) {
        throw new Error('Could not create lecture.');
      }

      setLectureId(newLectureId);
      setStatus(`Ready. Auto-created lecture ID: ${newLectureId}`);
      setError('');
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to auto-create test lecture. Ensure you are logged in as teacher/admin.';
      setError(msg);
      setStatus('Auto-create failed');
    } finally {
      setCreatingLecture(false);
    }
  };

  const icapDistribution = useMemo(() => {
    const base = { passive: 0, active: 0, constructive: 0, interactive: 0 };
    for (const row of historyRows) {
      const k = row.icap_classification;
      if (k && base[k] !== undefined) base[k] += 1;
    }
    return base;
  }, [historyRows]);

  const liveAlerts = useMemo(() => {
    const alerts = [];
    const f = latestFeature;
    if (!f) return alerts;

    if (!f.face_detected) {
      alerts.push({ severity: 'high', text: 'Face not detected', action: 'Move into frame and improve lighting for accurate scoring.' });
      return alerts;
    }

    if ((f.gaze_score ?? 0) < 0.35) {
      alerts.push({ severity: 'high', text: 'Low attention: gaze away from screen', action: 'Re-center eyes on content or pause and refocus.' });
    }
    if (Math.abs(f.head_pose_yaw ?? 0) > 20) {
      alerts.push({ severity: 'medium', text: 'Head turned significantly (yaw)', action: 'Face the screen more directly to reduce drift.' });
    }
    if (Math.abs(f.head_pose_pitch ?? 0) > 16) {
      alerts.push({ severity: 'medium', text: 'Head tilt/pitch suggests distraction', action: 'Adjust posture and keep head level.' });
    }
    if ((f.blink_rate ?? 0) > 35) {
      alerts.push({ severity: 'medium', text: 'High blink rate detected', action: 'Possible fatigue. Consider a short break.' });
    }
    if ((f.blink_rate ?? 0) > 28 && (f.gaze_score ?? 0) < 0.42) {
      alerts.push({ severity: 'high', text: 'Fatigue pattern detected', action: 'Pause briefly and resume after recovery.' });
    }
    if ((f.mouth_openness ?? 0) > 0.48) {
      alerts.push({ severity: 'low', text: 'Mouth openness high (possible speaking/yawning)', action: 'No action needed unless this persists.' });
    }
    if (f.tab_visible === false) {
      alerts.push({ severity: 'high', text: 'Learning tab not focused', action: 'Switch back to this page to continue valid tracking.' });
    }

    if (liveResult) {
      if ((liveResult.engagement ?? 0) < 40) alerts.push({ severity: 'high', text: 'Model: engagement below threshold', action: 'Add interaction: notes, quiz, or recap checkpoint.' });
      if ((liveResult.confusion ?? 0) > 55) alerts.push({ severity: 'high', text: 'Model: confusion spike detected', action: 'Replay recent segment or slow playback speed.' });
      if ((liveResult.boredom ?? 0) > 60) alerts.push({ severity: 'medium', text: 'Model: boredom trend increasing', action: 'Insert prompt/question to re-engage attention.' });
    }

    return alerts.slice(0, 6);
  }, [latestFeature, liveResult]);

  const liveSigns = useMemo(() => {
    const f = latestFeature;
    if (!f) return [];
    return [
      { label: 'Gaze', value: `${Math.round((f.gaze_score ?? 0) * 100)}%`, good: (f.gaze_score ?? 0) >= 0.55 },
      { label: 'Head Stability', value: `${Math.round((f.head_pose_stability ?? 0) * 100)}%`, good: (f.head_pose_stability ?? 0) >= 0.5 },
      { label: 'Blink Rate', value: `${Math.round(f.blink_rate ?? 0)}/min`, good: (f.blink_rate ?? 0) <= 32 },
      { label: 'Mouth Openness', value: (f.mouth_openness ?? 0).toFixed(2), good: (f.mouth_openness ?? 0) <= 0.45 },
      { label: 'Face Detect', value: f.face_detected ? 'Detected' : 'Missing', good: !!f.face_detected },
    ];
  }, [latestFeature]);

  const activeAlertCount = useMemo(() => liveAlerts.filter((a) => a.severity !== 'low').length, [liveAlerts]);

  return (
    <main
      style={{
        ...themeVars,
        padding: '22px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
        color: '#0f172a',
        background: 'radial-gradient(1200px 420px at -10% -20%, rgba(56,189,248,0.32), transparent 60%), radial-gradient(1100px 520px at 120% 0%, rgba(251,146,60,0.24), transparent 58%), linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: '#0b1736' }}>Live Engagement Analytics Test</h1>
      <p style={{ marginTop: 8, color: '#375072', fontWeight: 500 }}>
        Temporary test page for YouTube playback + live camera model scoring, SHAP breakdown, ICAP insights, and heatmap.
      </p>

      <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <MetricPill label="Status" value={status} tone="blue" />
        <MetricPill label="Active Alerts" value={String(activeAlertCount)} tone={activeAlertCount > 0 ? 'amber' : 'green'} />
        <MetricPill label="ICAP" value={(liveResult?.icap_classification || 'passive').toUpperCase()} tone="cyan" />
        <MetricPill label="Engagement" value={`${Math.round(liveResult?.engagement || 0)}%`} tone="green" />
      </section>

      <section style={panelStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: '#0f2b4d' }}>Lecture ID</label>
          <input
            value={lectureId}
            onChange={(e) => setLectureId(e.target.value)}
            placeholder="Paste an existing lecture ID"
            style={inputStyle}
          />
          <button onClick={autoCreateTestLecture} disabled={creatingLecture} style={btn(creatingLecture ? '#475569' : '#2563eb')}>
            {creatingLecture ? 'Creating...' : 'Auto-create Test Lecture ID'}
          </button>
          <label style={{ fontSize: 13, fontWeight: 800, color: '#0f2b4d' }}>YouTube URL</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube URL"
            style={inputStyle}
          />
          {!isRunning ? (
            <button onClick={start} style={btn('#16a34a')}>Start Live Analysis</button>
          ) : (
            <button onClick={stop} style={btn('#dc2626')}>Stop</button>
          )}
          <label style={{ fontSize: 13, fontWeight: 800, color: '#0f2b4d' }}>Model</label>
          <select 
            value={selectedModelId} 
            onChange={(e) => setSelectedModelId(e.target.value)} 
            style={{ ...inputStyle, minWidth: 320 }}
            disabled={runtimeModels.length === 0}
          >
            {runtimeModels.length > 0 ? (
              <>
                <optgroup label="Built-in Models">
                  {runtimeModels.filter(m => m.family === 'xgboost_hybrid').map((m) => (
                    <option key={m.model_id} value={m.model_id}>
                      {m.name} [{m.status}]
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Export Keras Models">
                  {runtimeModels.filter(m => m.family === 'export_keras').map((m) => (
                    <option key={m.model_id} value={m.model_id}>
                      {m.name} [{m.status}] {m.recommended ? '⭐' : ''}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              <>
                <option value="builtin::xgboost">Built-in XGBoost (loading...)</option>
              </>
            )}
          </select>
          <button onClick={() => runSelectedModelInference()} style={btn('#0f766e')}>Run Selected Model</button>
          <button onClick={() => runEnsembleInference()} style={btn('#9333ea')} title="Run ensemble voting across all available models">
            🗳️ Ensemble Voting
          </button>
          <button onClick={() => loadRuntimeModels()} style={btn('#1d4ed8')} disabled={modelsLoading}>
            {modelsLoading ? 'Reloading Models...' : 'Reload Models'}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: '#334155', fontWeight: 600 }}>Status: {status}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#475569', fontWeight: 600 }}>
          API: {API_BASE_URL} | Models Loaded: {modelsDebug.count} | Last Load: {modelsDebug.lastLoadedAt ? new Date(modelsDebug.lastLoadedAt).toLocaleTimeString() : 'never'}
        </div>
        {modelsDebug.error && <div style={{ marginTop: 4, color: '#b45309', fontSize: 12, fontWeight: 700 }}>Models Debug: {modelsDebug.error}</div>}
        {error && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>{error}</div>}
      </section>

      <section style={panelStyle}>
        <h2 style={h2}>Temporary YouTube Player</h2>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          {playerError ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Player could not load this embed.</div>
                <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', fontWeight: 700, textDecoration: 'underline' }}>
                  Open video in YouTube
                </a>
              </div>
            </div>
          ) : (
            <ReactPlayer
              src={videoUrl}
              controls
              playsInline
              playing={playing}
              width="100%"
              height="100%"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onProgress={(state) => {
                playedSecondsRef.current = state.playedSeconds || 0;
              }}
              onError={() => {
                setPlayerError(true);
                setPlaying(false);
              }}
              onEnded={() => {
                setPlaying(false);
                appendEnsembleLog('Lecture ended, stopping live analysis');
                stop();
              }}
              config={{
                youtube: {
                  playerVars: {
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                  },
                },
              }}
            />
          )}
        </div>
      </section>

      <section style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'minmax(300px, 520px) 1fr', gap: 14 }}>
        <div style={panelStyle}>
          <h2 style={h2}>Live Camera Monitor (Medium)</h2>
          <LiveCameraPanel onFeaturesReady={handleFeaturesReady} />
        </div>
        <div style={panelStyle}>
          <h2 style={h2}>Live Alerts & Signs</h2>
          {liveAlerts.length === 0 ? (
            <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 12 }}>No critical alerts right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {liveAlerts.map((a, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    border: '1px solid',
                    background: a.severity === 'high' ? 'rgba(254,226,226,0.95)' : a.severity === 'medium' ? 'rgba(254,243,199,0.95)' : 'rgba(204,251,241,0.9)',
                    borderColor: a.severity === 'high' ? '#fca5a5' : a.severity === 'medium' ? '#fcd34d' : '#5eead4',
                    color: a.severity === 'high' ? '#991b1b' : a.severity === 'medium' ? '#92400e' : '#0f766e',
                  }}
                >
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85, marginBottom: 2 }}>{a.severity} alert</div>
                  <div>{a.text}</div>
                  {a.action && <div style={{ marginTop: 3, fontSize: 12, fontWeight: 600, opacity: 0.95 }}>Action: {a.action}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {liveSigns.map((s, idx) => (
              <div key={idx} style={{ borderRadius: 10, border: '1px solid #cbd5e1', padding: 10, background: 'rgba(255,255,255,0.85)' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.good ? '#15803d' : '#be123c' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={h2}>Live Engagement Heatmap</h2>
        {lectureId ? (
          <>
            <div style={{ marginBottom: 8, color: '#475569', fontSize: 12, fontWeight: 600 }}>
              Heatmap appears after at least one submitted live batch. Start analysis and wait about 8-12 seconds.
            </div>
            <div style={chartSurfaceStyle}>
              <EngagementHeatmap lectureId={lectureId} height={70} />
            </div>
          </>
        ) : (
          <div style={{ color: '#475569', fontWeight: 600 }}>Provide lecture ID to view heatmap.</div>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <Card title="Model">
          <div style={{ fontWeight: 700 }}>{liveResult?.model_type || modelInfo?.model_type || 'N/A'}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{modelInfo?.description || 'Model info unavailable'}</div>
        </Card>
        <Card title="Hybrid Exports Used">
          <div style={{ fontWeight: 700 }}>{Number(liveResult?.ensemble_model_count || 0)}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Models blended in submit scoring</div>
        </Card>
        <Card title="Model Confidence">
          <div style={{ fontWeight: 700 }}>{Math.round((Number(liveResult?.confidence || 0)) * 100)}%</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Backend confidence proxy</div>
        </Card>
        <Card title="Selected Model">
          <div style={{ fontWeight: 700 }}>{selectedModelId || 'N/A'}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Runtime selectable model output</div>
        </Card>
        <Card title="Live ICAP">
          <ICAPBadge level={liveResult?.icap_classification || 'passive'} size="md" />
        </Card>
        <Card title="Engagement">
          <EngagementGauge score={liveResult?.engagement || 0} size={84} />
        </Card>
        <Card title="Boredom">
          <EngagementGauge score={liveResult?.boredom || 0} size={84} />
        </Card>
      </section>

      <section style={panelStyle}>
        <h2 style={h2}>SHAP Feature Contributions</h2>
        <div style={chartSurfaceStyle}>
          <SHAPWaterfall shapData={liveResult?.shap_explanations || {}} dimension="engagement" maxFeatures={10} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div style={panelStyle}>
          <h2 style={h2}>Top Factors</h2>
          <div style={chartSurfaceStyle}>
            <TopFactors factors={liveResult?.top_factors || []} />
          </div>
        </div>
        <div style={panelStyle}>
          <h2 style={h2}>Rule Insights</h2>
          <div style={chartSurfaceStyle}>
            <FuzzyRulesList rules={liveResult?.fuzzy_rules || []} />
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={h2}>ICAP Distribution (Current Lecture History)</h2>
        <div style={chartSurfaceStyle}>
          <ICAPProgressBar distribution={icapDistribution} />
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={h2}>Latest Camera Features</h2>
        <pre style={{ margin: 0, color: '#0f172a', fontSize: 12, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.9)', borderRadius: 10, border: '1px solid #cbd5e1', padding: 12 }}>
          {JSON.stringify(latestFeature || {}, null, 2)}
        </pre>
      </section>

      <section style={panelStyle}>
        <h2 style={h2}>Selected Model Output</h2>
        <pre style={{ margin: 0, color: '#0f172a', fontSize: 12, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.9)', borderRadius: 10, border: '1px solid #cbd5e1', padding: 12 }}>
          {JSON.stringify(selectedModelOutput || {}, null, 2)}
        </pre>
      </section>

      {(ensembleRunning || Object.keys(liveModelResults).length > 0) && (
        <LiveModelResultsPanel liveModelResults={liveModelResults} ensembleRunning={ensembleRunning} />
      )}

      {ensembleResults && (
        <section style={panelStyle}>
          <h2 style={h2}>🗳️ Ensemble Voting Results</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ borderRadius: 10, border: '2px solid #8b5cf6', padding: 16, background: 'rgba(139, 92, 246, 0.05)' }}>
              <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Consensus Engagement</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#7c3aed', marginBottom: 4 }}>{ensembleResults.consensus.engagement}%</div>
              <div style={{ fontSize: 13, color: '#a78bfa' }}>Voted by {ensembleResults.model_count} models</div>
            </div>
            <div style={{ borderRadius: 10, border: '2px solid #ec4899', padding: 16, background: 'rgba(236, 72, 153, 0.05)' }}>
              <div style={{ fontSize: 11, color: '#831843', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Consensus Boredom</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#db2777', marginBottom: 4 }}>{ensembleResults.consensus.boredom}%</div>
              <div style={{ fontSize: 13, color: '#f472b6' }}>Voted by {ensembleResults.model_count} models</div>
            </div>
            <div style={{ borderRadius: 10, border: '2px solid #f59e0b', padding: 16, background: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Consensus Confusion</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#d97706', marginBottom: 4 }}>{ensembleResults.consensus.confusion}%</div>
              <div style={{ fontSize: 13, color: '#fbbf24' }}>Voted by {ensembleResults.model_count} models</div>
            </div>
            <div style={{ borderRadius: 10, border: '2px solid #ef4444', padding: 16, background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ fontSize: 11, color: '#7f1d1d', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Consensus Frustration</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#dc2626', marginBottom: 4 }}>{ensembleResults.consensus.frustration}%</div>
              <div style={{ fontSize: 13, color: '#f87171' }}>Voted by {ensembleResults.model_count} models</div>
            </div>
          </div>

          <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Individual Model Predictions</h3>
            <div style={{ display: 'grid', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
              {Object.entries(ensembleResults.all_results).map(([modelId, result]) => (
                <div
                  key={modelId}
                  style={{
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    padding: 12,
                    background: result.error ? 'rgba(239, 68, 68, 0.08)' : 'rgba(226, 232, 240, 0.5)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{result.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {result.family} • {result.status}
                      </div>
                    </div>
                    {result.error ? (
                      <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>ERROR</div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 700 }}>OK</div>
                    )}
                  </div>
                  {result.error ? (
                    <div style={{ fontSize: 12, color: '#991b1b', background: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 6 }}>
                      {result.error}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, fontSize: 12 }}>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Engagement:</span> <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {Math.round((result.normalized_scores?.engagement ?? 0) * 100) / 100}%
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Boredom:</span> <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {Math.round((result.normalized_scores?.boredom ?? 0) * 100) / 100}%
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Confusion:</span> <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {Math.round((result.normalized_scores?.confusion ?? 0) * 100) / 100}%
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Frustration:</span> <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {Math.round((result.normalized_scores?.frustration ?? 0) * 100) / 100}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={panelStyle}>
        <h2 style={h2}>Ensemble Run Log</h2>
        <EnsembleTerminal lines={ensembleLog} />
      </section>

    </main>
  );
}

function LiveCameraPanel({ onFeaturesReady }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const extractorRef = useRef(null);
  const rafRef = useRef(null);
  const onFeaturesReadyRef = useRef(onFeaturesReady);
  const [active, setActive] = useState(false);

  useEffect(() => {
    onFeaturesReadyRef.current = onFeaturesReady;
  }, [onFeaturesReady]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const extractor = new MediaPipeExtractor();
      extractorRef.current = extractor;
      extractor.onFeaturesReady = (f) => {
        if (onFeaturesReadyRef.current) onFeaturesReadyRef.current(f);
      };

      const ok = await extractor.initialize();
      if (!ok || !mounted) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540, frameRate: 15 },
        });
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setActive(true);

        const loop = async () => {
          if (!mounted || !videoRef.current || !extractorRef.current) return;
          await extractorRef.current.processFrame(videoRef.current);
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        setActive(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (extractorRef.current) extractorRef.current.destroy();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 12, overflow: 'hidden', border: `1px solid ${active ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`, background: '#020617' }}>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      <div style={{ position: 'absolute', left: 10, top: 10, borderRadius: 999, padding: '5px 9px', fontSize: 11, fontWeight: 800, background: active ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)', color: active ? '#86efac' : '#fecaca', border: '1px solid rgba(255,255,255,0.25)' }}>
        {active ? 'LIVE CAMERA + MODEL SIGNALS' : 'CAMERA OFFLINE'}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 12, color: '#475569', fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function MetricPill({ label, value, tone = 'blue' }) {
  const toneMap = {
    blue: { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
    green: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    amber: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
    cyan: { bg: '#cffafe', border: '#67e8f9', text: '#155e75' },
  };
  const t = toneMap[tone] || toneMap.blue;
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${t.border}`, background: t.bg, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>{value}</div>
    </div>
  );
}

function btn(bg) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(15,23,42,0.18)',
  };
}

const h2 = {
  margin: '0 0 10px',
  fontSize: 18,
  fontWeight: 800,
  color: '#0f2b4d',
};

const inputStyle = {
  flex: '1 1 340px',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #94a3b8',
  background: 'rgba(255,255,255,0.95)',
  color: '#0f172a',
  fontWeight: 600,
};

const panelStyle = {
  marginTop: 14,
  padding: 16,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.82)',
  border: '1px solid rgba(148,163,184,0.42)',
  boxShadow: '0 12px 30px rgba(37, 99, 235, 0.08)',
  backdropFilter: 'blur(6px)',
};

const chartSurfaceStyle = {
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.45)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))',
  padding: 12,
};

const themeVars = {
  '--color-surface': '#ffffff',
  '--color-surface-elevated': '#eff6ff',
  '--color-border': '#cbd5e1',
  '--color-text': '#0f172a',
  '--color-text-secondary': '#334155',
  '--color-text-muted': '#64748b',
  '--color-success': '#16a34a',
  '--color-success-light': '#dcfce7',
  '--color-warning': '#d97706',
  '--color-warning-light': '#fef3c7',
  '--color-danger': '#dc2626',
  '--color-danger-light': '#fee2e2',
  '--color-info': '#0284c7',
  '--color-info-light': '#e0f2fe',
  '--color-accent': '#2563eb',
  '--shadow-lg': '0 18px 32px rgba(15, 23, 42, 0.18)',
};

function EnsembleTerminal({ lines }) {
  const lineColor = (line) => {
    if (/Success|complete|OK/i.test(line)) return '#4ade80';
    if (/Failed|Error|FAIL/i.test(line)) return '#f87171';
    if (/Skipping|biased|zero-signal|warning/i.test(line)) return '#fbbf24';
    if (/Starting|Running|Reload|ensemble/i.test(line)) return '#60a5fa';
    return '#cbd5e1';
  };
  return (
    <div
      style={{
        background: '#0d1117',
        borderRadius: 10,
        border: '1px solid #30363d',
        padding: '12px 14px',
        maxHeight: 260,
        overflowY: 'auto',
        fontFamily: '"Cascadia Code","Fira Code","JetBrains Mono","Consolas",monospace',
        fontSize: 12,
        lineHeight: 1.7,
      }}
    >
      {lines.length === 0 ? (
        <span style={{ color: '#6e7681' }}>▶ No ensemble runs yet. Click "Ensemble Voting" to start.</span>
      ) : (
        lines.map((line, i) => (
          <div key={`${i}-${line.slice(0, 20)}`} style={{ color: lineColor(line), wordBreak: 'break-all' }}>{line}</div>
        ))
      )}
    </div>
  );
}

function LiveModelResultsPanel({ liveModelResults, ensembleRunning }) {
  const entries = Object.entries(liveModelResults);
  const statusIcon = (s) => ({ running: '⏳', success: '✅', skipped: '⏭️', error: '❌' }[s] || '❌');
  const statusLabel = (s) => ({ running: 'Running', success: 'Success', skipped: 'Skipped', error: 'Error' }[s] || 'Error');
  const statusBg = (s) => ({
    success: 'rgba(16,185,129,0.07)',
    error: 'rgba(239,68,68,0.07)',
    skipped: 'rgba(245,158,11,0.06)',
    running: 'rgba(37,99,235,0.06)',
  }[s] || 'transparent');

  return (
    <section style={panelStyle}>
      <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: 8 }}>
        ⚡ Live Multi-Model Inference
        {ensembleRunning && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 6, padding: '2px 8px' }}>
            Running…
          </span>
        )}
      </h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map(([modelId, result]) => (
          <div
            key={modelId}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderRadius: 8, border: '1px solid #e2e8f0',
              padding: '10px 14px',
              background: statusBg(result.status),
              transition: 'background 0.3s',
            }}
          >
            <div aria-label={statusLabel(result.status)} style={{ flexShrink: 0, fontSize: 16, width: 22, textAlign: 'center' }}>{statusIcon(result.status)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {result.name || modelId}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{result.family}</div>
            </div>
            {result.status === 'running' && (
              <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>Running…</div>
            )}
            {result.status === 'success' && result.scores && (
              <div style={{ display: 'flex', gap: 10, fontSize: 12, flexShrink: 0 }}>
                <span>E:<b style={{ color: '#16a34a' }}>{result.scores.engagement}%</b></span>
                <span>B:<b style={{ color: '#db2777' }}>{result.scores.boredom}%</b></span>
                <span>C:<b style={{ color: '#d97706' }}>{result.scores.confusion}%</b></span>
                <span>F:<b style={{ color: '#dc2626' }}>{result.scores.frustration}%</b></span>
              </div>
            )}
            {result.status === 'skipped' && (
              <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>{result.reason}</div>
            )}
            {result.status === 'error' && (
              <div style={{ fontSize: 11, color: '#dc2626', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {result.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<LiveEngagementTestPage />);
