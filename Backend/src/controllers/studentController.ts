import type { Request, Response } from "express";
import mongoose from "mongoose";
import Course from "../models/courseModel.ts";
import Transaction from "../models/transactionModel.ts";
import User from "../models/userModel.ts";
import asyncHandler from "../utils/asyncHandler.ts";

/** Escapes regex metacharacters so user input is matched literally. */
const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Applies the enrollment and its side effects.
 *
 * The `$ne` guard makes the enrollment push idempotent, so a retry cannot
 * double-charge or double-count even outside a transaction.
 */
const applyEnrollment = async (
    userId: any,
    course: any,
    price: number,
    session: mongoose.ClientSession | null
) => {
    const options = session ? { session } : {};
    const enrollment = await User.updateOne(
        { _id: userId, enrolledCources: { $ne: course._id } },
        {
            $push: { enrolledCources: course._id },
            $inc: { lifeTimeSpentMoney: price }
        },
        options
    );
    if (enrollment.modifiedCount === 0) {
        return false;
    }
    await Course.updateOne(
        { _id: course._id },
        { $inc: { enrolledStudentCount: 1 } },
        options
    );
    return true;
};

const purchaseCourse = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const { courseId } = req.body;
    //todo payment logic
    if (!user) {
        return res.status(401).json({ message: "please login first" });
    }
    if (user.role !== "student") {
        return res.status(403).json({ message: "not a valid role for this action" });
    }
    if (!user.isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }
    if (!courseId) {
        return res.status(400).json({ message: "course id required" });
    }
    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ message: "invalid course id" });
    }
    const course = await Course.findById(courseId);
    if (!course) {
        return res.status(404).json({ message: "course not found" });
    }
    const alreadyEnrolled = user.enrolledCources?.some(
        (enrolled) => enrolled.toString() === course._id?.toString()
    );
    if (alreadyEnrolled) {
        return res.status(409).json({ message: "course already purchased" });
    }

    const price = course.price ?? 0;

    // Transactions require a replica set. Where one is available the whole
    // purchase commits atomically; otherwise fall back to the guarded
    // sequence so single-node development still works.
    let session: mongoose.ClientSession | null = null;
    try {
        session = await mongoose.startSession();
    } catch {
        session = null;
    }

    let transaction: any;
    let enrolled = false;

    if (session) {
        try {
            await session.withTransaction(async () => {
                const [created] = await Transaction.create(
                    [{
                        senderId: user._id,
                        courseId: course._id,
                        receiverId: course.owner,
                        status: "pending"
                    }],
                    { session }
                );
                transaction = created;

                //todo replace with real payment gateway capture
                enrolled = await applyEnrollment(user._id, course, price, session);
                if (!enrolled) {
                    // Abort so the pending transaction record rolls back too.
                    throw new Error("ALREADY_ENROLLED");
                }

                transaction.status = "completed";
                await transaction.save({ session });
            });
        } catch (error: any) {
            if (error?.message === "ALREADY_ENROLLED") {
                return res.status(409).json({ message: "course already purchased" });
            }
            // Transactions unsupported on this deployment — retry unguarded.
            if (error?.code === 20 || /Transaction numbers are only allowed/i.test(error?.message || "")) {
                session = null;
            } else {
                console.error("purchase transaction failed:", error);
                return res.status(500).json({ message: "purchase failed, please try again" });
            }
        } finally {
            await session?.endSession().catch(() => { });
        }
    }

    if (!session) {
        transaction = await Transaction.create({
            senderId: user._id,
            courseId: course._id,
            receiverId: course.owner,
            status: "pending"
        });

        try {
            //todo replace with real payment gateway capture
            enrolled = await applyEnrollment(user._id, course, price, null);
            if (!enrolled) {
                transaction.status = "failed";
                await transaction.save();
                return res.status(409).json({ message: "course already purchased" });
            }
            transaction.status = "completed";
            await transaction.save();
        } catch (error) {
            transaction.status = "failed";
            await transaction.save().catch(() => { });
            return res.status(500).json({ message: "purchase failed, please try again" });
        }
    }

    return res.status(200).json({
        message: "course purchased sucessfully",
        transactionId: transaction._id,
        courseId: course._id
    });
});

const searchCourses = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "please login first" });
    }
    if (user.role !== "student") {
        return res.status(403).json({ message: "not a valid role for this action" });
    }
    if (!user.isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }

    try {
        const {
            query,
            q,
            search,
            minPrice,
            maxPrice,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
            excludeEnrolled
        } = req.query;

        const searchQuery = (query || q || search || "") as string;
        const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNumber = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
        const skip = (pageNumber - 1) * limitNumber;

        const filter: any = {};

      

        // Search text matching name or description. Input is escaped so a
        // crafted pattern cannot become a catastrophically backtracking regex.
        if (searchQuery.trim()) {
            const searchRegex = new RegExp(escapeRegex(searchQuery.trim()), "i");
            filter.$or = [
                { name: { $regex: searchRegex } },
                { courseDescription: { $regex: searchRegex } }
            ];
        }

        // Price range filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined && !isNaN(Number(minPrice))) {
                filter.price.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        // Option to exclude already enrolled courses
        if (excludeEnrolled === "true" && user.enrolledCources && user.enrolledCources.length > 0) {
            filter._id = { $nin: user.enrolledCources };
        }

        // Sorting
        const allowedSortFields = ["createdAt", "price", "enrolledStudentCount", "name"];
        const sortField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : "createdAt";
        const order = sortOrder === "asc" ? 1 : -1;

        const totalCourses = await Course.countDocuments(filter);
        const courses = await Course.find(filter)
            .populate("owner", "username fullName profilePic email")
            .sort({ [sortField]: order })
            .skip(skip)
            .limit(limitNumber);

        const enrolledCourseIds = new Set(
            (user.enrolledCources || []).map((id) => id.toString())
        );

        const formattedCourses = courses.map((course) => {
            const courseObj = course.toObject();
            return {
                ...courseObj,
                isEnrolled: enrolledCourseIds.has((course._id as any).toString())
            };
        });

        return res.status(200).json({
            message: "Courses fetched successfully",
            courses: formattedCourses,
            pagination: {
                totalCourses,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalCourses / limitNumber),
                limit: limitNumber
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to search courses, please try again" });
    }
});

const getCourseFeed = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "please login first" });
    }
    if (user.role !== "student") {
        return res.status(403).json({ message: "not a valid role for this action" });
    }
    if (!user.isVerified) {
        return res.status(403).json({ message: "user not verified" });
    }

    try {
        const {
            filter: feedFilter = "all",
            page = 1,
            limit = 10
        } = req.query;

        const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNumber = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
        const skip = (pageNumber - 1) * limitNumber;

        const filter: any = {};

   
        let sortOption: any = { createdAt: -1 };

        switch (feedFilter) {
            case "popular":
                sortOption = { enrolledStudentCount: -1, createdAt: -1 };
                break;
            case "newest":
                sortOption = { createdAt: -1 };
                break;
            case "free":
                filter.price = { $lte: 0 };
                sortOption = { enrolledStudentCount: -1 };
                break;
            case "enrolled":
                filter._id = { $in: user.enrolledCources || [] };
                sortOption = { updatedAt: -1 };
                break;
            case "all":
            default:
                sortOption = { createdAt: -1 };
                break;
        }

        const totalCourses = await Course.countDocuments(filter);
        const courses = await Course.find(filter)
            .populate("owner", "username fullName profilePic email")
            .sort(sortOption)
            .skip(skip)
            .limit(limitNumber);

        const enrolledCourseIds = new Set(
            (user.enrolledCources || []).map((id) => id.toString())
        );

        const formattedCourses = courses.map((course) => {
            const courseObj = course.toObject();
            return {
                ...courseObj,
                isEnrolled: enrolledCourseIds.has((course._id as any).toString())
            };
        });

        return res.status(200).json({
            message: "Course feed fetched successfully",
            courses: formattedCourses,
            pagination: {
                totalCourses,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalCourses / limitNumber),
                limit: limitNumber
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch course feed, please try again" });
    }
});

export { purchaseCourse, searchCourses, getCourseFeed };
