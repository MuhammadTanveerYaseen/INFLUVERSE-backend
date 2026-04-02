import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
    offer?: mongoose.Types.ObjectId;
    brand: mongoose.Types.ObjectId;
    creator: mongoose.Types.ObjectId;
    price: number;
    platformFee: number;
    totalAmount: number;
    status: 'pending_payment' | 'active' | 'delivered' | 'revision' | 'approved' | 'disputed' | 'cancelled';
    deliverables: {
        files: string[]; // URLs
        notes?: string;
        submittedAt?: Date;
    }[];
    disputeReason?: string;
    paid: boolean;
    paymentIntentId?: string;
    completedAt?: Date;
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
        required: true,
        index: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    price: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending_payment', 'active', 'delivered', 'revision', 'approved', 'disputed', 'cancelled'],
        default: 'pending_payment'
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
    payoutDueDate: Date,
    payoutReleased: { type: Boolean, default: false },
    packageDetails: { type: Schema.Types.Mixed }
}, {
    timestamps: true
});

export default mongoose.model<IOrder>('Order', orderSchema);
