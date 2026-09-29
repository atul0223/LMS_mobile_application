import { Router } from "express";
import verifyUser from "../middlewares/authMiddleware.ts";
import { purchaseCourse, searchCourses, getCourseFeed, getCourseById } from "../controllers/studentController.ts";

const studentRouter = Router();

studentRouter.use(verifyUser);

studentRouter.get("/courses/search", searchCourses);
studentRouter.get("/courses/feed", getCourseFeed);
studentRouter.get("/courses/:courseId", getCourseById);
studentRouter.post("/courses/purchase", purchaseCourse);

export default studentRouter;
