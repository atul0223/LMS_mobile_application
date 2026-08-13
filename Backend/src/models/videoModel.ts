import mongoose, { Document } from 'mongoose';

export interface IVideoMetadata {
    videolength?: string;
    size?: string;
    orderInCourse?: number;
}

export interface IVideo {
    _id?: mongoose.Types.ObjectId | string;
    course?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    url: string;
    metadata?: IVideoMetadata;
    createdAt?: Date;
    updatedAt?: Date;
}

export type VideoDocument = IVideo & Document;

const videoSchema = new mongoose.Schema<IVideo>({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    metadata: {
        videolength: String,
        size: String,
        orderInCourse: Number
    }
}, {
    timestamps: true
});

const Video = mongoose.model<IVideo>('Video', videoSchema);
export default Video;