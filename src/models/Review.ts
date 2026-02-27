import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
    order: mongoose.Types.ObjectId;
    creator: mongoose.Types.ObjectId;
    brand: mongoose.Types.ObjectId;
    reviewerRole: 'brand' | 'creator';
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema: Schema = new Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewerRole: {
        type: String,
        enum: ['brand', 'creator'],
        required: true,
        default: 'brand'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Allow one review from brand and one from creator per order
reviewSchema.index({ order: 1, reviewerRole: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', reviewSchema);
