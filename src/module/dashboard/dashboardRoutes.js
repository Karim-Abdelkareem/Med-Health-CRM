import express from "express";
import * as dashboardController from "./dashboardController.js";
import auth from "../../middleware/authentication.js";
import validate from "../../middleware/validate.js";
import Joi from "joi";

const router = express.Router();

// التحقق من صحة البيانات
const preferencesSchema = Joi.object({
  theme: Joi.string().valid("light", "dark"),
  notificationsEnabled: Joi.boolean(),
  language: Joi.string(),
});

const activitySchema = Joi.object({
  type: Joi.string()
    .valid("login", "plan_created", "patient_added", "task_completed")
    .required(),
  description: Joi.string().required(),
});

const notificationStatusSchema = Joi.object({
  read: Joi.boolean().required(),
});

// المسارات
router.get("/", auth.protect, dashboardController.getDashboardData);
router.patch(
  "/preferences",
  auth.protect,
  validate(preferencesSchema),
  dashboardController.updatePreferences
);
router.post(
  "/activities",
  auth.protect,
  validate(activitySchema),
  dashboardController.addActivity
);
router.get(
  "/notifications",
  auth.protect,
  dashboardController.getNotifications
);
router.patch(
  "/notifications/:notificationId",
  auth.protect,
  validate(notificationStatusSchema),
  dashboardController.updateNotificationStatus
);

export default router;
