import mongoose, { Document } from 'mongoose';

export interface ICourse {
    _id?: mongoose.Types.ObjectId | string;
    name: string;
    courseDescription?: string;
    price?: number;
    enrolledStudentCount?: number;
    backgroundPic?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type CourseDocument = ICourse & Document;

const courseSchema = new mongoose.Schema<ICourse>({
    name: {
        type: String,
        required: true
    },
    courseDescription: {
        type: String
    },
    price: {
        type: Number,
        max: 50000
    },
    enrolledStudentCount: {
        type: Number,
        default: 0
    },
    backgroundPic: {
        type: String,
    }
}, {
    timestamps: true
});

const Course = mongoose.model<ICourse>('Course', courseSchema);
export default Course;