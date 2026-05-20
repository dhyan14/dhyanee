const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const VideoProgress = require('../models/VideoProgress');
const SessionTracking = require('../models/SessionTracking');
const AttentionLog = require('../models/AttentionLog');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes protected
router.use(protect, adminOnly);

// GET /api/admin/dashboard - stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalStudents,
      totalCourses,
      totalLectures,
      progressList,
      recentDistractions,
      activeSessions,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments(),
      Lecture.countDocuments(),
      VideoProgress.find().populate('student', 'name'),
      AttentionLog.find().sort({ timestamp: -1 }).limit(10).populate('student', 'name').populate('lecture', 'title'),
      SessionTracking.find({ isActive: true }).populate('student', 'name email avatar').populate('lecture', 'title'),
    ]);

    // Compute average focus score from active sessions
    const avgFocusScore = activeSessions.length > 0
      ? Math.round(activeSessions.reduce((sum, s) => sum + s.focusScore, 0) / activeSessions.length)
      : 0;

    // Total watch hours
    const totalWatchSeconds = progressList.reduce((sum, p) => sum + p.totalWatchTime, 0);
    const totalWatchHours = Math.round(totalWatchSeconds / 3600 * 10) / 10;

    // Avg completion
    const avgCompletion = progressList.length > 0
      ? Math.round(progressList.reduce((sum, p) => sum + p.watchPercentage, 0) / progressList.length)
      : 0;

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents: activeSessions.length,
        onlineStudents: activeSessions.filter(s => s.isOnline).length,
        totalCourses,
        totalLectures,
        avgFocusScore,
        totalWatchHours,
        avgCompletion,
      },
      recentDistractions,
      activeSessions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/students - all students
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .populate('enrolledCourses', 'title thumbnail')
      .sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/students/:studentId - student detail
router.get('/students/:studentId', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId).populate('enrolledCourses', 'title thumbnail');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const progressList = await VideoProgress.find({ student: student._id })
      .populate('lecture', 'title duration')
      .populate('course', 'title');

    const sessions = await SessionTracking.find({ student: student._id })
      .populate('lecture', 'title')
      .sort({ createdAt: -1 })
      .limit(20);

    const distractionLogs = await AttentionLog.find({ student: student._id })
      .sort({ timestamp: -1 })
      .limit(30);

    const avgFocus = sessions.length > 0
      ? Math.round(sessions.reduce((s, sess) => s + sess.focusScore, 0) / sessions.length)
      : 0;

    res.json({ success: true, student, progressList, sessions, distractionLogs, avgFocus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/enroll - enroll student in course
router.post('/enroll', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (!student.enrolledCourses.includes(courseId)) {
      student.enrolledCourses.push(courseId);
      await student.save({ validateBeforeSave: false });

      const course = await Course.findById(courseId);
      if (course && !course.enrolledStudents.includes(studentId)) {
        course.enrolledStudents.push(studentId);
        await course.save();
      }
    }

    res.json({ success: true, message: 'Student enrolled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/enroll - unenroll student
router.delete('/enroll', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    await User.findByIdAndUpdate(studentId, { $pull: { enrolledCourses: courseId } });
    await Course.findByIdAndUpdate(courseId, { $pull: { enrolledStudents: studentId } });
    res.json({ success: true, message: 'Student unenrolled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/students/:studentId/toggle - activate/deactivate
router.put('/students/:studentId/toggle', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    student.isActive = !student.isActive;
    await student.save({ validateBeforeSave: false });
    res.json({ success: true, isActive: student.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/monitoring - live monitoring data
router.get('/monitoring', async (req, res) => {
  try {
    const activeSessions = await SessionTracking.find({ isActive: true })
      .populate('student', 'name email avatar')
      .populate('lecture', 'title thumbnail')
      .populate('course', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, activeSessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics - progress analytics charts
router.get('/analytics', async (req, res) => {
  try {
    const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dailySessions = await SessionTracking.aggregate([
      { $match: { createdAt: { $gte: last7days } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sessions: { $sum: 1 },
          avgFocus: { $avg: '$focusScore' },
          totalWatchTime: { $sum: '$duration' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const courseCompletion = await Course.find().select('title').lean();
    const completionData = await Promise.all(
      courseCompletion.map(async (course) => {
        const lectures = await Lecture.countDocuments({ course: course._id });
        const completed = await VideoProgress.countDocuments({ course: course._id, isCompleted: true });
        return { course: course.title, completionRate: lectures > 0 ? Math.round((completed / lectures) * 100) : 0 };
      })
    );

    res.json({ success: true, dailySessions, courseCompletion: completionData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
