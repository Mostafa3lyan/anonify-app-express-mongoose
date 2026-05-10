import { Router } from "express";
import { confirmEmail, forgotPassword, login, reSendConfirmEmail, resetPassword, signup, signupWithGmail, verifyOtp } from "./auth.service.js";
import { successResponse } from "./../../common/utils/response/success.response.js";
import * as validators from "./auth.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
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
  validation(validators.emailSchema),
  async (req, res, next) => {
    await forgotPassword(req.body);
    return successResponse({
      message: "We have sent you an otp",
      res,
    });
  },
);

// verify reset password otp
router.post(
  "/verify-otp",
  validation(validators.emailOtpSchema),
  async (req, res, next) => {
    const account = await verifyOtp(req.body);
    return successResponse({
      message: "OTP verified successfully",
      res,
    });
  },
);

// reset password
router.patch("/reset-password", validation(validators.resetPasswordSchema), async (req, res, next) => {
  const account = await resetPassword(req.body);
  return successResponse({
    message: "Password reset successfully",
    res,
    data: { user: account },
  });
});

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
router.post("/login", validation(validators.loginSchema), async (req, res, next) => {
  const credentials = await login(req.body, `${req.protocol}://${req.host}`);
  return successResponse({
    message: "logged in successfully",
    res,
    data: { ...credentials },
  });
});

export default router;
