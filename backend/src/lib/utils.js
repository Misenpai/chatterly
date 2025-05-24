import jwt from "jsonwebtoken";
import redisClient from "./redisClient.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "Environment variable JWT_SECRET and JWT_REFRESH_SECRET must be set"
  );
}

export const generateTokens = async (userId) => {
  const uid = userId.toString();

  const accessToken = jwt.sign({ userId: uid }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId: uid }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  const accessTokenTTL = 15 * 60;
  const refreshTokenTTL = 7 * 24 * 60 * 60;

  await redisClient.set(`token:${accessToken}`, uid, "EX", accessTokenTTL);
  await redisClient.set(
    `refresh_token:${refreshToken}`,
    uid,
    "EX",
    refreshTokenTTL
  );
  await redisClient.set(
    `access_to_refresh:${accessToken}`,
    refreshToken,
    "EX",
    accessTokenTTL
  );

  return { accessToken, refreshToken };
};
