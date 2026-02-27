import mongoose, { Document, Schema } from 'mongoose';

export interface ICRMItem extends Document {
    type: string;
    name: string;
    email: string;
    platform: string;
    phase: string;
    worker: string;
    outreachedDate?: Date;
    followUpDate?: Date;
    comments: string;
    createdAt: Date;
    updatedAt: Date;
}

const crmItemSchema: Schema = new Schema({
    type: { type: String, default: 'Creator' },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    platform: { type: String, default: '' },
    phase: {
        type: String,
        enum: ['potential', 'outreached', 'interested', 'not_interested', 'on_hold', 'onboarded'],
        default: 'potential'
    },
    worker: { type: String, default: '' },
    outreachedDate: { type: Date },
    followUpDate: { type: Date },
    comments: { type: String, default: '' }
}, {
    timestamps: true
});

export default mongoose.model<ICRMItem>('CRMItem', crmItemSchema);
