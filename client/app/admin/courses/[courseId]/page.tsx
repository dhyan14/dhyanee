'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Eye, EyeOff, Lock, Unlock, Video, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{ type: string; parentId?: string; item?: any } | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setCourse(res.data.course);
      setSubjects(res.data.subjects);
      setChapters(res.data.chapters);
      setLectures(res.data.lectures);
    } catch { toast.error('Failed to load course'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [courseId]);

  const openModal = (type: string, parentId?: string, item?: any) => {
    setModal({ type, parentId, item });
    if (item) {
      setForm({ title: item.title, description: item.description || '', youtubeUrl: item.youtubeUrl || '', duration: item.duration || 0, order: item.order || 0, isPublished: item.isPublished ?? false, isLocked: item.isLocked ?? false });
    } else { setForm({ title: '', description: '', youtubeUrl: '', duration: 0, order: 0, isPublished: false, isLocked: false }); }
  };

  const handleSave = async () => {
    if (!form.title) return toast.error('Title required');
    try {
      if (modal?.type === 'subject') {
        modal.item
          ? await api.put(`/courses/subjects/${modal.item._id}`, form)
          : await api.post(`/courses/${courseId}/subjects`, form);
      } else if (modal?.type === 'chapter') {
        modal.item
          ? await api.put(`/courses/chapters/${modal.item._id}`, form)
          : await api.post(`/courses/subjects/${modal.parentId}/chapters`, form);
      } else if (modal?.type === 'lecture') {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]: any) => fd.append(k, String(v)));
        modal.item
          ? await api.put(`/courses/lectures/${modal.item._id}`, fd)
          : await api.post(`/courses/chapters/${modal.parentId}/lectures`, fd);
      }
      toast.success(`${modal?.type} ${modal?.item ? 'updated' : 'created'}!`);
      setModal(null); fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    try {
      await api.delete(`/courses/${type}s/${id}`);
      toast.success(`${type} deleted`);
      fetchAll();
    } catch { toast.error('Failed to delete'); }
  };

  const toggleLecture = async (lecture: any, field: 'isPublished' | 'isLocked') => {
    try {
      await api.put(`/courses/lectures/${lecture._id}`, { [field]: !lecture[field] });
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="page-container"><div className="skeleton h-96 rounded-2xl" /></div>;

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="section-title text-3xl">{course?.title}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{course?.description || 'Manage subjects, chapters and lectures'}</p>
      </div>

      {/* Add Subject */}
      <div className="flex justify-end mb-6">
        <button className="btn-primary" onClick={() => openModal('subject')}><Plus size={18} /> Add Subject</button>
      </div>

      {/* Subjects Tree */}
      <div className="space-y-4">
        {subjects.map((subject, si) => (
          <motion.div key={subject._id} className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.06 }}>
            {/* Subject Header */}
            <div className="flex items-center gap-3 p-4 cursor-pointer border-b"
              style={{ borderColor: 'var(--bg-border)' }}
              onClick={() => setExpanded(e => ({ ...e, [subject._id]: !e[subject._id] }))}>
              <motion.div animate={{ rotate: expanded[subject._id] ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </motion.div>
              <span className="font-semibold flex-1">{subject.title}</span>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => openModal('chapter', subject._id)}>
                  <Plus size={13} /> Chapter
                </button>
                <button onClick={() => openModal('subject', undefined, subject)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <Edit2 size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={() => handleDelete('subject', subject._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Chapters */}
            <AnimatePresence>
              {expanded[subject._id] && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  {chapters.filter(c => c.subject === subject._id || c.subject?._id === subject._id || String(c.subject) === String(subject._id)).map((chapter, ci) => (
                    <div key={chapter._id} className="border-b" style={{ borderColor: 'var(--bg-border)' }}>
                      {/* Chapter Header */}
                      <div className="flex items-center gap-3 px-6 py-3 cursor-pointer"
                        style={{ background: 'rgba(124,58,237,0.03)' }}
                        onClick={() => setExpanded(e => ({ ...e, [chapter._id]: !e[chapter._id] }))}>
                        <motion.div animate={{ rotate: expanded[chapter._id] ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                        </motion.div>
                        <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>{chapter.title}</span>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <button className="btn-secondary text-xs py-1 px-2" onClick={() => openModal('lecture', chapter._id)}>
                            <Plus size={12} /> Lecture
                          </button>
                          <button onClick={() => openModal('chapter', subject._id, chapter)} className="p-1 rounded hover:bg-white/5">
                            <Edit2 size={13} style={{ color: 'var(--text-muted)' }} />
                          </button>
                          <button onClick={() => handleDelete('chapter', chapter._id)} className="p-1 rounded text-red-400 hover:bg-red-400/10">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Lectures */}
                      <AnimatePresence>
                        {expanded[chapter._id] && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            {lectures.filter(l => String(l.chapter) === String(chapter._id)).sort((a, b) => a.order - b.order).map((lecture, li) => (
                              <div key={lecture._id} className="flex items-center gap-3 px-10 py-3 border-t"
                                style={{ borderColor: 'rgba(42,42,58,0.4)', background: 'rgba(0,0,0,0.1)' }}>
                                <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{lecture.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Video size={12} style={{ color: '#ef4444' }} />
                                    <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{lecture.youtubeId}</span>
                                    {lecture.duration > 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>• {Math.floor(lecture.duration / 60)}m</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => toggleLecture(lecture, 'isPublished')} title={lecture.isPublished ? 'Unpublish' : 'Publish'}
                                    className={`p-1 rounded ${lecture.isPublished ? 'text-green-400' : 'text-gray-500'} hover:bg-white/5`}>
                                    {lecture.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                                  </button>
                                  <button onClick={() => toggleLecture(lecture, 'isLocked')} title={lecture.isLocked ? 'Unlock' : 'Lock'}
                                    className={`p-1 rounded ${lecture.isLocked ? 'text-amber-400' : 'text-gray-500'} hover:bg-white/5`}>
                                    {lecture.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                  </button>
                                  <button onClick={() => openModal('lecture', chapter._id, lecture)} className="p-1 rounded hover:bg-white/5">
                                    <Edit2 size={14} style={{ color: 'var(--text-muted)' }} />
                                  </button>
                                  <button onClick={() => handleDelete('lecture', lecture._id)} className="p-1 rounded text-red-400 hover:bg-red-400/10">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {lectures.filter(l => String(l.chapter) === String(chapter._id)).length === 0 && (
                              <div className="px-10 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No lectures yet</div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  {chapters.filter(c => String(c.subject) === String(subject._id)).length === 0 && (
                    <div className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No chapters yet — add one above</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        {subjects.length === 0 && (
          <div className="glass-card p-16 text-center">
            <p className="text-lg font-medium mb-2">No subjects yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Start building your course structure</p>
            <button className="btn-primary" onClick={() => openModal('subject')}><Plus size={18} /> Add Subject</button>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div className="glass-card w-full max-w-lg p-6"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3 className="text-xl font-bold mb-6 capitalize">{modal.item ? 'Edit' : 'Add'} {modal.type}</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                {modal.type === 'lecture' && (<>
                  <div>
                    <label className="label">YouTube URL *</label>
                    <input className="input-field" placeholder="https://www.youtube.com/watch?v=..." value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Duration (seconds)</label>
                      <input type="number" className="input-field" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Order</label>
                      <input type="number" className="input-field" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Published</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isLocked} onChange={e => setForm({ ...form, isLocked: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Locked</span>
                    </label>
                  </div>
                </>)}
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn-primary flex-1 justify-center" onClick={handleSave}>{modal.item ? 'Update' : 'Create'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
