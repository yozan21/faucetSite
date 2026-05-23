import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { requireInvite } from "../../middlewares/requireInvite.js";
import { ipGuard } from "../../middlewares/ipGaurd.js";
import { loginRateLimiter } from "../../middlewares/loginRateLimiter.js";

const router = Router();

router.post("/check-username", authController.checkUsernameController);

router.post("/early-access", authController.requestEarlyAccessController);

//IP check is done manually inside the services so we don't need to include the middleware here
router.post("/signup", authController.signup);
router.post("/login", loginRateLimiter, authController.login);

// Ip Gaurd to protect our application from attacks
router.use(ipGuard());

router.post("/refresh", authController.refresh);

// router.post("/forgot-password", authController.forgotPasswordController);
router.post(
  "/forgot-password/verify-token",
  authController.verifyResetTokenController,
);
router.post("/forgot-password/reset", authController.resetPasswordController);

//Routes below require authentication
router.use(authenticate);
// router.post("/verify-email/send", authController.sendVerificationOtpController);
router.post("/verify-email", authController.verifyEmailController);
router.post("/logout", authController.logout);

router.post(
  "/unblock-account/:userId",
  authorize("superadmin", "admin", "moderator"),
  authController.unblockAccountController,
);

export default router;
