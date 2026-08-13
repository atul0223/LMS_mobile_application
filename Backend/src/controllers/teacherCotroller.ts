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
        name: courseName,
        courseDescription,
        price,
        backgroundPic
    })
}