import asyncHandler from "express-async-handler";
import Notification from "./notificationModel.js";
import AppError from "../../utils/AppError.js";

// Create a new notification
export const createNotification = asyncHandler(async (req, res) => {
  const {
    recipient,
    type,
    title,
    message,
    priority,
    actionUrl,
    metadata,
    expiresAt,
  } = req.body;

  const notification = await Notification.create({
    recipient,
    sender: req.user._id,
    type,
    title,
    message,
    priority,
    actionUrl,
    metadata,
    expiresAt,
  });

  // Here you can add real-time notification logic
  // emitNotification(notification);

  res.status(201).json({
    status: "success",
    data: notification,
  });
});

// Get user notifications
export const getUserNotifications = asyncHandler(async (req, res) => {
  const { status, type, priority, page = 1, limit = 20 } = req.query;

  const query = { recipient: req.user._id };
  if (status) query.status = status;
  if (type) query.type = type;
  if (priority) query.priority = priority;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate("sender", "name email");

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    status: "success",
    data: {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Update notification status
export const updateNotificationStatus = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const { status } = req.body;

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (status === "read") {
    await notification.markAsRead();
  } else if (status === "archived") {
    await notification.archive();
  }

  res.status(200).json({
    status: "success",
    data: notification,
  });
});

// Update multiple notifications
export const updateMultipleNotifications = asyncHandler(async (req, res) => {
  const { notificationIds, status } = req.body;

  const result = await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: req.user._id,
    },
    { status }
  );

  res.status(200).json({
    status: "success",
    message: `${result.modifiedCount} notifications updated`,
  });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  res.status(200).json({
    status: "success",
    message: "Notification deleted successfully",
  });
});

// Get notification statistics
export const getNotificationStats = asyncHandler(async (req, res) => {
  const stats = await Notification.aggregate([
    {
      $match: {
        recipient: req.user._id,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const typeStats = await Notification.aggregate([
    {
      $match: {
        recipient: req.user._id,
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      statusStats: stats,
      typeStats,
    },
  });
});

// Get plan notifications
export const getPlanNotifications = asyncHandler(async (req, res) => {
  const { planId, page = 1, limit = 20 } = req.query;

  const query = {
    recipient: req.user._id,
    type: "plan_update",
  };

  if (planId) {
    query["metadata.planId"] = planId;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate("sender", "name email role");

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    status: "success",
    data: {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Update plan notifications status
export const updatePlanNotifications = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { status } = req.body;

  const result = await Notification.updateMany(
    {
      recipient: req.user._id,
      type: "plan_update",
      "metadata.planId": planId,
      status: { $ne: status },
    },
    { status }
  );

  res.status(200).json({
    status: "success",
    message: `${result.modifiedCount} notifications updated`,
  });
});

// Get plan notification statistics
export const getPlanNotificationStats = asyncHandler(async (req, res) => {
  const stats = await Notification.aggregate([
    {
      $match: {
        recipient: req.user._id,
        type: "plan_update",
      },
    },
    {
      $group: {
        _id: {
          status: "$status",
          noteType: "$metadata.noteType",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedStats = stats.reduce((acc, curr) => {
    const { status, noteType } = curr._id;
    if (!acc[noteType]) {
      acc[noteType] = {};
    }
    acc[noteType][status] = curr.count;
    return acc;
  }, {});

  res.status(200).json({
    status: "success",
    data: formattedStats,
  });
});
