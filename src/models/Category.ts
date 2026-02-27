import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    slug: string;
    icon: string; // Will store lucide-react icon name, e.g. "Monitor", "Shirt"
    description: string;
    isActive: boolean;
    gradientColors: string[];
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    icon: {
        type: String,
        required: true,
        default: 'LayoutGrid'
    },
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    gradientColors: {
        type: [String],
        default: ['#8E9FFE', '#BFAFFE']
    }
}, {
    timestamps: true
});

export default mongoose.model<ICategory>('Category', categorySchema);
