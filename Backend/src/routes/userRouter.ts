import { Router } from "express";
import { customSignup, login, verifyOtp } from "../controllers/userController.ts";
const router = Router();
router.route("/customSignup").post(customSignup);
router.route("/verifyOtp").post(verifyOtp)
router.route("/login").post(login)
export default router