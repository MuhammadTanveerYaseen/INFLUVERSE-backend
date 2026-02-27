import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
    offer?: mongoose.Types.ObjectId;
    brand: mongoose.Types.ObjectId;
    creator: mongoose.Types.ObjectId;
    price: number;
    platformFee: number;
    totalAmount: number;
    status: 'active' | 'delivered' | 'revision' | 'approved' | 'disputed' | 'cancelled';
    deliverables: {
        files: string[]; // URLs
        notes?: string;
        submittedAt?: Date;
    }[];
    disputeReason?: string;
    paid: boolean;
    paymentIntentId?: string;
    completedAt?: Date;
    deadline?: Date; // Correctly recalculated deadline
    payoutDueDate?: Date;
    payoutReleased?: boolean;
    packageDetails?: any;
    createdAt: Date;
    updatedAt: Date;
}

const orderSchema: Schema = new Schema({
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
    },
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
    platformFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['active', 'delivered', 'revision', 'approved', 'disputed', 'cancelled'],
        default: 'active'
    },
    deliverables: [{
        files: [String],
        notes: String,
        submittedAt: Date
    }],
    disputeReason: String,
    paid: { type: Boolean, default: false },
    paymentIntentId: String,
    completedAt: Date,
    deadline: Date,
    payoutDueDate: Date,
    payoutReleased: { type: Boolean, default: false },
    packageDetails: { type: Schema.Types.Mixed }
}, {
    timestamps: true
});

export default mongoose.model<IOrder>('Order', orderSchema);
