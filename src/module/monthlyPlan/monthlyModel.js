import mongoose from "mongoose";

const monthlyPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    plans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("MonthlyPlan", monthlyPlanSchema);
