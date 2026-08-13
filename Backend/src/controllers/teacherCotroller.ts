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
    await Course.create({
        owner: _id,
        name: courseName,
        courseDescription,
        price,
        backgroundPic
    })
    return res.status(200).json({ message: "course created sucessfully" });
}
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
    const course = await Course.findOne({ _id: courseId })
    if (!course) {
        return res.status(404).json({ message: "course not found" });
    }

    if (_id !== course.owner) {
        return res.status(401).json({ message: "course not owned by you" });
    }

    await Course.deleteOne({
        owner: _id,
        _id: courseId
    })
    return res.status(200).json({ message: "course deleted sucessfully" });
}
