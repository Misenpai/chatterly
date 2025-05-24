import jwt from "jsonwebtoken";
import redisClient from "./redisClient.js";

export const generateToken = async (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const ttlSeconds = 7 * 24 * 60 * 60;
  await redisClient.set(`token:${token}`, userId, { EX: ttlSeconds });
  return token;
};
