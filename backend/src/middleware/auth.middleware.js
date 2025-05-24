import jwt from "jsonwebtoken";
import redisClient from "../lib/redisClient.js";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const { userId } = payload;

    const storedUserId = await redisClient.get(`token:${token}`);
    if (!storedUserId || storedUserId !== String(userId)) {
      return res
        .status(401)
        .json({ message: "Token not recognized or expired" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
