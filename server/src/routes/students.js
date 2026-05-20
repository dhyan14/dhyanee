const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const VideoProgress = require('../models/VideoProgress');
const SessionTracking = require('../models/SessionTracking');
const { protect, studentOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/students/courses - enrolled courses
router.get('/courses', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'enrolledCourses',
      match: { isPublished: true },
    });
    res.json({ success: true, courses: user.enrolledCourses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/progress/summary - overall progress summary
router.get('/progress/summary', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('enrolledCourses', '_id title');
    const progressList = await VideoProgress.find({ student: req.user._id });

    const totalWatchTime = progressList.reduce((s, p) => s + p.totalWatchTime, 0);
    const completedLectures = progressList.filter(p => p.isCompleted).length;

    // Focus history from last sessions
    const recentSessions = await SessionTracking.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('lecture', 'title');

    const avgFocusScore = recentSessions.length > 0
      ? Math.round(recentSessions.reduce((s, sess) => s + sess.focusScore, 0) / recentSessions.length)
      : 100;

    res.json({
      success: true,
      summary: {
        enrolledCourses: user.enrolledCourses.length,
        completedLectures,
        totalWatchHours: Math.round(totalWatchTime / 3600 * 10) / 10,
        avgFocusScore,
      },
      recentSessions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/profile - student profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('enrolledCourses', 'title thumbnail');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
