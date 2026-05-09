import { resolve } from "node:path";
import { config } from "dotenv";

export const NODE_ENV = process.env.NODE_ENV;

const envPath = {
  development: `.env.development`,
  production: `.env.production`,
};
console.log({ env: envPath[NODE_ENV] });

config({ path: resolve(`./config/${envPath[NODE_ENV]}`) });

export const port = process.env.PORT ?? 7000;

export const APP_NAME = process.env.APP_NAME;

// DB Uri
export const DB_URI = process.env.DB_URI;

// Redis Uri
export const REDIS_URI = process.env.REDIS_URI

export const SALT_ROUND = parseInt(process.env.SALT_ROUND ?? "10");
export const IV_LENGTH = parseInt(process.env.IV_LENGTH ?? "16");
export const ENC_SECRET_KEY = Buffer.from(process.env.ENC_SECRET_KEY);
export const Encryption_ALGORITHM = process.env.Encryption_ALGORITHM;

// Token
export const ACCESS_TOKEN_SECRET_KEY = process.env.ACCESS_TOKEN_SECRET_KEY;
export const REFRESH_TOKEN_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET_KEY;
export const SYSTEM_ACCESS_TOKEN_SECRET_KEY = process.env.SYSTEM_ACCESS_TOKEN_SECRET_KEY;
export const SYSTEM_REFRESH_TOKEN_SECRET_KEY = process.env.SYSTEM_REFRESH_TOKEN_SECRET_KEY;
export const ACCESS_TOKEN_EXPIRES_IN = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN);
export const REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN);

// Google
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Nodemailer
export const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;
export const Email_USER = process.env.Email_USER;
