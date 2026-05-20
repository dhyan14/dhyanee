const mongoose = require('mongoose');

const sessionTrackingSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

  // Session timing
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // total session seconds

  // Focus metrics
  focusScore: { type: Number, default: 100 },        // 0-100
  totalFocusedTime: { type: Number, default: 0 },    // seconds
  totalDistractedTime: { type: Number, default: 0 }, // seconds
  distractionCount: { type: Number, default: 0 },
  tabSwitchCount: { type: Number, default: 0 },

  // Attention tracking
  faceDetectionRate: { type: Number, default: 100 }, // % of time face was detected
  avgAttentionScore: { type: Number, default: 100 },

  // Status
  isActive: { type: Boolean, default: true },
  webcamEnabled: { type: Boolean, default: false },

  // Current state (updated in realtime)
  currentVideoTime: { type: Number, default: 0 },
  currentFocusScore: { type: Number, default: 100 },
  isOnline: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
});

sessionTrackingSchema.pre('save', function (next) {
  if (this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  // Calculate focus score
  const total = this.totalFocusedTime + this.totalDistractedTime;
  if (total > 0) {
    let score = (this.totalFocusedTime / total) * 100;
    score -= this.tabSwitchCount * 2;
    score -= this.distractionCount * 3;
    this.focusScore = Math.max(0, Math.min(100, Math.round(score)));
  }
  next();
});

module.exports = mongoose.model('SessionTracking', sessionTrackingSchema);
