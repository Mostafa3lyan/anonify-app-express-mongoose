import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../../../config/config.service.js";
import { LogoutEnum } from "../../common/enums/security.enum.js";
import { ProviderEnum, RoleEnum } from "../../common/enums/user.enum.js";
import {
  baseRevokeTokenKey,
  del,
  keys,
  revokeTokenKey,
  set,
} from "../../common/services/redis.service.js";
import {
  BadRequestException,
  compareHash,
  ConflictException,
  generateDecryption,
  generateHash,
  NotFoundException,
} from "../../common/utils/index.js";
import { createLoginCredentials } from "../../common/utils/security/token.security.js";
import { findById, findOne, updateOne } from "../../DB/db.repository.js";
import { UserModel } from "../../DB/index.js";

// create revoke token
const createRevokeToken = async ({ userId, jti, ttl }) => {
  await set(
    revokeTokenKey({ userId: sub, jti }),
    jti,
    iat + REFRESH_TOKEN_EXPIRES_IN,
  );
  return;
};

// get user profile
export const profile = async (user) => {
  return user;
};

// logout
export const logout = async ({ flag }, user, { jti, iat, sub }) => {
  let status = 200;
  switch (flag) {
    case LogoutEnum.all:
      user.changeCredentialsTime = new Date();
      await user.save();
      await del(await keys(baseRevokeTokenKey(sub)));
      break;

    default:
      await createRevokeToken({
        userId: sub,
        jti,
        ttl: iat + REFRESH_TOKEN_EXPIRES_IN,
      });

      status = 201;
      break;
  }
  revokeTokenKey;
  return status;
};

// share profile
export const shareProfile = async (userId, loggedInUser) => {
  const account = await findOne({
    model: UserModel,
    filter: { _id: userId },
    select: "firstName lastName email profilePicture profileVisits phone",
  });

  if (!account) {
    throw NotFoundException({ message: "profile not found" });
  }

  if (account.phone) {
    account.phone = await generateDecryption(account.phone);
  }

  await updateOne({
    model: UserModel,
    filter: { _id: userId },
    update: { $inc: { profileVisits: 1 } },
  });

  const isAdmin = loggedInUser?.role === RoleEnum.Admin;

  if (!isAdmin) {
    account.profileVisits = undefined;
  }

  return account;
};

// rotate token
export const rotateToken = async (user, { sub, jti, iat }, issuer) => {
  if ((iat + ACCESS_TOKEN_EXPIRES_IN) * 1000 > Date.now() + 30000) {
    throw ConflictException({ message: " Current Access token still valid" });
  }

  await createRevokeToken({
    userId: sub,
    jti,
    ttl: iat + REFRESH_TOKEN_EXPIRES_IN,
  });

  return createLoginCredentials(user, issuer);
};

// upload profile image
export const profileImage = async (file, user) => {
  user.profilePicture = file.finalPath;
  await user.save();
  return user;
};

// remove profile image
export const removeProfileImage = async (user) => {
  if (!user.profilePicture) {
    throw NotFoundException({
      message: "There is no profile picture to remove",
    });
  }
  user.profilePicture = undefined;
  await user.save();
  return user;
};

// upload cover image
export const profileCoverImage = async (files, user) => {
  user.profileCoverPictures = files.map((file) => file.finalPath);
  await user.save();
  return user;
};

// change password
export const changePassword = async (
  { oldPassword, newPassword },
  user,
  issuer,
) => {
  const match = await compareHash({
    plainText: oldPassword,
    cipherText: user.password,
  });

  if (!match) {
    throw BadRequestException({ message: "Old password is incorrect" });
  }

  for (const hash of user.oldPasswords || []) {
    const isMatch = await compareHash({
      plainText: newPassword,
      cipherText: hash,
    });
    if (isMatch) {
      throw BadRequestException({
        message:
          "New password cannot be the same as any of the previous passwords",
      });
    }
  }

  user.oldPasswords.push(user.password);
  user.password = await generateHash({ plainText: newPassword });
  user.changeCredentialsTime = new Date();
  await user.save();

  await del(await keys(baseRevokeTokenKey(user._id)));
  return await createLoginCredentials(user, issuer);
};