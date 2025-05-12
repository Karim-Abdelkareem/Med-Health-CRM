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
        startLatitude: { type: Number },
        startLongitude: { type: Number },
        startDate: { type: Date },
        endLatitude: { type: Number },
        endLongitude: { type: Number },
        endDate: { type: Date },
        takesFromUs: { type: Boolean, default: false },
        amount: { type: Number },
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
        note: { type: String },
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
        note: { type: String },
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
        note: { type: String },
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
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
