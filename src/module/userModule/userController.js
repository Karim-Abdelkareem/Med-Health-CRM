import asyncHandler from "express-async-handler";
import User from "./userModel.js";
import AppError from "../../utils/AppError.js";

export const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return next(new AppError("Please provide all required fields", 400));
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new AppError("User already exists", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  if (user) {
    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  }
});

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({});

  if (users) {
    res.status(200).json({
      status: "success",
      message: "Users fetched successfully",
      data: users,
    });
  }
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (user) {
    res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: user,
    });
  }
});

export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (user) {
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (user) {
    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.status(200).json({
      status: "success",
      message: "User profile fetched successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});
