import express from 'express';
import { createReview, getCreatorReviews, getBrandReviews } from '../controllers/reviewController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createReview); // Internal check in controller handles roles
router.get('/creator/:id', getCreatorReviews);
router.get('/brand/:id', getBrandReviews);

export default router;
