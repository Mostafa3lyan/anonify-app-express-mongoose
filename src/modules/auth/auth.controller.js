import { Router } from "express";
import { confirmEmail, login, reSendConfirmEmail, signup, signupWithGmail } from "./auth.service.js";
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
router.patch("/confirm-email", validation(validators.confirmEmailSchema), async (req, res, next) => {
  const account = await confirmEmail(req.body);
  return successResponse({
    message: "Email confirmed successfully",
    res,
  });
});

// resend confirm email
router.patch(
  "/resend-confirm-email",
  validation(validators.reSendConfirmEmailSchema),
  async (req, res, next) => {
    const account = await reSendConfirmEmail(req.body);
    return successResponse({
      message: "We have sent you another otp",
      res,
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
router.post("/login", validation(validators.loginSchema), async (req, res, next) => {
  const credentials = await login(req.body, `${req.protocol}://${req.host}`);
  return successResponse({
    message: "logged in successfully",
    res,
    data: { ...credentials },
  });
});

export default router;
