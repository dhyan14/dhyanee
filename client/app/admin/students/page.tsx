'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, BookOpen, ToggleLeft, ToggleRight, ChevronDown, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrollModal, setEnrollModal] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState('');

  const fetchData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([api.get('/admin/students'), api.get('/courses')]);
      setStudents(sRes.data.students);
      setCourses(cRes.data.courses);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = async (student: any) => {
    try {
      await api.put(`/admin/students/${student._id}/toggle`);
      toast.success(`Student ${student.isActive ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleEnroll = async () => {
    if (!selectedCourse) return toast.error('Select a course');
    try {
      await api.post('/admin/enroll', { studentId: enrollModal._id, courseId: selectedCourse });
      toast.success('Student enrolled!');
      setEnrollModal(null); setSelectedCourse(''); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Enroll failed'); }
  };

  const handleUnenroll = async (studentId: string, courseId: string) => {
    try {
      await api.delete('/admin/enroll', { data: { studentId, courseId } });
      toast.success('Unenrolled'); fetchData();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title text-3xl">Students</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage student accounts and course enrollments
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="input-field pl-9 w-64" placeholder="Search students..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Enrolled Courses</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, i) => (
                <motion.tr key={student._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: 'var(--gradient-primary)' }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{student.name}</span>
                    </div>
                  </td>
                  <td>{student.email}</td>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      {student.enrolledCourses?.slice(0, 2).map((c: any) => (
                        <span key={c._id} className="badge badge-info text-xs">{c.title?.substring(0, 15)}</span>
                      ))}
                      {student.enrolledCourses?.length > 2 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{student.enrolledCourses.length - 2} more</span>
                      )}
                      {student.enrolledCourses?.length === 0 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not enrolled</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${student.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-xs">{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEnrollModal(student)}
                        className="p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors" title="Manage Enrollment">
                        <BookOpen size={14} style={{ color: 'var(--primary-light)' }} />
                      </button>
                      <button onClick={() => toggleActive(student)}
                        className="p-1.5 rounded-lg transition-colors"
                        title={student.isActive ? 'Deactivate' : 'Activate'}>
                        {student.isActive
                          ? <ToggleRight size={16} style={{ color: '#10b981' }} />
                          : <ToggleLeft size={16} style={{ color: '#6b6888' }} />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Modal */}
      <AnimatePresence>
        {enrollModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setEnrollModal(null); }}>
            <motion.div className="glass-card w-full max-w-md p-6"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Manage Enrollments</h3>
                <button onClick={() => setEnrollModal(null)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Student: <strong>{enrollModal.name}</strong>
              </p>

              {/* Current enrollments */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Current Enrollments</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {enrollModal.enrolledCourses?.length === 0
                    ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No courses enrolled</p>
                    : enrollModal.enrolledCourses?.map((c: any) => (
                      <div key={c._id} className="flex items-center justify-between p-2 rounded-lg"
                        style={{ background: 'rgba(124,58,237,0.08)' }}>
                        <span className="text-sm">{c.title}</span>
                        <button onClick={() => handleUnenroll(enrollModal._id, c._id)}
                          className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Enroll in new course */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Enroll in Course</p>
                <select className="input-field mb-3" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <option value="">Select a course...</option>
                  {courses.filter(c => !enrollModal.enrolledCourses?.some((ec: any) => ec._id === c._id))
                    .map((c: any) => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
                <button className="btn-primary w-full justify-center" onClick={handleEnroll}>
                  <UserPlus size={16} /> Enroll Student
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
