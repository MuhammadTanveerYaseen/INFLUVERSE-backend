import express from 'express';
import { registerCreator, getCreatorProfile, updateCreatorProfile, getCreators, getCreatorById, getCreatorDashboardStats, refreshSocialStats } from '../controllers/creatorController';
import { validateCreatorProfile } from '../validators/creatorValidator';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerCreator);
router.get('/profile', protect, authorize('creator'), getCreatorProfile);
router.put('/profile', protect, authorize('creator'), validateCreatorProfile, updateCreatorProfile);
router.get('/dashboard', protect, authorize('creator'), getCreatorDashboardStats);
router.post('/social-stats', protect, authorize('creator'), refreshSocialStats);
router.get('/', getCreators); // Public discovery: /api/creators/
router.get('/:id', getCreatorById); // Public profile: /api/creators/:id

export default router;
