'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, CheckCircle, Lock, ChevronDown, ChevronRight, Clock, BarChart2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [completion, setCompletion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [courseRes, progressRes, completionRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/progress/course/${courseId}`),
          api.get(`/progress/completion/${courseId}`),
        ]);
        setCourse(courseRes.data.course);
        setSubjects(courseRes.data.subjects);
        setChapters(courseRes.data.chapters);
        setLectures(courseRes.data.lectures.filter((l: any) => l.isPublished));

        const pm: Record<string, any> = {};
        progressRes.data.progressList?.forEach((p: any) => { pm[p.lecture?._id || p.lecture] = p; });
        setProgressMap(pm);
        setCompletion(completionRes.data);

        // Expand first subject by default
        if (courseRes.data.subjects.length > 0) {
          setExpanded({ [courseRes.data.subjects[0]._id]: true });
        }
      } catch { router.push('/student/courses'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [courseId, router]);

  const formatDuration = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  const getLectureStatus = (lecture: any) => {
    const p = progressMap[lecture._id];
    if (p?.isCompleted) return 'completed';
    if (p?.currentTime > 0) return 'in-progress';
    return 'not-started';
  };

  if (loading) return (
    <div className="page-container">
      <div className="skeleton h-40 rounded-2xl mb-6" />
      <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Course Header */}
      <motion.div className="glass-card p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-48 h-32 rounded-xl shrink-0 overflow-hidden" style={{
            background: course?.thumbnail ? `url(${course.thumbnail}) center/cover` : 'var(--gradient-primary)'
          }} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{course?.title}</h1>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{course?.description}</p>
            {completion && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {completion.completedLectures}/{completion.totalLectures} lectures completed
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--primary-light)' }}>
                    {Math.round(completion.completionPercentage)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${completion.completionPercentage}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Subjects → Chapters → Lectures */}
      <div className="space-y-4">
        {subjects.map((subject, si) => {
          const subChapters = chapters.filter(c => String(c.subject) === String(subject._id));
          return (
            <motion.div key={subject._id} className="glass-card overflow-hidden"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.06 }}>
              {/* Subject Row */}
              <button
                className="w-full flex items-center gap-3 p-5 text-left"
                onClick={() => setExpanded(e => ({ ...e, [subject._id]: !e[subject._id] }))}>
                <motion.div animate={{ rotate: expanded[subject._id] ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                </motion.div>
                <div className="flex-1">
                  <p className="font-semibold">{subject.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {subChapters.length} chapters
                  </p>
                </div>
              </button>

              <AnimatePresence>
                {expanded[subject._id] && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden">
                    {subChapters.map((chapter, ci) => {
                      const chapLectures = lectures.filter(l => String(l.chapter) === String(chapter._id)).sort((a, b) => a.order - b.order);
                      return (
                        <div key={chapter._id} className="border-t" style={{ borderColor: 'var(--bg-border)' }}>
                          <button className="w-full flex items-center gap-3 px-8 py-3 text-left"
                            style={{ background: 'rgba(124,58,237,0.03)' }}
                            onClick={() => setExpanded(e => ({ ...e, [chapter._id]: !e[chapter._id] }))}>
                            <motion.div animate={{ rotate: expanded[chapter._id] ? 90 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                            </motion.div>
                            <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>
                              {chapter.title}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {chapLectures.filter(l => getLectureStatus(l) === 'completed').length}/{chapLectures.length} done
                            </span>
                          </button>

                          <AnimatePresence>
                            {expanded[chapter._id] && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                className="overflow-hidden">
                                {chapLectures.map((lecture, li) => {
                                  const status = getLectureStatus(lecture);
                                  const p = progressMap[lecture._id];
                                  const isLocked = lecture.isLocked;
                                  return (
                                    <div key={lecture._id} className="border-t" style={{ borderColor: 'rgba(42,42,58,0.4)' }}>
                                      {isLocked ? (
                                        <div className="flex items-center gap-4 px-12 py-4"
                                          style={{ background: 'rgba(0,0,0,0.1)', opacity: 0.6 }}>
                                          <Lock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{lecture.title}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Locked by instructor</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <Link href={`/student/lecture/${lecture._id}`}>
                                          <motion.div className="flex items-center gap-4 px-12 py-4 cursor-pointer transition-all"
                                            style={{ background: status === 'in-progress' ? 'rgba(124,58,237,0.05)' : 'rgba(0,0,0,0.1)' }}
                                            whileHover={{ background: 'rgba(124,58,237,0.08)' }}>
                                            {/* Icon */}
                                            <div className="shrink-0">
                                              {status === 'completed' ? (
                                                <CheckCircle size={18} style={{ color: '#10b981' }} />
                                              ) : status === 'in-progress' ? (
                                                <PlayCircle size={18} style={{ color: '#7c3aed' }} />
                                              ) : (
                                                <PlayCircle size={18} style={{ color: 'var(--text-muted)' }} />
                                              )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium truncate">{lecture.title}</p>
                                              <div className="flex items-center gap-3 mt-1">
                                                {lecture.duration > 0 && (
                                                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                                    <Clock size={10} />{formatDuration(lecture.duration)}
                                                  </span>
                                                )}
                                                {p && (
                                                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                                    <BarChart2 size={10} />{Math.round(p.watchPercentage)}% watched
                                                  </span>
                                                )}
                                              </div>
                                              {p && !p.isCompleted && p.currentTime > 0 && (
                                                <div className="mt-2 progress-bar" style={{ height: '3px' }}>
                                                  <div className="progress-fill" style={{ width: `${p.watchPercentage}%` }} />
                                                </div>
                                              )}
                                            </div>

                                            {/* Resume/Start Badge */}
                                            <div className="shrink-0">
                                              {status === 'completed' ? (
                                                <span className="badge badge-success text-xs">Done</span>
                                              ) : status === 'in-progress' ? (
                                                <span className="badge badge-primary text-xs">Resume</span>
                                              ) : (
                                                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                              )}
                                            </div>
                                          </motion.div>
                                        </Link>
                                      )}
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
