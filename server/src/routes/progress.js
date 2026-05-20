const express = require('express');
const VideoProgress = require('../models/VideoProgress');
const Lecture = require('../models/Lecture');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET progress for a lecture
router.get('/:lectureId', protect, async (req, res) => {
  try {
    const progress = await VideoProgress.findOne({
      student: req.user._id,
      lecture: req.params.lectureId,
    });
    res.json({ success: true, progress: progress || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all progress for a student in a course
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const progressList = await VideoProgress.find({
      student: req.user._id,
      course: req.params.courseId,
    }).populate('lecture', 'title duration order');
    res.json({ success: true, progressList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST/PUT save progress (upsert)
router.post('/:lectureId', protect, async (req, res) => {
  try {
    const { currentTime, maxWatched, duration, totalWatchTime } = req.body;
    const lecture = await Lecture.findById(req.params.lectureId);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

    let progress = await VideoProgress.findOne({
      student: req.user._id,
      lecture: req.params.lectureId,
    });

    if (!progress) {
      progress = new VideoProgress({
        student: req.user._id,
        lecture: req.params.lectureId,
        course: lecture.course,
        duration: duration || lecture.duration,
      });
    }

    // Only update maxWatched if the new value is greater
    if (typeof maxWatched === 'number' && maxWatched > progress.maxWatched) {
      progress.maxWatched = maxWatched;
    }
    if (typeof currentTime === 'number') progress.currentTime = currentTime;
    if (typeof duration === 'number' && duration > 0) progress.duration = duration;
    if (typeof totalWatchTime === 'number') progress.totalWatchTime += totalWatchTime;

    await progress.save();

    // Emit real-time progress update
    if (req.io) {
      req.io.to('admin-room').emit('student:progress', {
        studentId: req.user._id,
        lectureId: req.params.lectureId,
        currentTime: progress.currentTime,
        watchPercentage: progress.watchPercentage,
        isCompleted: progress.isCompleted,
      });
    }

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET overall course completion for a student
router.get('/completion/:courseId', protect, async (req, res) => {
  try {
    const lectures = await Lecture.find({ course: req.params.courseId, isPublished: true });
    const progressList = await VideoProgress.find({
      student: req.user._id,
      course: req.params.courseId,
    });

    const totalLectures = lectures.length;
    const completedLectures = progressList.filter((p) => p.isCompleted).length;
    const avgWatchPercentage =
      progressList.length > 0
        ? progressList.reduce((sum, p) => sum + p.watchPercentage, 0) / progressList.length
        : 0;

    res.json({
      success: true,
      totalLectures,
      completedLectures,
      completionPercentage: totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0,
      avgWatchPercentage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
