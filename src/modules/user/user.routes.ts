import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireVerified } from "../../middlewares/requireVerified.js";

const router = Router();

router.use(authenticate); // all user routes require auth

router.get("/me", userController.getMe);
router.put("/username", userController.updateUsername);
router.put("/email", userController.updateEmail);
router.put("/password", userController.updatePassword);
router.get("/login-history", userController.getLoginHistory);
router.get("/referrals", requireVerified, userController.getReferrals);
router.get(
  "/transactions",
  requireVerified,
  userController.getTransactionHistory,
);

export default router;
