const mongoose = require('mongoose');

const attentionLogSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionTracking' },

  // Distraction event
  eventType: {
    type: String,
    enum: ['face_missing', 'looking_away', 'tab_switch', 'inactivity', 'face_covered', 'speed_abuse', 'devtools'],
    required: true,
  },
  duration: { type: Number, default: 0 }, // seconds of distraction
  videoTimestamp: { type: Number, default: 0 }, // when it happened in video

  // Snapshot
  snapshotUrl: { type: String, default: '' },
  snapshotPublicId: { type: String, default: '' },

  // Focus score at time of event
  focusScoreAtEvent: { type: Number, default: 0 },

  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AttentionLog', attentionLogSchema);
