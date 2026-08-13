import mongoose, { Document } from 'mongoose';

export interface ITransaction {
    _id?: mongoose.Types.ObjectId | string;
    senderId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    recieverId: mongoose.Types.ObjectId;
    status: 'pending' | 'completed' | 'failed';
    createdAt?: Date;
    updatedAt?: Date;
}

export type TransactionDocument = ITransaction & Document;

const transactionSchema = new mongoose.Schema<ITransaction>({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    recieverId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        required: true,
        default: "pending"
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;