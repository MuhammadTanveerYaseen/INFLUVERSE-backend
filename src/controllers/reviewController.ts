import { Request, Response } from 'express';
import Review from '../models/Review';
import Order from '../models/Order';
import CreatorProfile from '../models/CreatorProfile';
import BrandProfile from '../models/BrandProfile';

// @desc    Create a new Review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req: Request | any, res: Response) => {
    try {
        const { orderId, rating, comment } = req.body;
        const userId = req.user._id || req.user.id;
        const userRole = req.user.role;

        if (userRole !== 'brand' && userRole !== 'creator') {
            return res.status(403).json({ message: 'Only brands or creators can leave reviews' });
        }

        // 1. Verify Order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // 2. Check Permissions
        const userIdStr = userId.toString();
        const isBrand = order.brand.toString() === userIdStr;
        const isCreator = order.creator.toString() === userIdStr;

        if (!isBrand && !isCreator) {
            return res.status(403).json({ message: 'Not authorized to review this order' });
        }

        const reviewerRole = isBrand ? 'brand' : 'creator';

        if (order.status !== 'approved' && order.status !== 'delivered') {
            return res.status(400).json({ message: 'Order must be completed before reviewing' });
        }

        // 4. Check if already reviewed
        const existingReview = await Review.findOne({
            order: orderId, reviewerRole
        });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this order' });
        }

        // 5. Create Review
        const review = await Review.create({
            order: orderId,
            brand: order.brand,
            creator: order.creator,
            reviewerRole,
            rating,
            comment,
        });

        // 6. Update Stats
        if (reviewerRole === 'brand') {
            // Update Creator's Rating
            const statsRes = await Review.aggregate([
                { $match: { creator: order.creator, reviewerRole: 'brand' } },
                { $group: { _id: '$creator', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);

            if (statsRes.length > 0) {
                const creatorProfile = await CreatorProfile.findOne({ user: order.creator });
                if (creatorProfile) {
                    creatorProfile.stats.rating = statsRes[0].avgRating;
                    creatorProfile.stats.reviewCount = statsRes[0].count;
                    await creatorProfile.save();
                }
            }
        } else {
            // Update Brand's Rating
            const statsRes = await Review.aggregate([
                { $match: { brand: order.brand, reviewerRole: 'creator' } },
                { $group: { _id: '$brand', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);

            if (statsRes.length > 0) {
                await BrandProfile.findOneAndUpdate(
                    { user: order.brand },
                    {
                        rating: statsRes[0].avgRating,
                        reviewCount: statsRes[0].count
                    }
                );
            }
        }

        res.status(201).json(review);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get Reviews for a Creator
// @route   GET /api/creators/:id/reviews
// @access  Public
export const getCreatorReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ creator: req.params.id, reviewerRole: 'brand' })
            .populate('brand', 'username')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Reviews for a Brand
// @route   GET /api/brands/:id/reviews
// @access  Public
export const getBrandReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ brand: req.params.id, reviewerRole: 'creator' })
            .populate('creator', 'username')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
