import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    locationName: { type: String, required: true },
    address: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    village: { type: String, required: false },
    longitude: { type: Number, required: true },
    latitude: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Location", locationSchema);
