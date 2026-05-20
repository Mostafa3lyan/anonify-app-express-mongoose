import {
  CliENT_URL,
  GOOGLE_CLIENT_ID,
  MAGIC_LINK_SECRET,
} from "../../../config/config.service.js";
import { HashApproachEnum } from "../../common/enums/security.enum.js";
import { ProviderEnum } from "../../common/enums/user.enum.js";
import {
  createOtp,
  emailEmitter,
  emailTemplate,
  magicLinkTemplate,
  sendEmail,
} from "../../common/utils/index.js";
import {
  compareHash,
  createLoginCredentials,
  generateEncryption,
  generateHash,
  generateToken,
  verifyToken,
} from "../../common/utils/security/index.js";

import {
  createOne,
  findOne,
  findOneAndUpdate,
  updateOne,
  UserModel,
} from "../../DB/index.js";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
} from "./../../common/utils/response/error.response.js";
import { OAuth2Client } from "google-auth-library";
import {
  baseRevokeTokenKey,
  del,
  expire,
  FaAttemptsKey,
  FaBlockKey,
  FaKey,
  get,
  incr,
  magicLinkRevokeKey,
  otpAttemptsKey,
  otpBlockKey,
  otpKey,
  set,
  ttl,
} from "./../../common/services/redis.service.js";

// generate otp with attempts limit and block
export const generateHashedOtp = async (email) => {
  const MAX_ATTEMPTS = 3;
  const BLOCK_TTL = 60 * 60; // 1 hour
  // check block
  const isBlocked = await get(otpBlockKey(email));
  if (isBlocked) {
    const remaining = await ttl(otpBlockKey(email));
    throw TooManyRequestsException({
      message: `Too many attempts. Try again in ${Math.ceil(remaining / 60)} minutes.`,
    });
  }

  // increment attempts
  const attempts = await incr(otpAttemptsKey(email));
  if (attempts === 1) await expire(otpAttemptsKey(email), BLOCK_TTL);

  if (attempts > MAX_ATTEMPTS) {
    await set(otpBlockKey(email), "1", BLOCK_TTL);
    await del(otpAttemptsKey(email));
    throw TooManyRequestsException({
      message: `Too many attempts. Try again in ${BLOCK_TTL / 60} minutes.`,
    });
  }

  const code = await createOtp();
  await set(otpKey(email), await generateHash({ plainText: `${code}` }), 300);
  return code;
};

// send confirm email
export const sendEmailWithOtp = async (email, title, subject) => {
  const code = await generateHashedOtp(email);

  emailEmitter.emit("sendOtpEmail", {
    to: email,
    title,
    subject,
    code,
  });

  return;
};

// signup
export const signup = async (inputs) => {
  const { fullName, email, password, phone } = inputs;
  const emailExist = await findOne({
    model: UserModel,
    filter: { email },
  });

  if (emailExist) {
    throw ConflictException({ message: "Email already exist" });
  }

  const user = await createOne({
    model: UserModel,
    data: {
      fullName,
      email,
      password: await generateHash({ plainText: password }),
      phone: await generateEncryption({ plainText: phone }),
    },
  });

  await sendEmailWithOtp(email, "email address", "verify your email");

  return user;
};

// confirm email
export const confirmEmail = async (inputs) => {
  const { email, otp } = inputs;
  const account = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: false },
      provider: ProviderEnum.System,
    },
  });

  if (!account) {
    throw NotFoundException({ message: "cannot find account with this email" });
  }

  const storedHashedOtp = await get(otpKey(email));

  if (!storedHashedOtp) {
    throw BadRequestException({ message: "OTP has expired or is invalid" });
  }

  const match = await compareHash({
    plainText: `${otp}`,
    cipherText: storedHashedOtp,
  });
  if (!match) {
    throw BadRequestException({ message: "Invalid OTP" });
  }

  account.confirmEmail = new Date();
  await account.save();

  await del([otpKey(email), otpAttemptsKey(email), otpBlockKey(email)]);

  return;
};

// resend confirm email
export const reSendConfirmEmail = async (inputs) => {
  const { email } = inputs;
  const account = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: false },
      provider: ProviderEnum.System,
    },
  });

  if (!account) {
    throw NotFoundException({ message: "cannot find account with this email" });
  }

  const otpTtl = await ttl(otpKey(email));

  if (otpTtl > 0) {
    throw ConflictException({
      message: `Please wait ${otpTtl} seconds before requesting a new otp.`,
    });
  }

  await sendEmailWithOtp(email, "email address", "verify your email");

  return;
};

// send magic link
export const sendMagicLink = async (email, userId) => {
  const token = generateToken({
    payload: { userId },
    secret: MAGIC_LINK_SECRET,
    expiresIn: "15m",
  });

  const link = `${CliENT_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "reset your password",
    html: magicLinkTemplate(link),
  });
};

// forgot password
export const forgotPassword = async (inputs) => {
  const { email, method = "otp" } = inputs; // method: "otp" | "link"

  const account = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.System,
    },
  });

  if (!account) {
    throw NotFoundException({ message: "Cannot find account with this email" });
  }

  if (method === "link") {
    await sendMagicLink(email, account._id);
  } else {
    await sendEmailWithOtp(email, "reset code", "reset your password");
  }

  return;
};

// verify otp
export const verifyOtp = async (inputs) => {
  const { email, otp } = inputs;

  const account = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.System,
    },
  });

  if (!account) {
    throw NotFoundException({ message: "Cannot find account with this email" });
  }

  const storedHashedOtp = await get(otpKey(email));
  if (!storedHashedOtp) {
    throw BadRequestException({ message: "OTP has expired or is invalid" });
  }

  const match = await compareHash({
    plainText: `${otp}`,
    cipherText: storedHashedOtp,
  });
  if (!match) {
    throw BadRequestException({ message: "Invalid OTP" });
  }

  account.verifiedEmail = new Date();
  await account.save();
  await del(otpKey(email));

  return account;
};

// verify magic link
export const verifyMagicLink = async (token) => {
  let payload;
  try {
    payload = verifyToken({ token, secret: MAGIC_LINK_SECRET });
  } catch {
    throw BadRequestException({ message: "Magic link is invalid or expired" });
  }

  const account = await findOne({
    model: UserModel,
    filter: {
      _id: payload.userId,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.System,
    },
  });

  if (!account) {
    throw NotFoundException({ message: "Cannot find account" });
  }

  // one-time use — check token hasn't been used already
  const isRevoked = await get(magicLinkRevokeKey(token));
  if (isRevoked) {
    throw BadRequestException({ message: "Magic link has already been used" });
  }

  account.verifiedEmail = new Date();
  await account.save();

  // revoke immediately so it can't be reused
  await set(magicLinkRevokeKey(token), "1", 60 * 15); // keep revoke record for 15min

  return account;
};

// reset password
export const resetPassword = async (inputs) => {
  const { email, password } = inputs;

  const account = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.System,
    },
  });

  if (!account) {
    throw NotFoundException({ message: "Cannot find account with this email" });
  }

  if (!account.verifiedEmail) {
    throw BadRequestException({ message: "OTP not verified" });
  }

  const isExpired =
    Date.now() - new Date(account.verifiedEmail).getTime() > 10 * 60 * 1000;

  if (isExpired) {
    account.verifiedEmail = undefined;
    await account.save();
    throw BadRequestException({
      message: "Verification expired, please request a new code",
    });
  }

  account.password = await generateHash({ plainText: password });
  account.verifiedEmail = undefined;
  account.changeCredentialsTime = new Date();
  await account.save();

  await del([
    otpKey(email),
    otpAttemptsKey(email),
    otpBlockKey(email),
    baseRevokeTokenKey(account._id),
  ]);

  return account;
};

// login
export const login = async (inputs, issuer) => {
  const { email, password } = inputs;

  const user = await findOne({
    model: UserModel,
    filter: {
      email,
      provider: ProviderEnum.System,
      confirmEmail: { $exists: true },
    },
  });
  if (!user) {
    throw UnauthorizedException({ message: "Email or Password is incorrect" });
  }

  const match = await compareHash({
    plainText: password,
    cipherText: user.password,
    approach: HashApproachEnum.bcrypt,
  });

  if (!match) {
    throw UnauthorizedException({ message: "Email or Password is incorrect" });
  }

  if (user.twoFactorVerified) {
    await requestTwoFactorAuth(user);
    return { twoFactorRequired: true };
  }

  return createLoginCredentials(user, issuer);
};

export const loginConfirm = async ({ email, otp }, issuer) => {
  const user = await findOne({
    model: UserModel,
    filter: {
      email,
      provider: ProviderEnum.System,
      confirmEmail: { $exists: true },
    },
  });
  if (!user) {
    throw UnauthorizedException({ message: "Email or Password is incorrect" });
  }
  if (!user.twoFactorVerified) {
    throw BadRequestException({
      message: "2FA is not enabled for this account",
    });
  }
  const storedHashedOtp = await get(FaKey(user));

  if (!storedHashedOtp) {
    throw BadRequestException({ message: "OTP has expired or is invalid" });
  }

  const match = await compareHash({
    plainText: `${otp}`,
    cipherText: storedHashedOtp,
  });
  if (!match) {
    throw BadRequestException({ message: "2FA code is incorrect" });
  }
  await del([FaKey(user), FaAttemptsKey(user), FaBlockKey(user)]);
  return createLoginCredentials(user, issuer);
};

// verify google token
const verifyGoogleToken = async (idToken) => {
  const client = new OAuth2Client();
  const WEB_CLIENT_ID = GOOGLE_CLIENT_ID;
  const ticket = await client.verifyIdToken({
    idToken,
    audience: WEB_CLIENT_ID, // Specify the WEB_CLIENT_ID of the app that accesses the backend
    // Or, if multiple clients access the backend:
    //[WEB_CLIENT_ID_1, WEB_CLIENT_ID_2, WEB_CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  if (!payload?.email_verified) {
    throw BadRequestException({ message: "fail to verify by google" });
  }

  return payload;
};

// signup with gmail
export const signupWithGmail = async (idToken, issuer) => {
  const payload = await verifyGoogleToken(idToken);
  console.log(payload);

  const checkExist = await findOne({
    model: UserModel,
    filter: { email: payload.email },
  });
  if (checkExist) {
    if (checkExist.provider !== ProviderEnum.Google) {
      throw ConflictException({ message: "invalid provider" });
    }
    return {
      message: "logged in successfully",
      status: 200,
      credentials: await loginWithGmail(idToken, issuer),
    };
  }

  const user = await createOne({
    model: UserModel,
    data: {
      firstName: payload.given_name,
      lastName: payload.family_name,
      email: payload.email,
      confirmEmail: new Date(),
      provider: ProviderEnum.Google,
      profilePicture: payload.picture,
    },
  });

  return {
    message: "signed up successfully",
    status: 201,
    credentials: await createLoginCredentials(user, issuer),
  };
};

// login with gmail
export const loginWithGmail = async (idToken, issuer) => {
  const payload = await verifyGoogleToken(idToken);
  const user = await findOne({
    model: UserModel,
    filter: { email: payload.email, provider: ProviderEnum.Google },
  });
  if (!user) {
    throw NotFoundException({ message: "Not registered account" });
  }
  return createLoginCredentials(user, issuer);
};

// request 2fa
export const requestTwoFactorAuth = async (user) => {
  const MAX_ATTEMPTS = 3;
  const BLOCK_TTL = 60 * 60; // 1 hour

  // check block
  const isBlocked = await get(FaBlockKey(user));
  if (isBlocked) {
    const remaining = await ttl(FaBlockKey(user));
    throw TooManyRequestsException({
      message: `Too many attempts. Try again in ${Math.ceil(remaining / 60)} minutes.`,
    });
  }

  // increment attempts
  const attempts = await incr(FaAttemptsKey(user));
  if (attempts === 1) await expire(FaAttemptsKey(user), BLOCK_TTL);

  if (attempts > MAX_ATTEMPTS) {
    await set(FaBlockKey(user), "1", BLOCK_TTL);
    await del(FaAttemptsKey(user));
    throw TooManyRequestsException({
      message: `Too many attempts. Try again in ${BLOCK_TTL / 60} minutes.`,
    });
  }

  const code = await createOtp();
  await set(FaKey(user), await generateHash({ plainText: `${code}` }), 120);

  emailEmitter.emit("sendOtpEmail", {
    to: user.email,
    title: "2FA code",
    subject: "verify 2FA for your account",
    code,
  });

  return;
};

// enable 2fa
export const enableTwoFactorAuth = async (user, { otp }) => {
  const storedHashedOtp = await get(FaKey(user));

  if (!storedHashedOtp) {
    throw BadRequestException({ message: "OTP has expired or is invalid" });
  }

  const match = await compareHash({
    plainText: `${otp}`,
    cipherText: storedHashedOtp,
  });
  if (!match) {
    throw BadRequestException({ message: "Invalid OTP" });
  }
  user.twoFactorVerified = true;
  await user.save();
  await del(FaKey(user), FaAttemptsKey(user), FaBlockKey(user));
  return;
};
