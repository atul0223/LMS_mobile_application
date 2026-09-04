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
    /**
     * Cloudinary public_id of the uploaded asset. Playback URLs are signed on
     * demand from this rather than stored, so access always re-checks
     * entitlement instead of relying on a URL handed out earlier.
     */
    publicId: string;
    metadata?: IVideoMetadata;
    createdAt?: Date;
    updatedAt?: Date;
}

export type VideoDocument = IVideo & Document;

const videoSchema = new mongoose.Schema<IVideo>({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    publicId: {
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

videoSchema.index({ course: 1, "metadata.orderInCourse": 1 });

const Video = mongoose.model<IVideo>('Video', videoSchema);
export default Video;