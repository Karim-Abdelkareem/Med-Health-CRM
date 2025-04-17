// src/module/plan/plan.model.js
import mongoose from 'mongoose';

// plan.model.js
const planSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
  date: { type: Date, required: true },
  region: [
    {
      location: { type: String, required: true },
      visitDate: { type: Date, required: true },  
    }
  ],
  notes: String, 

  managerNotes: {
    type: String,
    default: "",
  },
}, { timestamps: true });



const Plan = mongoose.model('Plan', planSchema);

export default Plan;


