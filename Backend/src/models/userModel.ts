import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
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
        }]
    },
    otp: {
        code: {
            type: String,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now // Fix: No parentheses here, so it executes dynamically on creation
        }
    },
    role: {
        type: String,
        enum: ["teacher", "student"],
        required: true
    },
    blockedUsers: [{
        type: mongoose.Types.ObjectId
    }],
    enrolledCources: [{
        type: mongoose.Types.ObjectId,

    }],
    lifeTimeSpentMoney: {
        type: Number,
        default: 0

    },
   
}, {
    timestamps: true
})
const User = mongoose.model('User', userSchema)
export default User;