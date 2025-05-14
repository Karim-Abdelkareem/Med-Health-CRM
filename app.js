// src/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";
import userRoutes from "./src/module/userModule/userRoutes.js";
import userProfileRoutes from "./src/module/userModule/userProfileRoutes.js";
import authRoutes from "./src/module/auth/authRoutes.js";
import planRoutes from "./src/module/plan/plan.routes.js";
import locationRoutes from "./src/module/location/locationRoutes.js";
import monthlyRoutes from "./src/module/monthlyPlan/monthlyRoutes.js";
import dashboardRoutes from "./src/module/dashboard/dashboardRoutes.js";
import notificationRoutes from "./src/module/notification/notificationRoutes.js";
import holidayRoutes from "./src/module/Holidays/holidayRouter.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

//Allow Cors
app.use(
  cors({
    origin: [`${process.env.localUrl}`, `${process.env.productionUrl}`],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// Connect to database
connectDB();

// Routes
app.get("/api/check-auth", (req, res) => {
  console.log(req.cookies);

  if (req.cookies.access_token) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});
app.use("/api/users", userRoutes);
app.use("/api/user", userProfileRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/monthly-plans", monthlyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/holidays", holidayRoutes);

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
