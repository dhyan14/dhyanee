const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

  // Core progress tracking
  currentTime: { type: Number, default: 0 },       // Last watched timestamp (seconds)
  maxWatched: { type: Number, default: 0 },          // Maximum timestamp ever reached (seconds)
  duration: { type: Number, default: 0 },            // Total lecture duration
  watchPercentage: { type: Number, default: 0 },     // maxWatched / duration * 100
  isCompleted: { type: Boolean, default: false },

  // Session data
  totalWatchTime: { type: Number, default: 0 },      // Total time watched (seconds)
  sessionCount: { type: Number, default: 1 },

  // Timestamps
  startedAt: { type: Date, default: Date.now },
  lastWatchedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

// Compound unique index - one progress record per student per lecture
videoProgressSchema.index({ student: 1, lecture: 1 }, { unique: true });

videoProgressSchema.pre('save', function (next) {
  this.lastWatchedAt = Date.now();
  if (this.duration > 0) {
    this.watchPercentage = Math.min(100, (this.maxWatched / this.duration) * 100);
    if (this.watchPercentage >= 90 && !this.isCompleted) {
      this.isCompleted = true;
      this.completedAt = Date.now();
    }
  }
  next();
});

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
