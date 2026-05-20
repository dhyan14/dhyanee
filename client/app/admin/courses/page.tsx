'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, ChevronDown, ChevronRight, Edit2, Trash2, Eye, EyeOff, Lock, Unlock, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import Link from 'next/link';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'General', instructor: '' });

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data.courses);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleSave = async () => {
    if (!form.title) return toast.error('Course title is required');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (editCourse) {
        await api.put(`/courses/${editCourse._id}`, fd);
        toast.success('Course updated');
      } else {
        await api.post('/courses', fd);
        toast.success('Course created!');
      }
      setShowModal(false); setEditCourse(null); setForm({ title: '', description: '', category: 'General', instructor: '' });
      fetchCourses();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course and all its content?')) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Course deleted');
      fetchCourses();
    } catch { toast.error('Failed to delete'); }
  };

  const togglePublish = async (course: any) => {
    try {
      await api.put(`/courses/${course._id}`, { isPublished: !course.isPublished });
      toast.success(course.isPublished ? 'Course unpublished' : 'Course published');
      fetchCourses();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title text-3xl">Courses</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage all courses, subjects & lectures</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
          className="btn-primary">
          <Plus size={18} /> New Course
        </motion.button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No courses yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Create your first course to get started</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Create Course</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <motion.div key={course._id} className="glass-card overflow-hidden"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              {/* Thumbnail */}
              <div className="h-36 relative" style={{
                background: course.thumbnail
                  ? `url(${course.thumbnail}) center/cover`
                  : 'var(--gradient-primary)'
              }}>
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`badge ${course.isPublished ? 'badge-success' : 'badge-warning'}`}>
                    {course.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <p className="text-white font-bold text-lg leading-tight">{course.title}</p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                  {course.description || 'No description'}
                </p>
                <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  <span className="badge badge-info">{course.category}</span>
                  <span>•</span>
                  <span>{course.enrolledStudents?.length || 0} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/courses/${course._id}`} className="btn-secondary text-sm py-2 flex-1 justify-center">
                    <ChevronRight size={14} /> Manage
                  </Link>
                  <button onClick={() => togglePublish(course)} title={course.isPublished ? 'Unpublish' : 'Publish'}
                    className="p-2 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {course.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => { setEditCourse(course); setForm({ title: course.title, description: course.description || '', category: course.category || 'General', instructor: course.instructor || '' }); setShowModal(true); }}
                    className="p-2 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(course._id)} className="p-2 rounded-lg transition-colors text-red-400 hover:bg-red-400/10">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setEditCourse(null); } }}>
            <motion.div className="glass-card w-full max-w-md p-6"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3 className="text-xl font-bold mb-6">{editCourse ? 'Edit Course' : 'Create New Course'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Course Title *</label>
                  <input className="input-field" placeholder="e.g. Full Stack Development"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input-field resize-none" rows={3} placeholder="Course description..."
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category</label>
                    <input className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Instructor</label>
                    <input className="input-field" value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-ghost flex-1" onClick={() => { setShowModal(false); setEditCourse(null); }}>Cancel</button>
                <button className="btn-primary flex-1 justify-center" onClick={handleSave}>{editCourse ? 'Update' : 'Create'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
