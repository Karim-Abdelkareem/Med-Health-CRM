import mongoose from "mongoose";

const dashboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recentActivities: [
      {
        type: {
          type: String,
          enum: ["login", "plan_created", "patient_added", "task_completed"],
        },
        description: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notifications: [
      {
        message: String,
        type: { type: String, enum: ["info", "warning", "success", "error"] },
        read: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      notificationsEnabled: { type: Boolean, default: true },
      language: { type: String, default: "ar" },
    },
  },
  {
    timestamps: true,
  }
);

const Dashboard = mongoose.model("Dashboard", dashboardSchema);
export default Dashboard;
