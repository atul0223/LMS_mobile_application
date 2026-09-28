import mongoose, { Document } from 'mongoose';

export interface IPasswordSchema {
    password: string;
    attempts?: number;
    lastPasswords?: string[];
    attemptPasswords?: string[];
    /** Password auth is refused until this moment passes. */
    lockedUntil?: Date | null;
}

export interface IOtpSchema {
    /** SHA-256 of the delivered code — the plaintext is never stored. */
    code?: string | null;
    createdAt?: Date;
    /** Failed verification attempts against the current code. */
    attempts?: number;
    /** Earliest moment a replacement OTP may be issued. */
    nextSendAllowedAt?: Date | null;
}

export interface IUser {
    _id?: mongoose.Types.ObjectId | string;
    email: string;
    fullName?: string;
    username: string;
    isVerified?: boolean;
    passwordSchema?: IPasswordSchema;
    otp?: IOtpSchema | null;
    role: "teacher" | "student";
    blockedUsers?: mongoose.Types.ObjectId[];
    enrolledCources?: mongoose.Types.ObjectId[];
    lifeTimeSpentMoney?: number;
    provider?: "custom" | "google";
    profilePic?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type UserDocument = IUser & Document;

const userSchema = new mongoose.Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    fullName: {
        type: String,
    },
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    isVerified: Boolean,
    passwordSchema: {
        password: {
            type: String,
            required: true
        },
        attempts: {
            type: Number,
            default: 0
        },
        lastPasswords: [{
            type: String
        }],
        attemptPasswords: [{
            type: String
        }],
        lockedUntil: {
            type: Date,
            default: null
        }
    },
    otp: {
        code: {
            type: String,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        attempts: {
            type: Number,
            default: 0
        },
        nextSendAllowedAt: {
            type: Date,
            default: null
        }
    },
    role: {
        type: String,
        enum: ["teacher", "student"],
        required: true
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    enrolledCources: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    lifeTimeSpentMoney: {
        type: Number,
        default: 0
    },
    provider: {
        type: String,
        enum: ["custom", "google"]
    },
    profilePic: {
        type: String,
    }
}, {
    timestamps: true
});

// Guard against legacy database documents where otp was stored as a number, string, or null
userSchema.pre('init', function (doc: any) {
    if (doc && (typeof doc.otp === 'number' || typeof doc.otp === 'string' || doc.otp === null)) {
        doc.otp = {
            code: typeof doc.otp === 'string' || typeof doc.otp === 'number' ? String(doc.otp) : null,
            createdAt: new Date(),
            attempts: 0,
            nextSendAllowedAt: null
        };
    }
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;