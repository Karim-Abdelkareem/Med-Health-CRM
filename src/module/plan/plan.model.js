// src/module/plan/plan.model.js
import mongoose from "mongoose";

// plan.model.js
const planSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    date: { type: Date, required: true },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    visitDate: { type: Date, required: true },
    visitedLatitude: { type: Number },
    visitedLongitude: { type: Number },
    visitedDate: { type: Date },
    status: {
      type: String,
      enum: ["completed", "incomplete"],
      default: "incomplete",
    },
    tasks: [
      {
        task: { type: String, required: true },
        status: {
          type: String,
          enum: ["completed", "incomplete"],
          default: "pending",
        },
      },
    ],
    notes: String,
    gmNotes: {
      type: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      default: "",
    },
    lmNotes: {
      type: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      default: "",
    },
    hrNotes: {
      type: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      default: "",
    },
    dmNotes: {
      type: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      default: "",
    },
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
