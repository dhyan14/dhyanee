'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Brain, TrendingUp, PlayCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get('/students/courses'),
          api.get('/students/progress/summary'),
        ]);
        setCourses(cRes.data.courses);
        setSummary(sRes.data.summary);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const focusColor = (score: number) => score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const focusLabel = (score: number) => score >= 75 ? 'Highly Focused' : score >= 50 ? 'Moderate' : 'Needs Improvement';

  const statCards = [
    { icon: BookOpen, label: 'Enrolled Courses', value: summary?.enrolledCourses ?? 0, color: '#7c3aed' },
    { icon: PlayCircle, label: 'Completed Lectures', value: summary?.completedLectures ?? 0, color: '#06b6d4' },
    { icon: Clock, label: 'Watch Hours', value: `${summary?.totalWatchHours ?? 0}h`, color: '#10b981' },
    { icon: Brain, label: 'Avg Focus Score', value: `${summary?.avgFocusScore ?? 0}%`, color: focusColor(summary?.avgFocusScore ?? 0) },
  ];

  return (
    <div className="page-container">
      {/* Greeting */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-1">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Continue your learning journey
        </p>
      </motion.div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} className="stat-card"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}>
                <div className="p-3 rounded-xl w-fit mb-3" style={{ background: `${card.color}20` }}>
                  <Icon size={20} style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold mb-1">{card.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Focus Score Banner */}
      {summary && (
        <motion.div className="glass-card p-6 mb-8 flex items-center gap-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ borderColor: `${focusColor(summary.avgFocusScore)}30` }}>
          <div className="relative w-20 h-20 shrink-0">
            {(() => {
              const r = 32, circ = 2 * Math.PI * r, offset = circ - (summary.avgFocusScore / 100) * circ;
              return (
                <svg width="80" height="80" className="-rotate-90">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="40" cy="40" r={r} fill="none" stroke={focusColor(summary.avgFocusScore)} strokeWidth="6"
                    strokeDasharray={circ} strokeDashoffset={offset} style={{ strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
              );
            })()}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold" style={{ color: focusColor(summary.avgFocusScore) }}>{summary.avgFocusScore}%</span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-lg mb-1">Your Focus Score: <span style={{ color: focusColor(summary.avgFocusScore) }}>{focusLabel(summary.avgFocusScore)}</span></p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Based on your recent learning sessions. Keep your attention on screen for a higher score.</p>
          </div>
        </motion.div>
      )}

      {/* Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">My Courses</h2>
          <Link href="/student/courses" className="text-sm flex items-center gap-1" style={{ color: 'var(--primary-light)' }}>
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <BookOpen size={40} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium mb-1">No courses yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ask your admin to enroll you in a course</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course, i) => (
              <motion.div key={course._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link href={`/student/courses/${course._id}`}>
                  <div className="glass-card-hover overflow-hidden cursor-pointer">
                    <div className="h-32 relative" style={{
                      background: course.thumbnail ? `url(${course.thumbnail}) center/cover` : 'var(--gradient-primary)'
                    }}>
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle size={40} className="text-white opacity-80" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-1">{course.title}</h3>
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{course.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{course.instructor || 'Dhyanee'}</span>
                        <ChevronRight size={16} style={{ color: 'var(--primary-light)' }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
