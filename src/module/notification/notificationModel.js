import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["plan_update", "message", "holiday_request"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["unread", "read", "archived"],
      default: "unread",
    },
    actionUrl: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// إضافة فهارس للبحث السريع
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, priority: 1 });

// طريقة لتحديث حالة الإشعار
notificationSchema.methods.markAsRead = async function () {
  this.status = "read";
  return this.save();
};

// طريقة لأرشفة الإشعار
notificationSchema.methods.archive = async function () {
  this.status = "archived";
  return this.save();
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
