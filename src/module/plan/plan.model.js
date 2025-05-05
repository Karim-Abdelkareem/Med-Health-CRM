// src/module/plan/plan.model.js
import mongoose from "mongoose";

// plan.model.js
const planSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visitDate: { type: Date },
    locations: [
      {
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
        },
        status: {
          type: String,
          enum: ["completed", "incomplete"],
          default: "incomplete",
        },
        visitedLatitude: { type: Number },
        visitedLongitude: { type: Number },
        visitedDate: { type: Date },
      },
    ],

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
        note: { type: String },
      },
    ],
    gmNotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        type: { type: String },
      },
    ],
    lmNotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        type: { type: String },
      },
    ],
    hrNotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        type: { type: String },
      },
    ],
    dmNotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        type: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
