import mongoose, { Document, Schema } from 'mongoose';

export interface ICreatorPackage {
    name: string; // Basic, Standard, Premium
    price: number;
    description: string;
    revisions: number;
    features: string[];
    addOns?: IAddOn[]; // Nested add-ons per package concept if needed, or global addOns
}

export interface IAddOn {
    name: string;
    price: number;
    description?: string;
}

export interface IPlatform {
    name: string;
    handle: string;
    url?: string;
    followers?: string;
    avatar?: string;
}

export interface ICreatorProfile extends Document {
    user: mongoose.Types.ObjectId;
    profileImage?: string; // Changed from profilePhoto to match frontend
    coverImage?: string; // Added for profile banner
    bio: string;
    categories: string[]; // Changed from single category string
    country: string;
    languages: string[];
    platforms: IPlatform[]; // Changed from string[]
    portfolio: string[]; // URLs of images/videos
    packages: ICreatorPackage[];
    // addOns: IAddOn[]; // Removed top-level addOns if frontend puts them in packages, but can keep for flexibility
    stats: {
        followerCount: number;
        engagementRate: number;
        completedOrders: number;
        rating: number; // Avg rating
        reviewCount: number;
    };
    verified: boolean;
    isFeatured: boolean;
    availability: string; // Changed from boolean available
    phoneNumber?: string;
    stripeConnectId?: string; // For payouts
    bankDetails?: {
        bankName: string;
        accountHolderName: string;
        accountNumber: string;
        routingNumber?: string; // or swift code
        swiftCode?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const addOnSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String }
});

const packageSchema = new Schema({
    name: { type: String, required: true }, // e.g., 'Basic', 'Standard'
    price: { type: Number, required: true },
    description: { type: String }, // Describes deliverables
    revisions: { type: Number, default: 1 },
    features: [String],
    addOns: [addOnSchema]
});

const platformSchema = new Schema({
    name: { type: String, required: true },
    handle: { type: String, required: true },
    url: { type: String },
    followers: { type: String },
    avatar: { type: String }
});

const creatorProfileSchema: Schema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    profileImage: { type: String },
    coverImage: { type: String },
    bio: { type: String },
    categories: [String],
    country: { type: String },
    languages: [String],
    platforms: [platformSchema],
    portfolio: [String],
    packages: [packageSchema],
    // addOns: [addOnSchema],
    stats: {
        followerCount: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
        completedOrders: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 }
    },
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    availability: {
        type: String,
        enum: ['available', 'busy', 'offline'],
        default: 'available'
    },
    phoneNumber: { type: String },
    stripeConnectId: { type: String },
    bankDetails: {
        bankName: { type: String },
        accountHolderName: { type: String },
        accountNumber: { type: String },
        routingNumber: { type: String },
        swiftCode: { type: String }
    }

}, {
    timestamps: true
});

export default mongoose.model<ICreatorProfile>('CreatorProfile', creatorProfileSchema);
