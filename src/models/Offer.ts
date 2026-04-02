import mongoose, { Document, Schema } from 'mongoose';

export interface IOffer extends Document {
    brand: mongoose.Types.ObjectId;
    creator: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId; // Who initiated the offer
    price: number;
    deliverables: string; // description of work
    usageRights?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    counterOffer?: {
        price: number;
        message: string;
    };
    chat?: mongoose.Types.ObjectId; // Link to the chat where this offer occurred
    order?: mongoose.Types.ObjectId; // Link to the created order
    paid?: boolean; // Track payment status on offer
    packageDetails?: any;
    createdAt: Date;
    updatedAt: Date;
}

const offerSchema: Schema = new Schema({
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    price: { type: Number, required: true },
    deliverables: { type: String, required: true },
    usageRights: { type: String },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'countered'],
        default: 'pending'
    },
    counterOffer: {
        price: Number,
        message: String
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    paid: { type: Boolean, default: false },
    packageDetails: { type: Schema.Types.Mixed }
}, {
    timestamps: true
});

export default mongoose.model<IOffer>('Offer', offerSchema);
