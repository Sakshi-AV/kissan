const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/auth');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Check if Cloudinary is configured
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Multer disk storage for local upload or temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'kissan-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// @route   POST /api/upload
// @desc    Upload single image
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'kissan_cart',
        });
        // Remove local temporary file
        fs.unlinkSync(req.file.path);
        return res.json({
          success: true,
          imageUrl: result.secure_url,
          message: 'Image uploaded to Cloudinary',
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudErr.message);
      }
    }

    // Local fallback
    const localUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      imageUrl: localUrl,
      message: 'Image uploaded locally',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images (up to 5)
// @access  Private
router.post('/multiple', protect, upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one image' });
    }

    const imageUrls = [];

    for (const file of req.files) {
      if (isCloudinaryConfigured) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'kissan_cart',
          });
          fs.unlinkSync(file.path);
          imageUrls.push(result.secure_url);
          continue;
        } catch (err) {
          console.warn('Cloudinary failed for one item:', err.message);
        }
      }
      imageUrls.push(`/uploads/${file.filename}`);
    }

    res.json({
      success: true,
      imageUrls,
      message: `${imageUrls.length} image(s) uploaded successfully`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
