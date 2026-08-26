import type { Request, Response } from "express";
import * as url from 'url';
import pkg from "uuid";
const { v4: uuidv4 } = pkg;
import path from "path";
import fs from "fs-extra";
import { encodeToHLS, getVideoDuration } from "../utils/videoEncoding.ts";
import { uploadDirectoryToB2 } from "../utils/b2uploader.ts";
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
    const videoId = uuidv4();
    const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
    const tempOutputDir = path.join(__dirname, `../tmp/hls-${videoId}`);

    try {
        // 1. Calculate duration and size from the raw uploaded disk asset
        const rawDurationSeconds = await getVideoDuration(tempInputFile);
        const fileSizeBytes = req.file.size;

        const durationFormatted = `${Math.floor(rawDurationSeconds / 60)}m ${Math.round(rawDurationSeconds % 60)}s`;
        const sizeFormatted = `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

        // 2. Encode local media into adaptive multi-bitrate HLS structure
        await encodeToHLS(tempInputFile, tempOutputDir);

        // 3. Upload generated HLS folders directly onto Backblaze B2
        await uploadDirectoryToB2(tempOutputDir, videoId);

        // 4. Scrub temporary disk fingerprints instantly
        await fs.remove(tempInputFile);
        await fs.remove(tempOutputDir);

        const masterPlaylistUrl = `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT}/${videoId}/master.m3u8`;

        // 5. Commit record data payload straight to MongoDB database
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
        await fs.remove(tempOutputDir).catch(() => { });

        return res.status(500).json({ error: 'Adaptive processing or database record index creation failed.' });
    }
};
