import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
    participants: mongoose.Types.ObjectId[];
    order?: mongoose.Types.ObjectId; // Optional: Link to specific order
    offer?: mongoose.Types.ObjectId; // Optional: Link to offer
    contextType: 'order' | 'offer' | 'general';
    isReadOnly: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const chatSchema: Schema = new Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
    },
    contextType: {
        type: String,
        enum: ['order', 'offer', 'general'],
        default: 'general'
    },
    isReadOnly: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model<IChat>('Chat', chatSchema);
