import { Router } from "express";
import { confirmEmail, enableTwoFactorAuth, forgotPassword, login, loginConfirm, requestTwoFactorAuth, reSendConfirmEmail, resetPassword, signup, signupWithGmail, verifyMagicLink, verifyOtp } from "./auth.service.js";
import { successResponse } from "./../../common/utils/response/success.response.js";
import * as validators from "./auth.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication } from './../../middleware/index.js';
const router = Router();

// signup
router.post("/signup", validation(validators.signupSchema), async (req, res, next) => {
  const user = await signup(req.body);
  return successResponse({
    message: "signed up successfully",
    status: 201,
    res,
    data: { user },
  });
});

// confirm email
router.patch(
  "/confirm-email",
  validation(validators.emailOtpSchema),
  async (req, res, next) => {
    const account = await confirmEmail(req.body);
    return successResponse({
      message: "Email confirmed successfully",
      res,
    });
  },
);

// resend confirm email
router.patch(
  "/resend-confirm-email",
  validation(validators.emailSchema),
  async (req, res, next) => {
    const account = await reSendConfirmEmail(req.body);
    return successResponse({
      message: "We have sent you another otp",
      res,
    });
  },
);

// forgot password
router.post(
  "/forgot-password",
  validation(validators.forgotPasswordSchema),
  async (req, res, next) => {
    await forgotPassword(req.body);
    return successResponse({
      message: "If this email exists, a reset link or code has been sent",
      res,
    });
  },
);

// verify otp (method: otp)
router.post(
  "/verify-otp",
  validation(validators.emailOtpSchema),
  async (req, res, next) => {
    await verifyOtp(req.body);
    return successResponse({
      message: "OTP verified successfully",
      res,
    });
  },
);

// verify magic link (method: magic-link)
router.get(
  "/verify-link",
  async (req, res, next) => {
    await verifyMagicLink(req.query.token);
    return successResponse({
      message: "Email verified successfully",
      res,
    });
  },
);

// reset password (shared)
router.patch(
  "/reset-password",
  validation(validators.resetPasswordSchema),
  async (req, res, next) => {
    const account = await resetPassword(req.body);
    return successResponse({
      message: "Password reset successfully",
      res,
      data: { user: account },
    });
  },
);

// signup with gmail
router.post("/signup/gmail", async (req, res, next) => {
  const { message, status, credentials } = await signupWithGmail(
    req.body.idToken,
    `${req.protocol}://${req.host}`,
  );
  return successResponse({
    message,
    status,
    res,
    data: { ...credentials },
  });
});

// login
router.post(
  "/login",
  validation(validators.loginSchema),
  async (req, res, next) => {
    const result = await login(req.body, `${req.protocol}://${req.host}`);

    if (result.twoFactorRequired) {
      return successResponse({
        res,
        status: 200,
        message: "2FA code sent to your email. Please verify to continue.",
      });
    }

    return successResponse({
      message: "Logged in successfully",
      res,
      data: { ...result },
    });
  },
);

// login confirm (2fa)
router.post(
  "/login-confirm",
  validation(validators.emailOtpSchema),
  async (req, res, next) => {
    const credentials = await loginConfirm(
      req.body,
      `${req.protocol}://${req.host}`,
    );
    return successResponse({
      message: "logged in successfully",
      res,
      data: { ...credentials },
    });
  },
);

// request 2fa code
router.patch("/request-2fa", authentication(), async (req, res, next) => {
  const user = await requestTwoFactorAuth(req.user);
  return successResponse({
    message: "2fa code sent successfully",
    res,
  });
});

// verify 2fa code and enable 2fa
router.patch(
  "/enable-2fa",
  authentication(),
  validation(validators.otpSchema),
  async (req, res, next) => {
    const user = await enableTwoFactorAuth(req.user, req.body);
    return successResponse({
      message: "2fa enabled successfully",
      res,
    });
  },
);

export default router;
