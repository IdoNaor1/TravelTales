import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../model/userModel";

const generateTokens = (userId: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error("JWT secrets not configured");
  }

  // Add a JWT ID (jti) to ensure tokens are unique even when generated at the same second
  const jti = crypto.randomBytes(16).toString("hex");

  const accessToken = jwt.sign({ _id: userId, jti }, jwtSecret, {
    expiresIn: "5s",
  });

  const refreshToken = jwt.sign({ _id: userId, jti }, jwtRefreshSecret, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, profilePicture } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      profilePicture: profilePicture || undefined,
      refreshTokens: [],
    });

    const savedUser = await user.save();

    const { accessToken, refreshToken } = generateTokens(savedUser._id.toString());

    savedUser.refreshTokens = [refreshToken];
    await savedUser.save();

    res.status(201).json({
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token required" });
      return;
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      res.status(500).json({ message: "JWT refresh secret not configured" });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { _id: string };
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired refresh token", error });
      return;
    }

    const user = await User.findOneAndUpdate(
      { _id: decoded._id, refreshTokens: refreshToken },
      { $pull: { refreshTokens: refreshToken } },
      { new: false }
    );

    if (!user) {
      await User.findByIdAndUpdate(decoded._id, { refreshTokens: [] });
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    } = generateTokens(user._id.toString());

    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: newRefreshToken },
    });

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Error refreshing token", error });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token required" });
      return;
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      res.status(500).json({ message: "JWT refresh secret not configured" });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { _id: string };
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired refresh token", error });
      return;
    }

    const user = await User.findById(decoded._id);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Remove the refresh token
    user.refreshTokens = user.refreshTokens.filter(
      (token) => token !== refreshToken
    );
    await user.save();

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out", error });
  }
};
