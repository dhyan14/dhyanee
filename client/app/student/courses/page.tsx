'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, ChevronRight, BookOpen, Clock, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/courses').then(r => setCourses(r.data.courses)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="section-title text-3xl">My Courses</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>All your enrolled courses</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-2">No courses yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Contact your admin to get enrolled</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <motion.div key={course._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link href={`/student/courses/${course._id}`}>
                <div className="glass-card-hover overflow-hidden cursor-pointer h-full">
                  <div className="h-36 relative" style={{
                    background: course.thumbnail ? `url(${course.thumbnail}) center/cover` : 'var(--gradient-primary)'
                  }}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle size={44} className="text-white opacity-80" />
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="badge badge-info">{course.category || 'Course'}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold mb-1">{course.title}</h3>
                    <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{course.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{course.instructor || 'Dhyanee'}</span>
                      <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--primary-light)' }}>
                        Open <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
