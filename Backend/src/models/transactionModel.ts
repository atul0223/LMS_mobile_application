import mongoose, { Document } from 'mongoose';

export interface ITransaction {
    _id?: mongoose.Types.ObjectId | string;
    senderId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    /** Stored path — retains the original spelling for existing documents. */
    recieverId: mongoose.Types.ObjectId;
    /** Schema alias for {@link ITransaction.recieverId}; prefer this in new code. */
    receiverId?: mongoose.Types.ObjectId;
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
    // The stored path keeps the original spelling so existing documents remain
    // readable; `receiverId` is a schema alias, so application code (and the
    // ITransaction interface) uses the corrected name. Renaming the stored path
    // would require migrating historical transaction records.
    recieverId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        alias: 'receiverId'
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