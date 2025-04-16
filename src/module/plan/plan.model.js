// src/module/plan/plan.model.js
import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
  date: { type: Date, required: true },
  region: { type: String, required: true },
  notes: { type: String },
}, { timestamps: true });


const Plan = mongoose.model('Plan', planSchema);

export default Plan;


