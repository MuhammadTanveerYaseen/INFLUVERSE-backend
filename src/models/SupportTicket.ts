import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportTicket extends Document {
    user: mongoose.Types.ObjectId;
    subject: string;
    description: string;
    type: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    adminResponse?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, default: 'general' },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    adminResponse: { type: String, default: "" }
}, { timestamps: true });

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
