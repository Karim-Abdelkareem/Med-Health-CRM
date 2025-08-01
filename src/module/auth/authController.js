import User from "../userModule/userModel.js";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";
import bcrypt from "bcryptjs";

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password });
  await user.save();
  res.status(201).json({
    status: "success",
    message: "User created successfully",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  let user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Invalid email", 401));
  }
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return next(new AppError("Invalid password", 401));
  }
  const isActive = user.active;
  if (!isActive) {
    return next(new AppError("User is not active", 401));
  }
  const token = jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      governate: user.governate,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );

  res.cookie("access_token", token, {
    path: "/",
    sameSite: "None",
    secure: true,
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "User logged in successfully",
    data: {
      access_token: token,
      user,
    },
  });
});

export const createUserByAdminOrGM = asyncHandler(async (req, res, next) => {
  const { name, email, password, LM, DM, governate, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new AppError("User already exists", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    LM: LM || undefined,
    DM: DM || undefined,
    governate: governate || undefined,
  });

  res.status(201).json({
    status: "success",
    message: "User created successfully",
    data: {
      user,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("access_token", {
    path: "/",
    sameSite: "None",
    httpOnly: true,
    secure: true,
  });

  res.status(200).json({
    status: "success",
    message: "User logged out successfully",
  });
});
