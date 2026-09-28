import { Router } from "express";
import { customSignup, getMe, login, requestOtp, verifyOtp } from "../controllers/userController.ts";
import verifyUser from "../middlewares/authMiddleware.ts";
import { authLimiter } from "../middlewares/rateLimiters.ts";

const router = Router();

// Credential endpoints carry the strict limiter; the authenticated profile read
// does not, so failed logins cannot lock a signed-in user out of their own data.
router.route("/customSignup").post(authLimiter, customSignup);
router.route("/verifyOtp").post(authLimiter, verifyOtp);
router.route("/sendOtp").post(authLimiter, requestOtp);
router.route("/resendOtp").post(authLimiter, requestOtp);
router.route("/login").post(authLimiter, login);
router.route("/me").get(verifyUser, getMe);

export default router;
