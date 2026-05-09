import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../../../config/config.service.js";
import { LogoutEnum } from "../../common/enums/security.enum.js";
import {
  baseRevokeTokenKey,
  del,
  keys,
  revokeTokenKey,
  set,
} from "../../common/services/redis.service.js";
import {
  ConflictException,
  generateDecryption,
  NotFoundException,
} from "../../common/utils/index.js";
import {
  createLoginCredentials
} from "../../common/utils/security/token.security.js";
import { findOne } from "../../DB/db.repository.js";
import { UserModel } from "../../DB/index.js";

const createRevokeToken = async ({ userId, jti, ttl }) => {
  await set(
    revokeTokenKey({ userId: sub, jti }),
    jti,
    iat + REFRESH_TOKEN_EXPIRES_IN,
  );
  return;
};

export const profile = async (user) => {
  return user;
};

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

export const shareProfile = async (userId) => {
  const account = await findOne({
    model: UserModel,
    filter: { _id: userId },
    select: "-password",
  });

  if (!account) {
    throw NotFoundException({ message: "profile not found" });
  }

  if (account.phone) {
    account.phone = await generateDecryption(account.phone);
  }

  return account;
};

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

export const profileImage = async (file, user) => {
  user.profilePicture = file.finalPath;
  await user.save();
  return user;
};

export const profileCoverImage = async (files, user) => {
  user.profileCoverPictures = files.map((file) => file.finalPath);
  await user.save();
  return user;
};
