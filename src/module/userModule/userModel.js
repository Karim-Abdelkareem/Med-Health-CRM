import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    LM: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    Area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    DM: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    governate: {
      type: String,
    },
    role: {
      type: String,
      enum: ["ADMIN", "GM", "LM", "Area", "DM", "HR", "R"],
      default: "R",
    },
    active: {
      type: Boolean,
      default: true,
    },
    holidaysTaken: { type: Number, default: 0 },
    kpi: { type: Number, default: 100 },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", function (next) {
  if (this.isModified("password")) {
    this.password = bcrypt.hashSync(this.password, 10);
  }
  next();
});

userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }
  next();
});

userSchema.pre("updateOne", async function (next) {
  const update = this.getUpdate();
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }
  next();
});
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
