import mongoose, { Document, Schema } from 'mongoose';

export interface ICRMItem extends Document {
    type: string;
    platform: string;
    category: string;
    name: string;
    channelUrl: string;
    channelId: string;
    email: string;
    follower: string;
    phase: string;
    worker: string;
    outreachedDate?: Date;
    followUpDate?: Date;
    comments: string;
    createdAt: Date;
    updatedAt: Date;
}

const crmItemSchema: Schema = new Schema({
    type:     { type: String, default: '' },
    platform: { type: String, default: '' },
    category: { type: String, default: '' },
    name:     { type: String, default: '' },
    channelUrl: { type: String, default: '' },
    channelId:  { type: String, default: '' },
    email:    { type: String, default: '' },
    follower: { type: String, default: '' },
    phase: {
        type: String,
        enum: ['potential', 'outreached', 'interested', 'not_interested', 'on_hold', 'onboarded'],
        default: 'potential'
    },
    worker:         { type: String, default: '' },
    outreachedDate: { type: Date },
    followUpDate:   { type: Date },
    comments:       { type: String, default: '' }
}, {
    timestamps: true
});

export default mongoose.model<ICRMItem>('CRMItem', crmItemSchema);
