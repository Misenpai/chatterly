import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { generateTokens } from "../lib/utils.js";
import redisClient from "../lib/redisClient.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    const { accessToken, refreshToken } = await generateTokens(newUser._id);
    res.status(201).json({
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);
    res.status(200).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const accessToken = authHeader.split(" ")[1];
      const refreshToken = await redisClient.get(
        `access_to_refresh:${accessToken}`
      );
      if (refreshToken) {
        await redisClient.del(`refresh_token:${refreshToken}`);
      }
      await redisClient.del(`token:${accessToken}`);
      await redisClient.del(`access_to_refresh:${accessToken}`);
    }
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const userId = await redisClient.get(`refresh_token:${refreshToken}`);
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const { accessToken, newRefreshToken } = await generateTokens(userId);
    await redisClient.del(`refresh_token:${refreshToken}`);

    res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
