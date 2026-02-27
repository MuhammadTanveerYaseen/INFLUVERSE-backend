
import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
    user: mongoose.Types.ObjectId; // Who the money belongs to or who paid
    order?: mongoose.Types.ObjectId; // Related Order
    type: 'deposit' | 'earning' | 'payout' | 'refund';
    amount: number; // In cents or smallest unit
    currency: string;
    status: 'pending' | 'available' | 'completed' | 'failed' | 'processing';
    stripePaymentIntentId?: string;
    stripeTransferId?: string;
    description: string;
    availableAt?: Date; // When it becomes available for withdrawal
    createdAt: Date;
    updatedAt: Date;
}

const transactionSchema: Schema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    type: {
        type: String,
        enum: ['deposit', 'earning', 'payout', 'refund'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'usd'
    },
    status: {
        type: String,
        enum: ['pending', 'available', 'completed', 'failed', 'processing'],
        default: 'pending'
    },
    stripePaymentIntentId: { type: String },
    stripeTransferId: { type: String },
    description: { type: String },
    availableAt: { type: Date }
}, {
    timestamps: true
});

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
