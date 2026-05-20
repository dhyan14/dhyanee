'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface Props {
  enabled: boolean;
  onAttentionUpdate: (score: number, faceDetected: boolean, distractionType?: string) => void;
  onDistraction: (type: string, snapshotBase64?: string) => void;
  sessionId: string | null;
  focusScore: number;
}

const DISTRACTION_THRESHOLD_SEC = 20; // seconds before alert triggers

export default function AttentionMonitor({ enabled, onAttentionUpdate, onDistraction, sessionId, focusScore }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const distractionStartRef = useRef<number | null>(null);
  const alertSentRef = useRef(false);
  const focusedFrames = useRef(0);
  const totalFrames = useRef(0);
  const faceApiLoadedRef = useRef(false);

  const [faceApiReady, setFaceApiReady] = useState(false);
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyeDirection, setEyeDirection] = useState('center');
  const [localFocusScore, setLocalFocusScore] = useState(100);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // ─── Load face-api.js models ─────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || faceApiLoadedRef.current) return;

    const loadFaceApi = async () => {
      try {
        // Dynamically import face-api.js (browser only)
        const faceapi = await import('face-api.js');
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        faceApiLoadedRef.current = true;
        setModelsLoaded(true);
        setFaceApiReady(true);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setStatus('error');
      }
    };

    loadFaceApi();
  }, [enabled]);

  // ─── Start webcam ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !faceApiReady) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('active');
          startDetection();
        }
      } catch (err) {
        setStatus('error');
      }
    };

    startCamera();

    return () => {
      stopCamera();
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [enabled, faceApiReady]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // ─── Face detection loop ─────────────────────────────────────────────────────
  const startDetection = useCallback(async () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);

    const faceapi = await import('face-api.js');

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        totalFrames.current += 1;

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
        const detection = await faceapi
          .detectSingleFace(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceExpressions();

        if (!detection) {
          // No face detected
          setFaceDetected(false);
          handleNoFace();
          return;
        }

        setFaceDetected(true);
        alertSentRef.current = false;
        distractionStartRef.current = null;

        // Analyze eye direction via landmarks
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();

        const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const noseTipX = nose[3].x;
        const deviation = (noseTipX - eyeCenterX) / (rightEye[3].x - leftEye[0].x);

        let direction = 'center';
        if (deviation > 0.3) direction = 'right';
        else if (deviation < -0.3) direction = 'left';
        setEyeDirection(direction);

        // Check head tilt (up/down)
        const eyeY = (leftEye[0].y + rightEye[0].y) / 2;
        const noseTipY = nose[6].y;
        const verticalRatio = (noseTipY - eyeY) / detection.detection.box.height;

        const isLookingAway = Math.abs(deviation) > 0.4 || verticalRatio < 0.15 || verticalRatio > 0.65;

        // Expressions
        const expr = detection.expressions;
        const isInattentive = (expr as any).sleepy > 0.5 || expr.disgusted > 0.4 || expr.sad > 0.6;

        if (isLookingAway || isInattentive) {
          handleDistracted('looking_away');
        } else {
          // Focused
          focusedFrames.current += 1;
          distractionStartRef.current = null;
          alertSentRef.current = false;
          updateFocusScore();
        }

        // Draw on canvas
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, [detection.detection]);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, [detection]);
          }
        }
      } catch {}
    }, 1000); // check every 1 second
  }, []);

  const handleNoFace = () => {
    if (!distractionStartRef.current) {
      distractionStartRef.current = Date.now();
    }
    const elapsed = (Date.now() - distractionStartRef.current) / 1000;
    if (elapsed >= DISTRACTION_THRESHOLD_SEC && !alertSentRef.current) {
      alertSentRef.current = true;
      captureAndReport('face_missing');
    }
    updateFocusScore();
  };

  const handleDistracted = (type: string) => {
    if (!distractionStartRef.current) {
      distractionStartRef.current = Date.now();
    }
    const elapsed = (Date.now() - distractionStartRef.current) / 1000;
    if (elapsed >= DISTRACTION_THRESHOLD_SEC && !alertSentRef.current) {
      alertSentRef.current = true;
      captureAndReport(type);
    }
    updateFocusScore();
  };

  const updateFocusScore = () => {
    if (totalFrames.current === 0) return;
    const rate = focusedFrames.current / totalFrames.current;
    const score = Math.max(0, Math.min(100, Math.round(rate * 100)));
    setLocalFocusScore(score);
    onAttentionUpdate(score, faceDetected);
  };

  // ─── Capture snapshot and report distraction ─────────────────────────────────
  const captureAndReport = useCallback((type: string) => {
    let snapshotBase64 = '';
    try {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 320; canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
        snapshotBase64 = canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch {}
    onDistraction(type, snapshotBase64);
  }, [onDistraction]);

  const statusColor = faceDetected ? '#10b981' : '#ef4444';

  return (
    <div className="flex flex-col h-full">
      {/* Webcam Feed */}
      <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Status overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
          style={{ background: 'rgba(0,0,0,0.7)', color: statusColor }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
          {status === 'loading' ? 'Loading AI...' : faceDetected ? 'Face Detected' : 'No Face'}
        </div>

        {/* Eye direction indicator */}
        {faceDetected && (
          <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.7)', color: '#a09ec0' }}>
            👁 {eyeDirection}
          </div>
        )}

        {/* Loading overlay */}
        {!modelsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading AI models...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <AlertCircle size={32} style={{ color: '#ef4444' }} className="mb-2" />
            <p className="text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>
              AI monitoring unavailable
            </p>
          </div>
        )}
      </div>

      {/* Focus indicator */}
      <div className="p-4 flex-1">
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Real-time Focus</span>
            <span style={{ color: localFocusScore >= 75 ? '#10b981' : localFocusScore >= 50 ? '#f59e0b' : '#ef4444' }}>
              {localFocusScore}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${localFocusScore}%`,
                background: localFocusScore >= 75 ? '#10b981' : localFocusScore >= 50 ? '#f59e0b' : '#ef4444',
              }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-semibold" style={{ color: faceDetected ? '#10b981' : '#ef4444' }}>
              {faceDetected ? '✓ Detected' : '✗ Missing'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Face</p>
          </div>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-semibold capitalize"
              style={{ color: eyeDirection === 'center' ? '#10b981' : '#f59e0b' }}>
              {eyeDirection}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Eye Dir.</p>
          </div>
        </div>

        {/* AI status message */}
        <div className="mt-3 p-2 rounded-lg text-center" style={{ background: 'rgba(124,58,237,0.06)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {!faceDetected
              ? '⚠️ Please face the camera'
              : eyeDirection !== 'center'
              ? '👁 Please look at the screen'
              : '✅ Good focus — keep it up!'}
          </p>
        </div>
      </div>
    </div>
  );
}
