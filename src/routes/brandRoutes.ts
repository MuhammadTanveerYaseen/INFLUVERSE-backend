import express from 'express';
import { registerBrand, getBrandProfile, updateBrandProfile, getBrandDashboardStats, toggleFavoriteCreator, getFavoriteCreators } from '../controllers/brandController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerBrand);
router.get('/profile', protect, authorize('brand'), getBrandProfile);
router.put('/profile', protect, authorize('brand'), updateBrandProfile);
router.get('/dashboard', protect, authorize('brand'), getBrandDashboardStats);

router.post('/favorites/:creatorId', protect, authorize('brand'), toggleFavoriteCreator);
router.get('/favorites', protect, authorize('brand'), getFavoriteCreators);

export default router;
