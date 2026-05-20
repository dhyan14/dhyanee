'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Camera, CameraOff, Brain, Eye, EyeOff, Shield, Wifi } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { connectSocket } from '@/lib/socket';
import AttentionMonitor from '@/components/AttentionMonitor';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function LecturePage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  // Lecture data
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Progress tracking
  const maxWatchedRef = useRef(0);
  const currentTimeRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const totalWatchTimeRef = useRef(0);
  const lastSaveTimeRef = useRef(Date.now());

  // Player
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isSeeking = useRef(false);

  // Attention monitoring
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamPermission, setWebcamPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [showWebcamPrompt, setShowWebcamPrompt] = useState(true);
  const [focusScore, setFocusScore] = useState(100);
  const [faceDetected, setFaceDetected] = useState(true);
  const [distractionCount, setDistractionCount] = useState(0);
  const distractionCountRef = useRef(0);

  // Tab switching
  const tabSwitchCountRef = useRef(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Warning state
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);

  // Socket
  const socketRef = useRef<any>(null);

  // ─── Fetch lecture & init session ───────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [lectureRes, progressRes] = await Promise.all([
          api.get(`/courses/lectures/${lectureId}`),
          api.get(`/progress/${lectureId}`),
        ]);
        const lec = lectureRes.data.lecture;
        setLecture(lec);

        const savedProgress = progressRes.data.progress;
        if (savedProgress) {
          maxWatchedRef.current = savedProgress.maxWatched || 0;
          currentTimeRef.current = savedProgress.currentTime || 0;
        }

        // Start session
        const sessionRes = await api.post('/attention/session/start', {
          lectureId,
          courseId: lec.course?._id || lec.course,
          webcamEnabled: false,
        });
        sessionIdRef.current = sessionRes.data.session._id;
      } catch (err) {
        toast.error('Failed to load lecture');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [lectureId, router]);

  // ─── Anti-cheat: right-click, keyboard shortcuts, devtools ──────────────────
  useEffect(() => {
    // Disable right-click
    const noCtxMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', noCtxMenu);

    // Disable keyboard shortcuts (arrows, space, F12, etc.)
    const noKeys = (e: KeyboardEvent) => {
      const blocked = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'F12', 'F5'];
      if (blocked.includes(e.key)) e.preventDefault();
      // Block Ctrl+Shift+I/J/C (devtools)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        handleDistraction('devtools');
      }
      // Block Ctrl+U (view source)
      if (e.ctrlKey && e.key === 'u') e.preventDefault();
    };
    document.addEventListener('keydown', noKeys);

    // Detect devtools open via size check
    const devToolsInterval = setInterval(() => {
      if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160) {
        handleDistraction('devtools');
      }
    }, 3000);

    return () => {
      document.removeEventListener('contextmenu', noCtxMenu);
      document.removeEventListener('keydown', noKeys);
      clearInterval(devToolsInterval);
    };
  }, []);

  // ─── Tab switch detection ────────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        playerRef.current?.pauseVideo?.();
        tabSwitchCountRef.current += 1;
        setTabSwitchCount(tabSwitchCountRef.current);
        handleDistraction('tab_switch');
        toast.error('⚠️ Lecture paused — tab switch detected!', { duration: 4000 });
      } else {
        toast('Returned to lecture', { icon: '👁️', duration: 2000 });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ─── Socket connection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !lecture) return;
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('student:join', {
      studentId: user._id,
      studentName: user.name,
      lectureId,
      courseId: lecture.course?._id || lecture.course,
      sessionId: sessionIdRef.current,
    });

    socket.on('admin:warning', ({ message }: { message: string }) => {
      toast.error(`⚠️ Admin Warning: ${message}`, { duration: 8000 });
    });

    // Heartbeat
    const hb = setInterval(() => socket.emit('student:heartbeat'), 30000);
    return () => {
      clearInterval(hb);
      socket.off('admin:warning');
    };
  }, [user, lecture, lectureId]);

  // ─── YouTube IFrame API ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!lecture) return;

    const loadYT = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    };

    const initPlayer = () => {
      if (!playerContainerRef.current) return;
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: lecture.youtubeId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 1,        // disable keyboard shortcuts
          fs: 0,               // disable fullscreen button
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          start: Math.floor(currentTimeRef.current),
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onStateChange,
        },
      });
    };

    loadYT();

    return () => {
      playerRef.current?.destroy?.();
    };
  }, [lecture]);

  const onPlayerReady = (event: any) => {
    // Resume from saved position
    if (currentTimeRef.current > 0) {
      event.target.seekTo(currentTimeRef.current, true);
      toast(`▶ Resuming from ${Math.floor(currentTimeRef.current / 60)}:${String(Math.floor(currentTimeRef.current % 60)).padStart(2, '0')}`, { icon: '🔖', duration: 3000 });
    }
    // Disable playback speed abuse
    event.target.setPlaybackRate(1);
  };

  // ─── CORE: Seek restriction — no skip ahead beyond maxWatched ───────────────
  const onStateChange = useCallback((event: any) => {
    const YT = window.YT;
    if (!YT) return;

    if (event.data === YT.PlayerState.PLAYING) {
      // Poll every 500ms to enforce seek restriction
      const enforceInterval = setInterval(() => {
        if (!playerRef.current) { clearInterval(enforceInterval); return; }

        const ct = playerRef.current.getCurrentTime?.() ?? 0;
        currentTimeRef.current = ct;

        // Update maxWatched only as the video naturally progresses
        if (ct > maxWatchedRef.current) {
          maxWatchedRef.current = ct;
        }

        // Enforce: if student seeks ahead of maxWatched → pull them back
        if (!isSeeking.current && ct > maxWatchedRef.current + 1.5) {
          isSeeking.current = true;
          playerRef.current.seekTo(maxWatchedRef.current, true);
          toast.error('⛔ Cannot skip ahead! Watch the full lecture.', { duration: 3000 });
          setTimeout(() => { isSeeking.current = false; }, 600);
          return;
        }

        // Prevent speed abuse
        const speed = playerRef.current.getPlaybackRate?.() ?? 1;
        if (speed > 1.25) {
          playerRef.current.setPlaybackRate(1);
          toast.error('⚠️ Playback speed restricted to 1.25x max', { duration: 2000 });
        }

        // Track total watch time
        const now = Date.now();
        totalWatchTimeRef.current += (now - lastSaveTimeRef.current) / 1000;
        lastSaveTimeRef.current = now;

        // Emit to socket
        const duration = playerRef.current.getDuration?.() ?? 0;
        const watchPct = duration > 0 ? (maxWatchedRef.current / duration) * 100 : 0;
        socketRef.current?.emit('student:progress', {
          currentTime: ct,
          watchPercentage: Math.min(100, watchPct),
        });

        // Auto-save every 5 seconds
        if (totalWatchTimeRef.current % 5 < 0.6) {
          saveProgress();
        }
      }, 500);

      return () => clearInterval(enforceInterval);
    }

    if (event.data === YT.PlayerState.PAUSED) {
      lastSaveTimeRef.current = Date.now();
      saveProgress();
    }

    if (event.data === YT.PlayerState.ENDED) {
      maxWatchedRef.current = playerRef.current?.getDuration?.() ?? maxWatchedRef.current;
      saveProgress();
      toast.success('🎉 Lecture completed! Great job!', { duration: 5000 });
    }
  }, []);

  const saveProgress = useCallback(async () => {
    if (!lectureId) return;
    try {
      const duration = playerRef.current?.getDuration?.() ?? 0;
      await api.post(`/progress/${lectureId}`, {
        currentTime: currentTimeRef.current,
        maxWatched: maxWatchedRef.current,
        duration,
        totalWatchTime: Math.floor(totalWatchTimeRef.current),
      });
      totalWatchTimeRef.current = 0; // reset accumulated time after save
    } catch {}
  }, [lectureId]);

  // ─── Save on unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      saveProgress();
      if (sessionIdRef.current) {
        api.put(`/attention/session/${sessionIdRef.current}`, {
          isActive: false,
          focusScore,
          distractionCount: distractionCountRef.current,
          tabSwitchCount: tabSwitchCountRef.current,
        }).catch(() => {});
      }
    };
  }, [saveProgress, focusScore]);

  // ─── Distraction handler ─────────────────────────────────────────────────────
  const handleDistraction = useCallback(async (type: string, snapshotBase64?: string) => {
    distractionCountRef.current += 1;
    setDistractionCount(distractionCountRef.current);

    const newFocus = Math.max(0, focusScore - (type === 'tab_switch' ? 5 : 8));
    setFocusScore(newFocus);

    setWarningReason(type.replace(/_/g, ' '));
    setShowWarning(true);
    warningAudioRef.current?.play?.().catch(() => {});
    playerRef.current?.pauseVideo?.();

    // Emit via socket
    socketRef.current?.emit('student:distraction', {
      eventType: type,
      focusScore: newFocus,
      snapshotUrl: snapshotBase64 || '',
    });

    // Log to backend
    try {
      await api.post('/attention/distraction', {
        lectureId,
        courseId: lecture?.course?._id || lecture?.course,
        sessionId: sessionIdRef.current,
        eventType: type,
        duration: 20,
        videoTimestamp: currentTimeRef.current,
        focusScore: newFocus,
        snapshotBase64: snapshotBase64 || '',
      });
    } catch {}
  }, [focusScore, lectureId, lecture]);

  // ─── Webcam permission ───────────────────────────────────────────────────────
  const requestWebcam = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamPermission('granted');
      setWebcamEnabled(true);
      setShowWebcamPrompt(false);
      toast.success('📷 AI monitoring active');
      if (sessionIdRef.current) {
        await api.put(`/attention/session/${sessionIdRef.current}`, { webcamEnabled: true });
      }
    } catch {
      setWebcamPermission('denied');
      setShowWebcamPrompt(false);
      toast('Webcam denied. Monitoring disabled.', { icon: '⚠️' });
    }
  };

  // ─── Focus score update from attention monitor ───────────────────────────────
  const handleAttentionUpdate = useCallback((score: number, detected: boolean, type?: string) => {
    setFocusScore(score);
    setFaceDetected(detected);
    socketRef.current?.emit('student:attention', {
      focusScore: score,
      faceDetected: detected,
      distractionCount: distractionCountRef.current,
      webcamEnabled: true,
    });
    if (type) handleDistraction(type);
  }, [handleDistraction]);

  const focusColor = focusScore >= 75 ? '#10b981' : focusScore >= 50 ? '#f59e0b' : '#ef4444';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mx-auto mb-4" />
          <p style={{ color: 'var(--text-muted)' }}>Loading lecture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', userSelect: 'none' }}>
      {/* Warning audio */}
      <audio ref={warningAudioRef} preload="none">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2pAOGCx7uGfVzRGkOjt05FOK0iJ6Ovbq24+VJz4+ua5dEhgqv/7zpBaXbT/+9eVXE6i8ef0o2pRaqf069KUZ2Wi/PCzj1thlb3hqqaDa5Cs16enjXFtl7bVoXyGcZm22KSNhmyNrNeanomHlMjfuaWWlqO71r+9vL/D0eXEsq+0x9rd3dfa2+Tq6Obm6u7w7+3u8PHu7fD0" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="sticky top-0 z-40 px-6 py-3 flex items-center gap-4"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--bg-border)' }}>
        <button onClick={() => { saveProgress(); router.back(); }}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{lecture?.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {lecture?.chapter?.title} • {lecture?.subject?.title}
          </p>
        </div>

        {/* Focus Score Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: `${focusColor}15`, border: `1px solid ${focusColor}30` }}>
          <Brain size={14} style={{ color: focusColor }} />
          <span className="text-sm font-semibold" style={{ color: focusColor }}>{focusScore}%</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>focus</span>
        </div>

        {/* Anti-cheat badge */}
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(124,58,237,0.1)', color: '#8b5cf6' }}>
          <Shield size={13} /> Protected
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-57px)]">
        {/* ─── Video Section ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-black">
          {/* YouTube Player */}
          <div className="relative flex-1 bg-black" style={{ minHeight: 0 }}>
            <div ref={playerContainerRef} className="w-full h-full" id="yt-player" />

            {/* Overlay to prevent direct interaction with YouTube controls */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
          </div>

          {/* Progress bar */}
          <div className="px-6 py-3" style={{ background: '#0a0a0f', borderTop: '1px solid var(--bg-border)' }}>
            <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              <span>Watch Progress (cannot skip ahead)</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={11} style={{ color: distractionCount > 0 ? '#ef4444' : 'var(--text-muted)' }} />
                  {distractionCount} distractions
                </span>
                <span className="flex items-center gap-1">
                  <Wifi size={11} /> {tabSwitchCount} tab switches
                </span>
              </div>
            </div>
            <div className="progress-bar" style={{ height: '6px' }}>
              <div className="progress-fill" id="watch-progress-bar" style={{ width: '0%', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Attention Monitor ────────────────────────────────── */}
        <div className="w-80 flex flex-col shrink-0"
          style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--bg-border)' }}>
          {/* Webcam Prompt */}
          <AnimatePresence>
            {showWebcamPrompt && (
              <motion.div className="p-5 border-b" style={{ borderColor: 'var(--bg-border)' }}
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(124,58,237,0.1)' }}>
                    <Camera size={28} style={{ color: '#8b5cf6' }} />
                  </div>
                  <p className="font-semibold text-sm mb-1">Enable AI Monitoring</p>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    Allow webcam access for AI attention tracking. This helps improve your focus score.
                  </p>
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1 justify-center text-xs py-2" onClick={requestWebcam}>
                      <Camera size={14} /> Enable
                    </button>
                    <button className="btn-ghost flex-1 text-xs" onClick={() => setShowWebcamPrompt(false)}>
                      Skip
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attention Monitor Component */}
          {webcamEnabled ? (
            <AttentionMonitor
              enabled={webcamEnabled}
              onAttentionUpdate={handleAttentionUpdate}
              onDistraction={handleDistraction}
              sessionId={sessionIdRef.current}
              focusScore={focusScore}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
              <CameraOff size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Webcam monitoring is disabled
              </p>
              {webcamPermission === 'denied' && (
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Camera access was denied in browser settings
                </p>
              )}
            </div>
          )}

          {/* Focus info */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--bg-border)' }}>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="flex justify-between">
                <span>Focus Score</span>
                <span style={{ color: focusColor, fontWeight: 600 }}>{focusScore}%</span>
              </div>
              <div className="flex justify-between">
                <span>Distractions</span>
                <span style={{ color: distractionCount > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{distractionCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Tab Switches</span>
                <span style={{ color: tabSwitchCount > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{tabSwitchCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Face Detected</span>
                <span style={{ color: faceDetected ? '#10b981' : '#ef4444' }}>
                  {faceDetected ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Distraction Warning Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showWarning && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass-card p-8 max-w-md w-full mx-4 text-center animate-siren"
              style={{ borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(22,10,10,0.95)' }}
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.5)' }}>
                <AlertTriangle size={40} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ef4444' }}>⚠️ Attention Required!</h2>
              <p className="font-medium mb-2 capitalize">{warningReason} detected</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Your distraction has been recorded and your admin has been notified.
                Please focus on the lecture to continue.
              </p>
              <div className="p-3 rounded-xl mb-6" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                  Current Focus Score: {focusScore}%
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Score drops with each distraction event
                </p>
              </div>
              <motion.button className="btn-primary w-full justify-center"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowWarning(false);
                  playerRef.current?.playVideo?.();
                }}>
                I'm Back — Resume Lecture
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update progress bar via useEffect */}
      <ProgressBarUpdater playerRef={playerRef} maxWatchedRef={maxWatchedRef} />
    </div>
  );
}

// Separate component to update progress bar DOM directly (avoids re-renders)
function ProgressBarUpdater({ playerRef, maxWatchedRef }: any) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const duration = playerRef.current.getDuration?.() ?? 0;
      if (duration > 0) {
        const pct = Math.min(100, (maxWatchedRef.current / duration) * 100);
        const bar = document.getElementById('watch-progress-bar');
        if (bar) bar.style.width = `${pct}%`;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerRef, maxWatchedRef]);
  return null;
}
