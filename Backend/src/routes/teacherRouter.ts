import { Router } from "express";
import verifyUser from "../middlewares/authMiddelware.ts";
import {
    createCourse,
    deleteCourse,
    updateCourse,
    getTeacherCourses
} from "../controllers/teacherCotroller.ts";

const teacherRouter = Router();

// Require authentication for all teacher routes
teacherRouter.use(verifyUser);

teacherRouter.post("/courses/create", createCourse);
teacherRouter.put("/courses/update", updateCourse);
teacherRouter.delete("/courses/delete", deleteCourse);
teacherRouter.get("/courses", getTeacherCourses);

export default teacherRouter;
