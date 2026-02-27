import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
    autoBanThreshold: number; // Max identical messages per hour
    bannedKeywords: string[];
    maintenanceMode: boolean;
    globalNotice: string;
    noticeActive: boolean;
    platformFeePercentage: number;
    payoutHoldingPeriod: number;
}

const platformSettingsSchema: Schema = new Schema({
    autoBanThreshold: { type: Number, default: 50 },
    bannedKeywords: { type: [String], default: [] },
    maintenanceMode: { type: Boolean, default: false },
    globalNotice: { type: String, default: "" },
    noticeActive: { type: Boolean, default: false },
    platformFeePercentage: { type: Number, default: 15 },
    payoutHoldingPeriod: { type: Number, default: 7 }
}, {
    timestamps: true
});

// Singleton pattern helper (optional usage for getting THE settings doc)
// We generally expect only 1 document in this collection.

export default mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);
