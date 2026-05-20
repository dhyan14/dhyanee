'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, Brain, AlertTriangle, TrendingUp, Activity, Eye } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import api from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Stats {
  totalStudents: number;
  activeStudents: number;
  onlineStudents: number;
  totalCourses: number;
  totalLectures: number;
  avgFocusScore: number;
  totalWatchHours: number;
  avgCompletion: number;
}

const StatCard = ({ icon: Icon, label, value, sub, color, delay }: any) => (
  <motion.div
    className="stat-card"
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}20` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${color}15`, color }}>Live</span>
    </div>
    <p className="text-3xl font-bold mb-1">{value}</p>
    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </motion.div>
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#16161f', borderColor: '#2a2a3a', borderWidth: 1 } },
  scales: {
    x: { grid: { color: 'rgba(42,42,58,0.5)' }, ticks: { color: '#6b6888', font: { size: 11 } } },
    y: { grid: { color: 'rgba(42,42,58,0.5)' }, ticks: { color: '#6b6888', font: { size: 11 } } },
  },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentDistractions, setRecentDistractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, analyticsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/analytics'),
      ]);
      setStats(dashRes.data.stats);
      setRecentDistractions(dashRes.data.recentDistractions || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const lineData = analytics?.dailySessions ? {
    labels: analytics.dailySessions.map((d: any) => d._id),
    datasets: [{
      data: analytics.dailySessions.map((d: any) => d.sessions),
      borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)',
      tension: 0.4, fill: true, pointBackgroundColor: '#7c3aed', pointRadius: 4,
    }],
  } : null;

  const focusData = analytics?.dailySessions ? {
    labels: analytics.dailySessions.map((d: any) => d._id),
    datasets: [{
      data: analytics.dailySessions.map((d: any) => Math.round(d.avgFocus || 0)),
      borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)',
      tension: 0.4, fill: true, pointBackgroundColor: '#06b6d4', pointRadius: 4,
    }],
  } : null;

  const completionData = analytics?.courseCompletion ? {
    labels: analytics.courseCompletion.map((c: any) => c.course.substring(0, 15) + '...'),
    datasets: [{
      data: analytics.courseCompletion.map((c: any) => c.completionRate),
      backgroundColor: ['rgba(124,58,237,0.8)', 'rgba(6,182,212,0.8)', 'rgba(245,158,11,0.8)', 'rgba(16,185,129,0.8)'],
      borderWidth: 0,
    }],
  } : null;

  if (loading) return (
    <div className="page-container">
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title text-3xl">Dashboard Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Real-time analytics and student monitoring
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="Total Students" value={stats?.totalStudents ?? 0} color="#7c3aed" delay={0} />
        <StatCard icon={Activity} label="Active Students" value={stats?.activeStudents ?? 0} sub="In active sessions" color="#06b6d4" delay={0.1} />
        <StatCard icon={Eye} label="Online Now" value={stats?.onlineStudents ?? 0} color="#10b981" delay={0.2} />
        <StatCard icon={BookOpen} label="Total Courses" value={stats?.totalCourses ?? 0} sub={`${stats?.totalLectures ?? 0} lectures`} color="#f59e0b" delay={0.3} />
        <StatCard icon={Brain} label="Avg Focus Score" value={`${stats?.avgFocusScore ?? 0}%`} color="#8b5cf6" delay={0.4} />
        <StatCard icon={Clock} label="Watch Hours" value={`${stats?.totalWatchHours ?? 0}h`} sub="Total across all students" color="#06b6d4" delay={0.5} />
        <StatCard icon={TrendingUp} label="Avg Completion" value={`${stats?.avgCompletion ?? 0}%`} color="#10b981" delay={0.6} />
        <StatCard icon={AlertTriangle} label="Distractions" value={recentDistractions.length} sub="Recent alerts" color="#ef4444" delay={0.7} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div className="glass-card p-6 lg:col-span-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="font-semibold mb-4">Daily Sessions (Last 7 Days)</h3>
          <div className="h-48">
            {lineData ? <Line data={lineData} options={chartOptions as any} /> :
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>No data yet</div>}
          </div>
        </motion.div>

        <motion.div className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="font-semibold mb-4">Course Completion</h3>
          <div className="h-48">
            {completionData ? <Doughnut data={completionData}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a09ec0', font: { size: 10 }, boxWidth: 10 } } } }} /> :
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>No courses yet</div>}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus trend */}
        <motion.div className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h3 className="font-semibold mb-4">Average Focus Score Trend</h3>
          <div className="h-40">
            {focusData ? <Line data={focusData} options={chartOptions as any} /> :
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>No data yet</div>}
          </div>
        </motion.div>

        {/* Recent distractions */}
        <motion.div className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h3 className="font-semibold mb-4">Recent Distraction Events</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {recentDistractions.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No distraction events recorded</p>
            ) : recentDistractions.map((log: any, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="badge badge-danger shrink-0">{log.eventType?.replace('_', ' ')}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{log.student?.name}</span>
                <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
