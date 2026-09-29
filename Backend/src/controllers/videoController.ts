import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs-extra";
import cloudinary from "../config/cloudinary.ts";
import { getVideoDuration, compressVideo } from "../utils/videoEncoding.ts";
import { uploadVideoToCloudinary, buildSignedVideoUrl, destroyVideo, SIGNED_URL_TTL_SECONDS } from "../utils/cloudinaryUploader.ts";
import Video from "../models/videoModel.ts";
import Course from "../models/courseModel.ts";
import asyncHandler from "../utils/asyncHandler.ts";

export const getVideoUploadSignature = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized request' });
    }
    if (!user.isVerified) {
        return res.status(403).json({ error: 'user not verified' });
    }
    if (user.role !== 'teacher') {
        return res.status(403).json({ error: 'not a eligible role' });
    }

    const { courseId } = req.query;
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ error: 'valid courseId is required' });
    }

    const course = await Course.findById(courseId).select("owner");
    if (!course) {
        return res.status(404).json({ error: 'course not found' });
    }
    if (course.owner.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'course not owned by you' });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const publicId = crypto.randomUUID();
    const eager = 'sp_hd/m3u8';

    const paramsToSign = {
        eager,
        eager_async: 'true',
        public_id: publicId,
        timestamp,
        type: 'authenticated',
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
    );

    return res.status(200).json({
        signature,
        timestamp,
        publicId,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        eager,
    });
});

export const recordUploadedVideo = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized request' });
    }
    if (!user.isVerified) {
        return res.status(403).json({ error: 'user not verified' });
    }
    if (user.role !== 'teacher') {
        return res.status(403).json({ error: 'not a eligible role' });
    }

    const { title, description, courseId, orderInCourse, publicId, durationSeconds, fileSizeBytes } = req.body;

    if (!title || !courseId || orderInCourse === undefined || !publicId) {
        return res.status(400).json({ error: 'title, courseId, orderInCourse, and publicId are required.' });
    }

    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ error: 'invalid course id' });
    }

    const course = await Course.findById(courseId).select("owner");
    if (!course) {
        return res.status(404).json({ error: 'course not found' });
    }
    if (course.owner.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'course not owned by you' });
    }

    const parsedOrder = Number(orderInCourse);
    const parsedDuration = Number(durationSeconds) || 0;
    const parsedBytes = Number(fileSizeBytes) || 0;

    const durationFormatted = `${Math.floor(parsedDuration / 60)}m ${Math.round(parsedDuration % 60)}s`;
    const sizeFormatted = `${(parsedBytes / (1024 * 1024)).toFixed(2)} MB`;

    const savedVideoRecord = await Video.create({
        title,
        description: description || '',
        course: courseId,
        publicId,
        metadata: {
            videolength: durationFormatted,
            size: sizeFormatted,
            orderInCourse: parsedOrder,
        }
    });

    return res.status(201).json({
        success: true,
        message: 'Video fully processed, deployed, and database record indexed.',
        data: savedVideoRecord
    });
});

export const videoUpload = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const cleanup = async (...paths: string[]) => {
        await Promise.all(paths.map((p) => fs.remove(p).catch(() => { })));
    };

    if (!req.file) {
        return res.status(400).json({ error: 'Please submit a video file' });
    }

    // Extract textual multi-part form inputs provided alongside the file
    const { title, description, courseId, orderInCourse } = req.body;

    if (!title || !courseId || orderInCourse === undefined) {
        // Prevent orphaned file leaks on validation drop
        await cleanup(req.file.path);
        return res.status(400).json({ error: 'Video title, courseId, and orderInCourse are strictly required.' });
    }

    const user = req.user;
    if (!user) {
        await cleanup(req.file.path);
        return res.status(401).json({ error: 'Unauthorized request' });
    }
    if (!user.isVerified) {
        await cleanup(req.file.path);
        return res.status(403).json({ error: 'user not verified' });
    }
    if (user.role !== 'teacher') {
        await cleanup(req.file.path);
        return res.status(403).json({ error: 'not a eligible role' });
    }
    if (!mongoose.isValidObjectId(courseId)) {
        await cleanup(req.file.path);
        return res.status(400).json({ error: 'invalid course id' });
    }

    // The course must belong to the caller. Without this, any authenticated
    // teacher could attach videos to someone else's course.
    const course = await Course.findById(courseId).select("owner");
    if (!course) {
        await cleanup(req.file.path);
        return res.status(404).json({ error: 'course not found' });
    }
    if (course.owner.toString() !== user._id.toString()) {
        await cleanup(req.file.path);
        return res.status(403).json({ error: 'course not owned by you' });
    }

    const parsedOrder = Number(orderInCourse);
    if (!Number.isFinite(parsedOrder)) {
        await cleanup(req.file.path);
        return res.status(400).json({ error: 'orderInCourse must be a number' });
    }

    const tempInputFile = req.file.path;
    const videoId = crypto.randomUUID();
    let uploadedPublicId: string | null = null;
    let finalInputFile = tempInputFile;
    const compressedFilePath = `${tempInputFile}-compressed.mp4`;

    try {
        // 1. Calculate duration and size from the raw uploaded disk asset (with non-blocking timeout)
        let rawDurationSeconds = 0;
        try {
            rawDurationSeconds = await Promise.race([
                getVideoDuration(tempInputFile),
                new Promise<number>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
        } catch {
            // Local ffprobe not available or slow; Cloudinary will provide duration
        }

        const fileSizeBytes = req.file.size;
        let actualSizeBytes = fileSizeBytes;
        const maxSizeBytes = 95 * 1024 * 1024; // 95 MB threshold to fit under Cloudinary's 100MB free tier

        // If file exceeds 95MB, compress it down to under 95MB so Cloudinary free tier accepts it
        if (fileSizeBytes > maxSizeBytes) {
            console.log(`Video size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds 95MB limit. Compressing to fit Cloudinary free tier...`);
            try {
                const durationForCalc = rawDurationSeconds > 0 ? rawDurationSeconds : 600;
                await compressVideo(tempInputFile, compressedFilePath, durationForCalc, 92);

                const compStat = await fs.stat(compressedFilePath).catch(() => null);
                if (compStat && compStat.size > 0) {
                    finalInputFile = compressedFilePath;
                    actualSizeBytes = compStat.size;
                    console.log(`Video compressed successfully to ${(actualSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
                }
            } catch (compErr) {
                console.warn('Compression skipped or failed, uploading original file:', compErr);
                finalInputFile = tempInputFile;
            }
        }

        // 2. Upload video directly to Cloudinary (which handles HLS eager transformation)
        const result = await uploadVideoToCloudinary(finalInputFile, videoId);
        uploadedPublicId = result.public_id;

        // 3. Scrub temporary disk fingerprints instantly
        await cleanup(tempInputFile, compressedFilePath);

        const durationSeconds = rawDurationSeconds || result.duration || 0;
        const durationFormatted = `${Math.floor(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s`;
        const sizeFormatted = `${(actualSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

        // 4. Store the public_id only. Playback URLs are signed per request so
        //    access is re-checked rather than baked into a stored link.
        const savedVideoRecord = await Video.create({
            title,
            description,
            course: courseId,
            publicId: result.public_id,
            metadata: {
                videolength: durationFormatted, // e.g. "12m 42s"
                size: sizeFormatted,             // e.g. "42.50 MB"
                orderInCourse: parsedOrder
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Video fully processed, deployed, and database record indexed.',
            data: savedVideoRecord
        });

    } catch (error) {
        console.error('Workflow Pipeline Execution Failure:', error);

        await cleanup(tempInputFile, `${tempInputFile}-compressed.mp4`);

        // Roll back a remote asset that never got a database record, otherwise
        // it lingers on Cloudinary unreferenced.
        if (uploadedPublicId) {
            await destroyVideo(uploadedPublicId).catch(() => { });
        }

        const rawMsg = (error as any)?.message || '';
        let errorMsg = 'Video processing or storage failed.';
        if (rawMsg.includes('exceeds maximum allowed size') || rawMsg.includes('File size too large')) {
            errorMsg = 'Video file exceeds Cloudinary account limit (Free tier is 100MB). Upgrade your Cloudinary plan to Plus (up to 2GB) to upload videos over 100MB, or compress the video under 100MB.';
        } else if (rawMsg) {
            errorMsg = rawMsg;
        }

        return res.status(500).json({ error: errorMsg });
    }
});

/**
 * Confirms the caller may view a course's videos.
 *
 * Teachers reach their own courses; students must hold an enrollment. Returns
 * null when access is granted, or the response shape to send when it is not.
 */
const authorizeCourseAccess = async (
    req: Request,
    courseId: string
): Promise<{ status: number; message: string } | null> => {
    const user = req.user;
    if (!user) {
        return { status: 401, message: "please login first" };
    }
    if (!user.isVerified) {
        return { status: 403, message: "user not verified" };
    }
    if (!mongoose.isValidObjectId(courseId)) {
        return { status: 400, message: "invalid course id" };
    }

    const course = await Course.findById(courseId).select("owner");
    if (!course) {
        return { status: 404, message: "course not found" };
    }

    if (course.owner.toString() === user._id.toString()) {
        return null;
    }

    const enrolled = (user.enrolledCources || []).some(
        (id) => id.toString() === courseId.toString()
    );
    if (!enrolled) {
        return { status: 403, message: "purchase this course to access its videos" };
    }

    return null;
};

/** Lists a course's videos with signed playback URLs, gated on entitlement. */
export const getCourseVideos = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { courseId } = req.params;

    const denial = await authorizeCourseAccess(req, courseId as string);
    if (denial) {
        return res.status(denial.status).json({ message: denial.message });
    }

    const videos = await Video.find({ course: courseId })
        .sort({ "metadata.orderInCourse": 1, createdAt: 1 });

    const payload = videos.map((video) => {
        const { publicId, ...rest } = video.toObject();
        return {
            ...rest,
            url: buildSignedVideoUrl(publicId),
            urlExpiresInSeconds: SIGNED_URL_TTL_SECONDS
        };
    });

    return res.status(200).json({
        message: "Videos fetched successfully",
        videos: payload
    });
});

/** Returns a single video's signed playback URL, gated on entitlement. */
export const getVideoById = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        return res.status(400).json({ message: "invalid video id" });
    }

    const video = await Video.findById(videoId);
    if (!video || !video.course) {
        return res.status(404).json({ message: "video not found" });
    }

    const denial = await authorizeCourseAccess(req, video.course.toString());
    if (denial) {
        return res.status(denial.status).json({ message: denial.message });
    }

    const { publicId, ...rest } = video.toObject();
    return res.status(200).json({
        message: "Video fetched successfully",
        video: {
            ...rest,
            url: buildSignedVideoUrl(publicId),
            urlExpiresInSeconds: SIGNED_URL_TTL_SECONDS
        }
    });
});
