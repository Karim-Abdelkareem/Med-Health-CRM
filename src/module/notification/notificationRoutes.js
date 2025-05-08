import express from "express";
import * as notificationController from "./notificationController.js";
import auth from "../../middleware/authentication.js";
import validate from "../../middleware/validate.js";
import Joi from "joi";

const router = express.Router();

// Data validation schemas
const createNotificationSchema = Joi.object({
  recipient: Joi.string().required(),
  type: Joi.string()
    .valid(
      "appointment",
      "plan_update",
      "payment",
      "system",
      "task",
      "message",
      "alert"
    )
    .required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  priority: Joi.string().valid("low", "medium", "high", "urgent"),
  actionUrl: Joi.string(),
  metadata: Joi.object(),
  expiresAt: Joi.date(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("read", "archived").required(),
});

const updateMultipleSchema = Joi.object({
  notificationIds: Joi.array().items(Joi.string()).required(),
  status: Joi.string().valid("read", "archived").required(),
});

// Routes
router.post(
  "/",
  auth.protect,
  validate(createNotificationSchema),
  notificationController.createNotification
);

router.get("/", auth.protect, notificationController.getUserNotifications);

router.get("/stats", auth.protect, notificationController.getNotificationStats);

router.patch(
  "/:notificationId",
  auth.protect,
  validate(updateStatusSchema),
  notificationController.updateNotificationStatus
);

router.patch(
  "/batch/update",
  auth.protect,
  validate(updateMultipleSchema),
  notificationController.updateMultipleNotifications
);

router.delete(
  "/:notificationId",
  auth.protect,
  notificationController.deleteNotification
);

// Plan notification routes
router.get("/plan", auth.protect, notificationController.getPlanNotifications);

router.patch(
  "/plan/:planId",
  auth.protect,
  validate(
    Joi.object({
      status: Joi.string().valid("read", "unread", "archived").required(),
    })
  ),
  notificationController.updatePlanNotifications
);

router.get(
  "/plan/stats",
  auth.protect,
  notificationController.getPlanNotificationStats
);

export default router;
