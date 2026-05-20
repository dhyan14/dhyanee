'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Brain, AlertTriangle, Eye, Clock, Camera, Activity } from 'lucide-react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface StudentCard {
  socketId: string;
  studentId: string;
  studentName: string;
  lectureId: string;
  courseId?: string;
  currentTime: number;
  watchPercentage: number;
  focusScore: number;
  distractionCount: number;
  webcamEnabled: boolean;
  isOnline: boolean;
  joinedAt: string;
  currentLecture?: string;
  snapshotUrl?: string;
}

const FocusRing = ({ score }: { score: number }) => {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const r = 20, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease', strokeLinecap: 'round' }} />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}%</span>
    </div>
  );
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function MonitoringPage() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Map<string, StudentCard>>(new Map());
  const [distractionAlerts, setDistractionAlerts] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  const fetchInitial = useCallback(async () => {
    try {
      const res = await api.get('/admin/monitoring');
      const initial = new Map<string, StudentCard>();
      res.data.activeSessions?.forEach((s: any) => {
        initial.set(s.student?._id || s._id, {
          socketId: s._id,
          studentId: s.student?._id,
          studentName: s.student?.name || 'Unknown',
          lectureId: s.lecture?._id,
          currentLecture: s.lecture?.title,
          currentTime: s.currentVideoTime || 0,
          watchPercentage: 0,
          focusScore: s.focusScore || 100,
          distractionCount: s.distractionCount || 0,
          webcamEnabled: s.webcamEnabled,
          isOnline: s.isOnline,
          joinedAt: s.createdAt,
        });
      });
      setStudents(initial);
    } catch {}
  }, []);

  useEffect(() => {
    fetchInitial();
    const socket = connectSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    if (user) socket.emit('admin:join', { adminId: user._id });

    socket.on('admin:active-students', (list: StudentCard[]) => {
      const m = new Map<string, StudentCard>();
      list.forEach(s => m.set(s.socketId, s));
      setStudents(m);
    });

    socket.on('student:online', (data: StudentCard) => {
      setStudents(prev => new Map(prev).set(data.socketId, data));
      toast(`${data.studentName} joined a lecture`, { icon: '📚' });
    });

    socket.on('student:offline', ({ socketId, studentName }: any) => {
      setStudents(prev => {
        const m = new Map(prev);
        const s = m.get(socketId);
        if (s) m.set(socketId, { ...s, isOnline: false });
        return m;
      });
    });

    socket.on('student:progress-update', (data: any) => {
      setStudents(prev => {
        const m = new Map(prev);
        const s = m.get(data.socketId);
        if (s) m.set(data.socketId, { ...s, currentTime: data.currentTime, watchPercentage: data.watchPercentage });
        return m;
      });
    });

    socket.on('student:attention-update', (data: any) => {
      setStudents(prev => {
        const m = new Map(prev);
        const s = m.get(data.socketId);
        if (s) m.set(data.socketId, { ...s, focusScore: data.focusScore, distractionCount: data.distractionCount, webcamEnabled: data.webcamEnabled });
        return m;
      });
    });

    socket.on('student:distraction-alert', (data: any) => {
      setDistractionAlerts(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 20));
      toast.error(`⚠️ ${data.studentName}: ${data.eventType?.replace('_', ' ')}`, { duration: 5000 });
    });

    return () => {
      socket.off('connect'); socket.off('disconnect');
      socket.off('admin:active-students'); socket.off('student:online');
      socket.off('student:offline'); socket.off('student:progress-update');
      socket.off('student:attention-update'); socket.off('student:distraction-alert');
    };
  }, [user, fetchInitial]);

  const studentList = Array.from(students.values());
  const onlineCount = studentList.filter(s => s.isOnline).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title text-3xl">Live Monitoring</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time student activity and AI attention tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${connected ? 'badge-success' : 'badge-danger'}`}
            style={{ background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live' : 'Disconnected'}
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <Activity size={16} style={{ color: '#7c3aed' }} />
            <span className="font-semibold">{onlineCount}</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Student Cards */}
        <div className="xl:col-span-2">
          {studentList.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Activity size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No active students</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Students will appear here when they start a lecture</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {studentList.map((student, i) => (
                  <motion.div key={student.socketId} className="glass-card p-5"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}
                    style={{ borderColor: student.isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.1)' }}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'var(--gradient-primary)' }}>
                          {student.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2`}
                          style={{ borderColor: 'var(--bg-card)', background: student.isOnline ? '#10b981' : '#6b6888' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{student.studentName}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {student.currentLecture || 'Unknown lecture'}
                        </p>
                      </div>
                      <FocusRing score={student.focusScore} />
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>Watch Progress</span>
                        <span>{Math.round(student.watchPercentage)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${student.watchPercentage}%` }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <Clock size={12} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs font-semibold">{formatTime(student.currentTime)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Timestamp</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <AlertTriangle size={12} className="mx-auto mb-1"
                          style={{ color: student.distractionCount > 0 ? '#ef4444' : 'var(--text-muted)' }} />
                        <p className="text-xs font-semibold">{student.distractionCount}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Distractions</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <Camera size={12} className="mx-auto mb-1"
                          style={{ color: student.webcamEnabled ? '#10b981' : 'var(--text-muted)' }} />
                        <p className="text-xs font-semibold">{student.webcamEnabled ? 'On' : 'Off'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Webcam</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Distraction Alerts Feed */}
        <div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <h3 className="font-semibold">Distraction Alerts</h3>
              {distractionAlerts.length > 0 && (
                <span className="badge badge-danger ml-auto">{distractionAlerts.length}</span>
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {distractionAlerts.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  No alerts yet. All students are focused! 🎯
                </p>
              ) : distractionAlerts.map((alert) => (
                <motion.div key={alert.id} className="p-3 rounded-xl border"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="badge badge-danger text-xs shrink-0">
                      {alert.eventType?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{alert.studentName}</p>
                  {alert.focusScore !== undefined && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Focus: {Math.round(alert.focusScore)}%
                    </p>
                  )}
                  {alert.snapshotUrl && (
                    <img src={alert.snapshotUrl} alt="Snapshot"
                      className="w-full h-20 object-cover rounded-lg mt-2 border"
                      style={{ borderColor: 'rgba(239,68,68,0.3)' }} />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
