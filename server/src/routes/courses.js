const express = require('express');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadThumbnail } = require('../middleware/upload');

const router = express.Router();

// ─── COURSES ────────────────────────────────────────────────────────────────

// GET all courses (public preview for admin, filtered for students)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isPublished: true };
    const courses = await Course.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single course with full tree
router.get('/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate('createdBy', 'name');
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const subjects = await Subject.find({ course: course._id }).sort('order');
    const chapters = await Chapter.find({ course: course._id }).sort('order');
    const lectures = await Lecture.find({ course: course._id }).sort('order');

    res.json({ success: true, course, subjects, chapters, lectures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create course (admin)
router.post('/', protect, adminOnly, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, category, instructor } = req.body;
    const course = await Course.create({
      title, description, category, instructor,
      thumbnail: req.file ? req.file.path : '',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update course (admin)
router.put('/:courseId', protect, adminOnly, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.thumbnail = req.file.path;
    const course = await Course.findByIdAndUpdate(req.params.courseId, updates, { new: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE course (admin)
router.delete('/:courseId', protect, adminOnly, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.courseId);
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── SUBJECTS ───────────────────────────────────────────────────────────────

router.get('/:courseId/subjects', protect, async (req, res) => {
  try {
    const subjects = await Subject.find({ course: req.params.courseId }).sort('order');
    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:courseId/subjects', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const subject = await Subject.create({ title, description, order, course: req.params.courseId });
    res.status(201).json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/subjects/:subjectId', protect, adminOnly, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.subjectId, req.body, { new: true });
    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/subjects/:subjectId', protect, adminOnly, async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.subjectId);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CHAPTERS ───────────────────────────────────────────────────────────────

router.post('/subjects/:subjectId/chapters', protect, adminOnly, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    const { title, description, order } = req.body;
    const chapter = await Chapter.create({
      title, description, order,
      subject: subject._id,
      course: subject.course,
    });
    res.status(201).json({ success: true, chapter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chapters/:chapterId', protect, adminOnly, async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndUpdate(req.params.chapterId, req.body, { new: true });
    res.json({ success: true, chapter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/chapters/:chapterId', protect, adminOnly, async (req, res) => {
  try {
    await Chapter.findByIdAndDelete(req.params.chapterId);
    res.json({ success: true, message: 'Chapter deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── LECTURES ────────────────────────────────────────────────────────────────

router.post('/chapters/:chapterId/lectures', protect, adminOnly, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    const { title, description, youtubeUrl, duration, order, isPublished, isLocked, requiresPreviousCompletion } = req.body;
    const lecture = await Lecture.create({
      title, description, youtubeUrl,
      youtubeId: '', // auto-extracted in pre-save
      duration: Number(duration) || 0,
      order: Number(order) || 0,
      isPublished: isPublished === 'true' || isPublished === true,
      isLocked: isLocked === 'true' || isLocked === true,
      requiresPreviousCompletion: requiresPreviousCompletion === 'true',
      thumbnail: req.file ? req.file.path : '',
      chapter: chapter._id,
      subject: chapter.subject,
      course: chapter.course,
    });
    res.status(201).json({ success: true, lecture });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/lectures/:lectureId', protect, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId)
      .populate('chapter', 'title')
      .populate('subject', 'title')
      .populate('course', 'title');
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
    res.json({ success: true, lecture });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/lectures/:lectureId', protect, adminOnly, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.thumbnail = req.file.path;
    const lecture = await Lecture.findByIdAndUpdate(req.params.lectureId, updates, { new: true, runValidators: true });
    res.json({ success: true, lecture });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/lectures/:lectureId', protect, adminOnly, async (req, res) => {
  try {
    await Lecture.findByIdAndDelete(req.params.lectureId);
    res.json({ success: true, message: 'Lecture deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder lectures
router.post('/lectures/reorder', protect, adminOnly, async (req, res) => {
  try {
    const { orders } = req.body; // [{ lectureId, order }]
    await Promise.all(orders.map(({ lectureId, order }) =>
      Lecture.findByIdAndUpdate(lectureId, { order })
    ));
    res.json({ success: true, message: 'Lectures reordered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
