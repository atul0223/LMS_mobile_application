import type { Request, Response } from 'express';
import Course from '../models/courseModel.ts';

export const createCourse = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { _id, role, isVerified } = req.user;
    const { courseName, courseDescription, price, backgroundPic } = req.body;
    if ([courseName, courseDescription].some((f) => !f?.trim())) {
        return res.status(401).json({ message: "fields required" });
    }

    if (!_id || !role || isVerified === undefined) {
        return res.status(401).json({ message: "fields required" });
    }
    if (!isVerified) {
        return res.status(401).json({ message: "user not verified" });
    }
    if (role !== "teacher") {
        return res.status(401).json({ message: "not a eligible role" });
    }
    const course = await Course.create({
        owner: _id,
        name: courseName,
        courseDescription,
        price,
        backgroundPic
    });
    return res.status(200).json({ message: "course created sucessfully", course });
};

export const deleteCourse = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { _id, role, isVerified } = req.user;
    if (!isVerified) {
        return res.status(401).json({ message: "user not verified" });
    }
    if (role !== "teacher") {
        return res.status(401).json({ message: "not a eligible role" });
    }
    const { courseId } = req.body;
    if (!courseId) {
        return res.status(401).json({ message: "course id required" });
    }
    const course = await Course.findOne({ _id: courseId });
    if (!course) {
        return res.status(404).json({ message: "course not found" });
    }

    if (_id.toString() !== course.owner.toString()) {
        return res.status(401).json({ message: "course not owned by you" });
    }

    await Course.deleteOne({
        owner: _id,
        _id: courseId
    });
    return res.status(200).json({ message: "course deleted sucessfully" });
};

export const updateCourse = async (req: Request, res: Response) => {
    const user = req?.user;
    if (!req.user || user === undefined) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { courseId, newDescription, newName, newPrice } = req.body;
    const course = await Course.findOne({ _id: courseId });
    if (!course) {
        return res.status(404).json({ message: "course not found" });
    }

    if (user._id.toString() !== course.owner.toString()) {
        return res.status(401).json({ message: "course not owned by you" });
    }
    if (!user.isVerified) {
        return res.status(401).json({ message: "user not verified" });
    }
    if (user.role !== "teacher") {
        return res.status(401).json({ message: "not a eligible role" });
    }
    if (!newDescription && !newName && newPrice === undefined) {
        return res.status(401).json({ message: "please give something to update" });
    }

    if (newDescription !== undefined) course.courseDescription = newDescription;
    if (newName !== undefined) course.name = newName;
    if (newPrice !== undefined) course.price = newPrice;

    await course.save();
    return res.status(200).json({
        message: "course updated successfully",
        course
    });
};

export const getTeacherCourses = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    const { _id, role, isVerified } = req.user;
    if (!isVerified) {
        return res.status(401).json({ message: "user not verified" });
    }
    if (role !== "teacher") {
        return res.status(401).json({ message: "not a eligible role" });
    }

    try {
        const courses = await Course.find({ owner: _id }).sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Courses retrieved successfully",
            courses
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch teacher courses" });
    }
};
