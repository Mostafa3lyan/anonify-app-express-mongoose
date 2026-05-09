import { redisClient } from "../../DB/index.js";

// logout revoke token keys
export const baseRevokeTokenKey = (userId) => {
  return `RevokeToken::${userId}`;
};

export const revokeTokenKey = ({ userId, jti }) => {
  return `${baseRevokeTokenKey(userId)}::${jti}`;
};

// otp keys
export const otpKey = (email) => `OTP::User::${email}`;
export const otpAttemptsKey = (email) => `otp::attempts::${email}`;
export const otpBlockKey = (email) => `otp::blocked::${email}`;

// Set data in Redis with an optional time-to-live (TTL)
export const set = async (key, value, ttl) => {
  try {
    let data = typeof value === "string" ? value : JSON.stringify(value);

    return ttl
      ? await redisClient.set(key, data, {
          EX: ttl,
        })
      : await redisClient.set(key, data);
  } catch (error) {
    console.log(`Failed to set data in Redis: ${error}`);
  }
};

// Update data in Redis
export const update = async (key, value, ttl) => {
  try {
    if (!(await redisClient.exists(key))) return 0;
    return await set(key, value, ttl);
  } catch (error) {
    console.log(`Failed to update data in Redis: ${error}`);
  }
};

// Get data from Redis
export const get = async (key) => {
  try {
    try {
      return JSON.parse(await redisClient.get(key));
    } catch (error) {
      return await redisClient.get(key);
    }
  } catch (error) {
    console.log(`Failed to get data from Redis: ${error}`);
  }
};

// multiple Get
export const mGet = async (keys = []) => {
  try {
    if (!keys.length) return 0;
    return await redisClient.mGet(keys);
  } catch (error) {
    console.log(`Failed to multiple get data from Redis: ${error}`);
  }
};

// get ttl
export const ttl = async (key) => {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    console.log(`Failed to get TTL from Redis: ${error}`);
  }
};

// check exists
export const exists = async (key) => {
  try {
    return await redisClient.exists(key);
  } catch (error) {
    console.log(`Failed to check existence in Redis: ${error}`);
  }
};

// add ttl
export const expire = async (key, ttl) => {
  try {
    return await redisClient.expire(key, ttl);
  } catch (error) {
    console.log(`Failed to add TTL to key in Redis: ${error}`);
  }
};

// increment value
export const incr = async (key) => {
  try {
    return await redisClient.incr(key);
  } catch (error) {
    console.log(`Failed to increment key in Redis: ${error}`);
  }
};

// delete key
export const del = async (key) => {
  try {
    if (!key || (Array.isArray(key) && !key.length)) return 0;
    return await redisClient.del(key);
  } catch (error) {
    console.log(`Failed to delete key in Redis: ${error}`);
  }
};

// get keys by prefix
export const keys = async (prefix) => {
  try {
    return await redisClient.keys(`${prefix}*`);
  } catch (error) {
    console.log(`Failed to get keys in Redis: ${error}`);
  }
};
