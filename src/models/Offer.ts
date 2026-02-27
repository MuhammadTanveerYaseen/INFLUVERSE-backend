import mongoose, { Document, Schema } from 'mongoose';

export interface IOffer extends Document {
    brand: mongoose.Types.ObjectId;
    creator: mongoose.Types.ObjectId;
    price: number;
    deliverables: string; // description of work
    deadline: Date;
    durationDays: number; // Store original duration
    usageRights?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    counterOffer?: {
        price: number;
        message: string;
    };
    chat?: mongoose.Types.ObjectId; // Link to the chat where this offer occurred
    createdAt: Date;
    updatedAt: Date;
}

const offerSchema: Schema = new Schema({
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    price: { type: Number, required: true },
    deliverables: { type: String, required: true },
    deadline: { type: Date, required: true },
    durationDays: { type: Number, default: 3 }, // Store original duration intent
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
    }
}, {
    timestamps: true
});

export default mongoose.model<IOffer>('Offer', offerSchema);
