import { Router } from "express";
import { customSignup } from "../controllers/userController.ts";
const router = Router();
router.route("/customSignup").post(customSignup)
export default router