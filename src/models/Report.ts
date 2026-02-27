import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
    reporter: mongoose.Types.ObjectId;
    reportedUser?: mongoose.Types.ObjectId;
    reportedItem?: string; // ID of the item (e.g., message, post)
    itemType: 'user' | 'message' | 'gig' | 'other';
    reason: string;
    description?: string;
    status: 'pending' | 'resolved' | 'dismissed';
    createdAt: Date;
    updatedAt: Date;
}

const reportSchema: Schema = new Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reportedItem: {
        type: String
    },
    itemType: {
        type: String,
        enum: ['user', 'message', 'gig', 'other'],
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

export default mongoose.model<IReport>('Report', reportSchema);
