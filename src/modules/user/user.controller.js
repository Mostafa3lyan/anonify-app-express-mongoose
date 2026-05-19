import { Router } from "express";
import { TokenTypeEnum } from "../../common/enums/security.enum.js";
import { decodeToken, localFileUpload } from "../../common/utils/index.js";
import { fileFieldValidation } from "../../common/utils/multer/validation.multer.js";
import { authentication } from "../../middleware/index.js";
import { validation } from "../../middleware/validation.middleware.js";
import { successResponse } from "./../../common/utils/response/index.js";
import {
  changePassword,
  logout,
  profile,
  profileCoverImage,
  profileImage,
  removeProfileImage,
  rotateToken,
  shareProfile
} from "./user.service.js";
import * as validators from "./user.validation.js";
const router = Router();

// User Profile
router.get(
  "/",
  authentication(),
  // authorization([RoleEnum.User, RoleEnum.Admin]),
  async (req, res, next) => {
    const user = await profile(req.user);
    return successResponse({
      res,
      data: { user },
    });
  },
);

// Logout
router.post("/logout", authentication(), async (req, res, next) => {
  const status = await logout(req.body, req.user, req.decoded);
  return successResponse({ res, status });
});

// Share User Profile
router.get(
  "/:userId/share-profile",
  async (req, res, next) => {
    if (req?.headers?.authorization) {
      const { user, decoded } = await decodeToken({
        token: req.headers.authorization.split(" ")[1],
        tokenType: TokenTypeEnum.access,
      });

      req.user = user;
      req.decoded = decoded;
      return next();
    }
  },
  validation(validators.shareProfile),
  async (req, res, next) => {
    const account = await shareProfile(req.params.userId, req.user);
    return successResponse({
      res,
      data: { account },
    });
  },
);

// Rotate Token
router.post(
  "/rotate-token",
  authentication(TokenTypeEnum.refresh),
  async (req, res, next) => {
    const credentials = await rotateToken(
      req.user,
      req.decoded,
      `${req.protocol}://${req.host}`,
    );
    return successResponse({
      res,
      status: 201,
      data: { ...credentials },
    });
  },
);

// add Profile Image
router.patch(
  "/profile-image",
  authentication(),
  localFileUpload({
    customPath: "users/profile",
    validation: fileFieldValidation.image,
    maxSize: 5,
  }).single("attachment"),
  validation(validators.profileImage),
  async (req, res, next) => {
    const account = await profileImage(req.file, req.user);
    return successResponse({ res, data: { account } });
  },
);

// remove Profile Image
router.delete(
  "/remove-profile-image",
  authentication(),
  async (req, res, next) => {
    const account = await removeProfileImage(req.user);
    return successResponse({
      message: "Profile image removed successfully",
      res,
    });
  },
);

// Add Cover Images
router.patch(
  "/profile-cover-image",
  authentication(),
  localFileUpload({
    customPath: "users/profile/cover",
    validation: fileFieldValidation.image,
    maxSize: 5,
  }).array("attachments", 5),
  validation(validators.profileCoverImage),
  async (req, res, next) => {
    const account = await profileCoverImage(req.files, req.user);
    return successResponse({ res, data: { account } });
  },
);

// Change Password
router.patch(
  "/change-password",
  authentication(),
  validation(validators.changePasswordSchema),
  async (req, res, next) => {
    const credentials = await changePassword(
      req.body,
      req.user,
      `${req.protocol}://${req.host}`,
    );
    return successResponse({
      res,
      data: { ...credentials },
    });
  },
);


export default router;
