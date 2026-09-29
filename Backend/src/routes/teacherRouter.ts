import { Router } from "express";
import verifyUser from "../middlewares/authMiddleware.ts";
import {
    createCourse,
    deleteCourse,
    updateCourse,
    getTeacherCourses,
} from "../controllers/teacherController.ts";
import { uploadMiddleware } from "../middlewares/multerMiddleware.ts";
import {
    videoUpload,
    getVideoUploadSignature,
    recordUploadedVideo,
} from "../controllers/videoController.ts";
import { getCourseById } from "../controllers/studentController.ts";

const teacherRouter = Router();

// Require authentication for all teacher routes
teacherRouter.use(verifyUser);
teacherRouter.get("/video/signature", getVideoUploadSignature);
teacherRouter.post("/video/record", recordUploadedVideo);
teacherRouter.post("/video/upload", uploadMiddleware.single('mediaFile'), videoUpload);
teacherRouter.post("/courses/create", createCourse);
teacherRouter.put("/courses/update", updateCourse);
teacherRouter.delete("/courses/delete", deleteCourse);
teacherRouter.get("/courses", getTeacherCourses);
teacherRouter.get("/courses/:courseId", getCourseById);

export default teacherRouter;
