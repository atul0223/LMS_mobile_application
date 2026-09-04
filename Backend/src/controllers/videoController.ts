import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs-extra";
import { getVideoDuration, compressVideo } from "../utils/videoEncoding.ts";
import { uploadVideoToCloudinary, buildSignedVideoUrl, destroyVideo, SIGNED_URL_TTL_SECONDS } from "../utils/cloudinaryUploader.ts";
import Video from "../models/videoModel.ts";
import Course from "../models/courseModel.ts";
import asyncHandler from "../utils/asyncHandler.ts";

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

    try {
        // 1. Calculate duration and size from the raw uploaded disk asset
        const rawDurationSeconds = await getVideoDuration(tempInputFile);
        const fileSizeBytes = req.file.size;

        let finalInputFile = tempInputFile;
        const maxSizeBytes = 95 * 1024 * 1024; // 95 MB threshold

        if (fileSizeBytes > maxSizeBytes) {
            console.log(`Video size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds limit. Compressing to <95MB...`);
            const compressedFilePath = `${tempInputFile}-compressed.mp4`;
            await compressVideo(tempInputFile, compressedFilePath, rawDurationSeconds, 95);

            // Swap reference to compressed file and delete original
            finalInputFile = compressedFilePath;
            await cleanup(tempInputFile);
        }

        const durationFormatted = `${Math.floor(rawDurationSeconds / 60)}m ${Math.round(rawDurationSeconds % 60)}s`;
        const sizeFormatted = `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

        // 2. Upload video directly to Cloudinary (which handles HLS eager transformation)
        const result = await uploadVideoToCloudinary(finalInputFile, videoId);
        uploadedPublicId = result.public_id;

        // 3. Scrub temporary disk fingerprints instantly
        await cleanup(finalInputFile);

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

        return res.status(500).json({ error: 'Adaptive processing or database record index creation failed.' });
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
