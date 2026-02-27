import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    chat: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    attachments: string[]; // URLs of files
    offer?: mongoose.Types.ObjectId; // Optional: Link to an offer if this message is an offer
    isSystemMessage: boolean; // For system alerts (e.g., "Order Cancelled")
    readBy: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema: Schema = new Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    attachments: [String],
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
    },
    isSystemMessage: {
        type: Boolean,
        default: false
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

export default mongoose.model<IMessage>('Message', messageSchema);
