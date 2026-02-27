import mongoose, { Document, Schema } from 'mongoose';

export interface IBrandProfile extends Document {
    user: mongoose.Types.ObjectId; // Reference to User
    companyName: string;
    website?: string;
    logo?: string; // URL
    coverImage?: string; // Added for profile banner
    industry?: string;
    location?: string;
    rating: number; // Avg rating
    reviewCount: number;
    billingDetails?: {
        stripeCustomerId?: string;
        address?: string;
        city?: string;
        zip?: string;
        country?: string;
        taxId?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const brandProfileSchema: Schema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    companyName: { type: String, required: true },
    website: { type: String },
    logo: { type: String },
    coverImage: { type: String },
    industry: { type: String },
    location: { type: String },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    billingDetails: {
        stripeCustomerId: { type: String },
        address: { type: String },
        city: { type: String },
        zip: { type: String },
        country: { type: String },
        taxId: { type: String }
    }
}, {
    timestamps: true
});

export default mongoose.model<IBrandProfile>('BrandProfile', brandProfileSchema);
