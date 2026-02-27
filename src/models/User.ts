import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    role: 'user' | 'brand' | 'creator' | 'admin';
    status: 'active' | 'suspended' | 'pending' | 'rejected';
    isVerified: boolean;
    rejectionReason?: string;
    profile?: any; // To be refined
    matchPassword: (enteredPassword: string) => Promise<boolean>;
    createdAt: Date;
    updatedAt: Date;
    verificationToken?: string;
    verificationTokenExpires?: Date;
    otp?: string;
    otpExpires?: Date;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
}

const userSchema: Schema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'brand', 'creator', 'admin'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending', 'rejected'],
        default: 'active',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    rejectionReason: {
        type: String,
        default: '',
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    otp: String,
    otpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, {
    timestamps: true,
});

userSchema.pre<IUser>('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    if (this.password) {
        this.password = await bcrypt.hash(this.password, salt);
    }
});

userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
