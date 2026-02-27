import express from 'express';
import { createOffer, getOffers, respondToOffer } from '../controllers/offerController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, authorize('brand'), createOffer);
router.get('/', protect, getOffers);
router.put('/:id', protect, authorize('creator'), respondToOffer);

export default router;
