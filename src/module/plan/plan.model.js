// src/module/plan/plan.model.js
import mongoose from "mongoose";

// plan.model.js
const planSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    locations: [
      {
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        status: {
          type: String,
          enum: ["completed", "incomplete"],
          default: "incomplete",
        },
      },
    ],
    visitDate: { type: Date },
    visitedLatitude: { type: Number },
    visitedLongitude: { type: Number },
    visitedDate: { type: Date },
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
    notes: [
      {
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        note: { type: String, default: "" },
      },
    ],
    gmNotes: [
      {
        type: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        default: "",
      },
    ],
    lmNotes: [
      {
        type: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        default: "",
      },
    ],
    hrNotes: [
      {
        type: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        default: "",
      },
    ],
    dmNotes: [
      {
        type: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        default: "",
      },
    ],
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
