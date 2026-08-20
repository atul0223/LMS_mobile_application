import { Router } from "express";
import verifyUser from "../middlewares/authMiddelware.ts";
import { purchaseCourse, searchCourses, getCourseFeed } from "../controllers/studentController.ts";

const studentRouter = Router();

studentRouter.use(verifyUser);

studentRouter.get("/courses/search", searchCourses);
studentRouter.get("/courses/feed", getCourseFeed);
studentRouter.post("/courses/purchase", purchaseCourse);

export default studentRouter;
