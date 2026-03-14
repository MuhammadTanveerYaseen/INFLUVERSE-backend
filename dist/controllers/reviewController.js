"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrandReviews = exports.getCreatorReviews = exports.createReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Order_1 = __importDefault(require("../models/Order"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
const BrandProfile_1 = __importDefault(require("../models/BrandProfile"));
// @desc    Create a new Review
// @route   POST /api/reviews
// @access  Private
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, rating, comment } = req.body;
        const userId = req.user._id || req.user.id;
        const userRole = req.user.role;
        if (userRole !== 'brand' && userRole !== 'creator') {
            return res.status(403).json({ message: 'Only brands or creators can leave reviews' });
        }
        // 1. Verify Order
        const order = yield Order_1.default.findById(orderId);
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
        const existingReview = yield Review_1.default.findOne({
            order: orderId, reviewerRole
        });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this order' });
        }
        // 5. Create Review
        const review = yield Review_1.default.create({
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
            const statsRes = yield Review_1.default.aggregate([
                { $match: { creator: order.creator, reviewerRole: 'brand' } },
                { $group: { _id: '$creator', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);
            if (statsRes.length > 0) {
                const creatorProfile = yield CreatorProfile_1.default.findOne({ user: order.creator });
                if (creatorProfile) {
                    creatorProfile.stats.rating = statsRes[0].avgRating;
                    creatorProfile.stats.reviewCount = statsRes[0].count;
                    yield creatorProfile.save();
                }
            }
        }
        else {
            // Update Brand's Rating
            const statsRes = yield Review_1.default.aggregate([
                { $match: { brand: order.brand, reviewerRole: 'creator' } },
                { $group: { _id: '$brand', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);
            if (statsRes.length > 0) {
                yield BrandProfile_1.default.findOneAndUpdate({ user: order.brand }, {
                    rating: statsRes[0].avgRating,
                    reviewCount: statsRes[0].count
                });
            }
        }
        res.status(201).json(review);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createReview = createReview;
// @desc    Get Reviews for a Creator
// @route   GET /api/creators/:id/reviews
// @access  Public
const getCreatorReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield Review_1.default.find({ creator: req.params.id, reviewerRole: 'brand' })
            .populate('brand', 'username')
            .sort({ createdAt: -1 });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCreatorReviews = getCreatorReviews;
// @desc    Get Reviews for a Brand
// @route   GET /api/brands/:id/reviews
// @access  Public
const getBrandReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield Review_1.default.find({ brand: req.params.id, reviewerRole: 'creator' })
            .populate('creator', 'username')
            .sort({ createdAt: -1 });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBrandReviews = getBrandReviews;
