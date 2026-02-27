import express from 'express';
import { uploadMedia } from '../controllers/uploadController';
import { upload } from '../config/cloudinary';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Publicly accessible if needed, or protected
// We'll protect it for now to ensure only logged in users can upload
router.post('/', protect, upload.single('file'), uploadMedia);

export default router;
