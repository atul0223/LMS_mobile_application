import type { Request, Response } from "express";
import crypto from "crypto";
import fs from "fs-extra";
import { getVideoDuration } from "../utils/videoEncoding.ts";
import { uploadVideoToCloudinary } from "../utils/cloudinaryUploader.ts";
import Video from "../models/videoModel.ts";

export const videoUpload = async (req: Request, res: Response): Promise<any> => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please submit a video file' });
    }

    // Extract textual multi-part form inputs provided alongside the file
    const { title, description, courseId, orderInCourse } = req.body;

    if (!title || !courseId || orderInCourse === undefined) {
        // Prevent orphaned file leaks on validation drop
        await fs.remove(req.file.path).catch(() => { });
        return res.status(400).json({ error: 'Video title, courseId, and orderInCourse are strictly required.' });
    }

    const tempInputFile = req.file.path;
    const videoId = crypto.randomUUID();

    try {
        // 1. Calculate duration and size from the raw uploaded disk asset
        const rawDurationSeconds = await getVideoDuration(tempInputFile);
        const fileSizeBytes = req.file.size;

        const durationFormatted = `${Math.floor(rawDurationSeconds / 60)}m ${Math.round(rawDurationSeconds % 60)}s`;
        const sizeFormatted = `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

        // 2. Upload video directly to Cloudinary (which handles HLS eager transformation)
        const result = await uploadVideoToCloudinary(tempInputFile, videoId);

        // 3. Scrub temporary disk fingerprints instantly
        await fs.remove(tempInputFile);

        // Generate the m3u8 URL based on Cloudinary streaming profile
        // Cloudinary URL format for streaming profile sp_hd:
        const masterPlaylistUrl = result.secure_url.replace('/upload/', '/upload/sp_hd/').replace(/\.[^/.]+$/, ".m3u8");

        // 4. Commit record data payload straight to MongoDB database
        const savedVideoRecord = await Video.create({
            title,
            description,
            course: courseId,
            url: masterPlaylistUrl,
            metadata: {
                videolength: durationFormatted, // e.g. "12m 42s"
                size: sizeFormatted,             // e.g. "42.50 MB"
                orderInCourse: Number(orderInCourse)
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Video fully processed, deployed, and database record indexed.',
            data: savedVideoRecord
        });

    } catch (error) {
        console.error('Workflow Pipeline Execution Failure:', error);

        await fs.remove(tempInputFile).catch(() => { });

        return res.status(500).json({ error: 'Adaptive processing or database record index creation failed.' });
    }
};
