const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  youtubeUrl: { type: String, required: true },
  youtubeId: { type: String, required: true },
  thumbnail: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // seconds
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  requiresPreviousCompletion: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Extract YouTube ID from URL
lectureSchema.pre('save', function (next) {
  if (this.youtubeUrl) {
    const match = this.youtubeUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    if (match) this.youtubeId = match[1];
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lecture', lectureSchema);
