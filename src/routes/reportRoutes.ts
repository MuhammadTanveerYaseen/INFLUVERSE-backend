import express from 'express';
import { createReport } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createReport);

export default router;
