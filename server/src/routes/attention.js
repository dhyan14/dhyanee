const express = require('express');
const cloudinary = require('../services/cloudinary');
const AttentionLog = require('../models/AttentionLog');
const SessionTracking = require('../models/SessionTracking');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST start session
router.post('/session/start', protect, async (req, res) => {
  try {
    const { lectureId, courseId, webcamEnabled } = req.body;

    // Close any open sessions for this lecture
    await SessionTracking.updateMany(
      { student: req.user._id, lecture: lectureId, isActive: true },
      { isActive: false, endTime: new Date() }
    );

    const session = await SessionTracking.create({
      student: req.user._id,
      lecture: lectureId,
      course: courseId,
      webcamEnabled: webcamEnabled || false,
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update session (realtime focus data)
router.put('/session/:sessionId', protect, async (req, res) => {
  try {
    const {
      focusScore, totalFocusedTime, totalDistractedTime,
      distractionCount, tabSwitchCount, faceDetectionRate,
      currentVideoTime, isActive,
    } = req.body;

    const updates = {};
    if (typeof focusScore === 'number') updates.focusScore = focusScore;
    if (typeof totalFocusedTime === 'number') updates.totalFocusedTime = totalFocusedTime;
    if (typeof totalDistractedTime === 'number') updates.totalDistractedTime = totalDistractedTime;
    if (typeof distractionCount === 'number') updates.distractionCount = distractionCount;
    if (typeof tabSwitchCount === 'number') updates.tabSwitchCount = tabSwitchCount;
    if (typeof faceDetectionRate === 'number') updates.faceDetectionRate = faceDetectionRate;
    if (typeof currentVideoTime === 'number') updates.currentVideoTime = currentVideoTime;
    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
      if (!isActive) updates.endTime = new Date();
    }

    const session = await SessionTracking.findByIdAndUpdate(req.params.sessionId, updates, { new: true });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST log distraction event + upload snapshot
router.post('/distraction', protect, async (req, res) => {
  try {
    const { lectureId, courseId, sessionId, eventType, duration, videoTimestamp, focusScore, snapshotBase64 } = req.body;

    let snapshotUrl = '';
    let snapshotPublicId = '';

    // Upload snapshot to Cloudinary if provided
    if (snapshotBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(snapshotBase64, {
          folder: 'dhyanee/snapshots',
          transformation: [{ width: 320, height: 240, crop: 'fill' }],
        });
        snapshotUrl = uploadResult.secure_url;
        snapshotPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Snapshot upload failed:', uploadError.message);
      }
    }

    const log = await AttentionLog.create({
      student: req.user._id,
      lecture: lectureId,
      course: courseId,
      session: sessionId,
      eventType,
      duration: duration || 0,
      videoTimestamp: videoTimestamp || 0,
      focusScoreAtEvent: focusScore || 0,
      snapshotUrl,
      snapshotPublicId,
    });

    // Emit distraction alert to admin
    if (req.io) {
      req.io.to('admin-room').emit('student:distraction', {
        studentId: req.user._id,
        studentName: req.user.name,
        lectureId,
        eventType,
        snapshotUrl,
        focusScore,
        timestamp: new Date(),
      });
    }

    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET distraction logs for admin
router.get('/logs', protect, async (req, res) => {
  try {
    const { studentId, lectureId, limit = 50 } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (lectureId) filter.lecture = lectureId;

    const logs = await AttentionLog.find(filter)
      .populate('student', 'name email')
      .populate('lecture', 'title')
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET attention logs for a student's session
router.get('/session/:sessionId/logs', protect, async (req, res) => {
  try {
    const logs = await AttentionLog.find({ session: req.params.sessionId }).sort('timestamp');
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
