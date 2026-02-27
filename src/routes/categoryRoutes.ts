import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(getCategories) // Public
    .post(protect, authorize('admin'), createCategory); // Admin Only

router.route('/:id')
    .put(protect, authorize('admin'), updateCategory) // Admin Only
    .delete(protect, authorize('admin'), deleteCategory); // Admin Only

export default router;
