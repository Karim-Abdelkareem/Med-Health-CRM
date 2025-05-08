import asyncHandler from "express-async-handler";
import User from "./userModel.js";
import AppError from "../../utils/AppError.js";
import bcrypt from "bcryptjs";

// الحصول على الملف الشخصي للمستخدم
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("DM", "name email")
    .populate("LM", "name email");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: user,
  });
});

// تحديث الملف الشخصي للمستخدم
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, address, avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // تحديث البيانات الأساسية
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (avatar) user.avatar = avatar;

  await user.save();

  res.status(200).json({
    status: "success",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      role: user.role,
    },
  });
});

// تغيير كلمة المرور
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // التحقق من كلمة المرور الحالية
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  // تحديث كلمة المرور
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
  });
});

// تحديث الإعدادات الشخصية
export const updateUserSettings = asyncHandler(async (req, res) => {
  const { language, theme, notifications, timezone, dateFormat } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // تحديث الإعدادات
  user.settings = {
    ...user.settings,
    language: language || user.settings?.language,
    theme: theme || user.settings?.theme,
    notifications: notifications || user.settings?.notifications,
    timezone: timezone || user.settings?.timezone,
    dateFormat: dateFormat || user.settings?.dateFormat,
  };

  await user.save();

  res.status(200).json({
    status: "success",
    data: user.settings,
  });
});

// الحصول على سجل النشاطات
export const getUserActivityLog = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(req.user._id)
    .select("activityLog")
    .populate("activityLog.relatedTo", "name email");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const activities = user.activityLog.slice(startIndex, endIndex);

  res.status(200).json({
    status: "success",
    data: {
      activities,
      pagination: {
        total: user.activityLog.length,
        page: parseInt(page),
        pages: Math.ceil(user.activityLog.length / limit),
      },
    },
  });
});

// تحديث صورة الملف الشخصي
export const updateProfilePicture = asyncHandler(async (req, res) => {
  const { avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.avatar = avatar;
  await user.save();

  res.status(200).json({
    status: "success",
    data: {
      avatar: user.avatar,
    },
  });
});
