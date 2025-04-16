// src/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";
import userRoutes from "./src/module/userModule/userRoutes.js";
import authRoutes from "./src/module/auth/authRoutes.js";
import planRoutes from "./src/module/plan/plan.routes.js";

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);

// Home Route
app.get("/", (req, res) => {
  res.send("Hello Med-Health-CRM!");
});

// Route not found
app.use("*", (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
