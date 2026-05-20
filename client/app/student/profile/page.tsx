'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Brain, Clock, BookOpen, Award } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function StudentProfile() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/progress/summary')
      .then(r => setSummary(r.data.summary))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const focusColor = (s: number) => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8">
        <h1 className="section-title text-3xl">My Profile</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your account and learning statistics</p>
      </div>

      {/* Profile Card */}
      <motion.div className="glass-card p-8 mb-6 text-center"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-4"
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-2xl font-bold mb-1">{user?.name}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
        <span className="badge badge-primary px-4 py-1.5">Student</span>
      </motion.div>

      {/* Stats */}
      {!loading && summary && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: BookOpen, label: 'Enrolled Courses', value: summary.enrolledCourses, color: '#7c3aed' },
            { icon: Award, label: 'Completed Lectures', value: summary.completedLectures, color: '#10b981' },
            { icon: Clock, label: 'Watch Hours', value: `${summary.totalWatchHours}h`, color: '#06b6d4' },
            { icon: Brain, label: 'Avg Focus Score', value: `${summary.avgFocusScore}%`, color: focusColor(summary.avgFocusScore) },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} className="stat-card"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="p-3 rounded-xl w-fit mb-3" style={{ background: `${stat.color}20` }}>
                  <Icon size={20} style={{ color: stat.color }} />
                </div>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
