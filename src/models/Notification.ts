import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId; // Optional, system messages have no sender
    type: 'offer' | 'order' | 'message' | 'system' | 'payment';
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['offer', 'order', 'message', 'system', 'payment'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
