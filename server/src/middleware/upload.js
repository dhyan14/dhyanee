const cloudinary = require('../services/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const thumbnailStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dhyanee/thumbnails',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 640, height: 360, crop: 'fill' }],
  },
});

const snapshotStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dhyanee/snapshots',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 320, height: 240, crop: 'fill' }],
  },
});

const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadSnapshot = multer({
  storage: snapshotStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { uploadThumbnail, uploadSnapshot };
