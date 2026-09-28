import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Course from '../models/courseModel.ts';
import Video from '../models/videoModel.ts';
import User from '../models/userModel.ts';
import { destroyVideo } from '../utils/cloudinaryUploader.ts';
import asyncHandler from '../utils/asyncHandler.ts';

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { _id, role, isVerified } = req.user;
    const { courseName, courseDescription, price, backgroundPic } = req.body;
    if ([courseName, courseDescription].some((f) => typeof f !== "string" || !f.trim())) {
        return res.status(400).json({ message: "fields required" });
    }

    if (!_id || !role || isVerified === undefined) {
        return res.status(400).json({ message: "fields required" });
    }
    if (!isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }
    if (role !== "teacher") {
        return res.status(403).json({ message: "not a eligible role" });
    }
    if (price !== undefined && (typeof price !== "number" || !Number.isFinite(price) || price < 0)) {
        return res.status(400).json({ message: "price must be a non-negative number" });
    }
    const course = await Course.create({
        owner: _id,
        name: courseName,
        courseDescription,
        price,
        backgroundPic
    });
    return res.status(201).json({ message: "course created sucessfully", course });
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { _id, role, isVerified } = req.user;
    if (!isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }
    if (role !== "teacher") {
        return res.status(403).json({ message: "not a eligible role" });
    }
    const { courseId } = req.body;
    if (!courseId) {
        return res.status(400).json({ message: "course id required" });
    }
    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ message: "invalid course id" });
    }
    const course = await Course.findOne({ _id: courseId });
    if (!course) {
        return res.status(404).json({ message: "course not found" });
    }

    if (_id.toString() !== course.owner.toString()) {
        return res.status(403).json({ message: "course not owned by you" });
    }

    // Clean up all video records and remote Cloudinary assets
    const courseVideos = await Video.find({ course: courseId }).select("publicId");
    for (const vid of courseVideos) {
        if (vid.publicId) {
            await destroyVideo(vid.publicId).catch(() => {});
        }
    }
    await Video.deleteMany({ course: courseId });

    // Remove deleted course from enrolled courses of users
    await User.updateMany(
        { enrolledCources: courseId },
        { $pull: { enrolledCources: courseId } }
    ).catch(() => {});

    await Course.deleteOne({
        owner: _id,
        _id: courseId
    });
    return res.status(200).json({ message: "course deleted sucessfully" });
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const user = req?.user;
    if (!req.user || user === undefined) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    // Role and verification are checked before the lookup so an ineligible
    // caller cannot probe which course ids exist.
    if (!user.isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }
    if (user.role !== "teacher") {
        return res.status(403).json({ message: "not a eligible role" });
    }

    const { courseId, newDescription, newName, newPrice } = req.body;
    if (!courseId) {
        return res.status(400).json({ message: "course id required" });
    }
    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ message: "invalid course id" });
    }
    if (!newDescription && !newName && newPrice === undefined) {
        return res.status(400).json({ message: "please give something to update" });
    }
    if (newPrice !== undefined && (typeof newPrice !== "number" || !Number.isFinite(newPrice) || newPrice < 0)) {
        return res.status(400).json({ message: "price must be a non-negative number" });
    }

    const course = await Course.findOne({ _id: courseId });
    if (!course) {
        return res.status(404).json({ message: "course not found" });
    }

    if (user._id.toString() !== course.owner.toString()) {
        return res.status(403).json({ message: "course not owned by you" });
    }

    if (newDescription !== undefined) course.courseDescription = newDescription;
    if (newName !== undefined) course.name = newName;
    if (newPrice !== undefined) course.price = newPrice;

    await course.save();
    return res.status(200).json({
        message: "course updated successfully",
        course
    });
});

export const getTeacherCourses = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { _id, role, isVerified } = req.user;
    if (!isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }
    if (role !== "teacher") {
        return res.status(403).json({ message: "not a eligible role" });
    }

    const courses = await Course.find({ owner: _id }).sort({ createdAt: -1 });
    return res.status(200).json({
        message: "Courses retrieved successfully",
        courses
    });
});
