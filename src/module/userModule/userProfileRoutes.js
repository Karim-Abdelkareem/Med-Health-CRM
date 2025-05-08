import express from "express";
import * as userProfileController from "./userProfileController.js";
import auth from "../../middleware/authentication.js";
import validate from "../../middleware/validate.js";
import Joi from "joi";

const router = express.Router();

// التحقق من صحة البيانات
const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^[0-9]{10}$/),
  address: Joi.string(),
  avatar: Joi.string().uri(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
    }),
});

const updateSettingsSchema = Joi.object({
  language: Joi.string().valid("ar", "en"),
  theme: Joi.string().valid("light", "dark"),
  notifications: Joi.object({
    email: Joi.boolean(),
    push: Joi.boolean(),
    sms: Joi.boolean(),
  }),
  timezone: Joi.string(),
  dateFormat: Joi.string(),
});

// المسارات
router.get("/profile", auth.protect, userProfileController.getUserProfile);

router.patch(
  "/profile",
  auth.protect,
  validate(updateProfileSchema),
  userProfileController.updateUserProfile
);

router.patch(
  "/change-password",
  auth.protect,
  validate(changePasswordSchema),
  userProfileController.changePassword
);

router.patch(
  "/settings",
  auth.protect,
  validate(updateSettingsSchema),
  userProfileController.updateUserSettings
);

router.get(
  "/activity-log",
  auth.protect,
  userProfileController.getUserActivityLog
);

router.patch(
  "/profile-picture",
  auth.protect,
  validate(Joi.object({ avatar: Joi.string().uri().required() })),
  userProfileController.updateProfilePicture
);

export default router;
