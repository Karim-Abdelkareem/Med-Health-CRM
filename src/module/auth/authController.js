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
    return next(new AppError("Invalid email or password", 401));
  }
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return next(new AppError("Invalid email or password", 401));
  }
  const token = jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
  res.status(200).json({
    status: "success",
    message: "User logged in successfully",
    data: {
      access_token: token,
      user,
    },
  });
});

export const createUserByAdminOrGM = asyncHandler(async (req, res) => {
  const { name, email, password, role, managerId } = req.body;

  const allowedRoles = {
    ADMIN: ["GM", "HR", "LM", "DR", "R"],
    GM: ["LM", "DR", "R"],
  };

  if (!allowedRoles[req.user.role]?.includes(role)) {
    res.status(403);
    throw new Error("You are not authorized to create users with this role");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    manager: managerId || req.user._id,
  });

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  });
});
