import { Router } from "express";
import verifyUser from "../middlewares/authMiddleware.ts";
import { getCourseVideos, getVideoById } from "../controllers/videoController.ts";

const videoRouter = Router();

// Playback is entitlement-checked per request inside the controller, which
// admits both the owning teacher and enrolled students.
videoRouter.use(verifyUser);

videoRouter.get("/course/:courseId", getCourseVideos);
videoRouter.get("/:videoId", getVideoById);

export default videoRouter;
