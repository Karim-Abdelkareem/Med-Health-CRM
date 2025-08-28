import monthlyModel from "./monthlyModel.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";
import Plan from "../plan/plan.model.js";
import mongoose from "mongoose";
import User from "../userModule/userModel.js";

export const createMonthlyPlan = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, plans, notes } = req.body;
  console.log(req.body);

  // Validate plans
  if (!plans || !Array.isArray(plans)) {
    return next(new AppError("Plans must be an array", 400));
  }

  // Create all individual plans
  const createdPlans = await Promise.all(
    plans.map(async (plan) => {
      // Ensure locations is a valid array
      const transformedLocations = Array.isArray(plan.locations)
        ? plan.locations.map((id) => ({
            location: id,
            status: "incomplete", // default status
          }))
        : [];

      // Ensure tasks is an array
      const safeTasks = Array.isArray(plan.tasks) ? plan.tasks : [];

      // Ensure notes is an array
      const safeNotes = Array.isArray(plan.notes) ? plan.notes : [];

      const createdPlan = await Plan.create({
        user: req.user._id,
        visitDate: plan.visitDate,
        locations: transformedLocations,
        tasks: safeTasks,
        notes: safeNotes,
      });

      return createdPlan._id;
    })
  );

  // Create the monthly plan
  const monthlyPlan = await monthlyModel.create({
    user: req.user._id,
    startDate,
    endDate,
    plans: createdPlans,
    notes: Array.isArray(notes) ? notes : notes || "", // support array or string
  });

  res.status(201).json({
    status: "success",
    message: "Monthly plan created successfully",
    data: {
      user: monthlyPlan.user,
      plans: monthlyPlan.plans, // IDs only unless populated
    },
  });
});

export const getMyPlans = asyncHandler(async (req, res) => {
  const plans = await monthlyModel
    .find({ user: req.user._id })
    .sort({
      startDate: 1,
    })
    .populate({ path: "plans", populate: { path: "locations.location" } });

  res.status(200).json({
    status: "success",
    data: plans,
  });
});

export const getCurrentMonthPlans = asyncHandler(async (req, res, next) => {
  const now = new Date();

  // Current month range
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // Try to get current month plan
  let monthlyPlan = await monthlyModel
    .findOne({
      user: req.user._id,
      startDate: { $lte: lastDayOfMonth },
      endDate: { $gte: firstDayOfMonth },
    })
    .populate({
      path: "plans",
      populate: [
        { path: "locations.location" },
        { path: "notes.location" },
        { path: "hrNotes.location hrNotes.user" },
        { path: "lmNotes.location lmNotes.user" },
        { path: "gmNotes.location gmNotes.user" },
        { path: "dmNotes.location dmNotes.user" },
      ],
    });

  // If no current month plan, check next month
  if (!monthlyPlan) {
    const firstDayNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );
    const lastDayNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 2,
      0,
      23,
      59,
      59,
      999
    );

    monthlyPlan = await monthlyModel
      .findOne({
        user: req.user._id,
        startDate: { $lte: lastDayNextMonth },
        endDate: { $gte: firstDayNextMonth },
      })
      .populate({
        path: "plans",
        populate: [
          { path: "locations.location" },
          { path: "notes.location" },
          { path: "hrNotes.location hrNotes.user" },
          { path: "lmNotes.location lmNotes.user" },
          { path: "gmNotes.location gmNotes.user" },
          { path: "dmNotes.location dmNotes.user" },
        ],
      });
  }

  if (!monthlyPlan) {
    return next(
      new AppError("No monthly plan found for the current or next month", 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: monthlyPlan,
  });
});

export const deleteMonthlyPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid monthly plan ID", 400));
  }

  const monthlyPlan = await monthlyModel.findById(id);

  if (!monthlyPlan) {
    return next(new AppError("Monthly plan not found", 404));
  }

  const planIds = monthlyPlan.plans;

  try {
    if (planIds && planIds.length > 0) {
      await Plan.deleteMany({ _id: { $in: planIds } });
    }

    await monthlyModel.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Monthly plan and all associated plans deleted successfully",
    });
  } catch (error) {
    return next(
      new AppError(`Error deleting monthly plan: ${error.message}`, 500)
    );
  }
});

export const getUserCurrentMonthPlan = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  const now = new Date();

  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const monthlyPlan = await monthlyModel.findOne({
    user: userId,
    startDate: { $lte: lastDayOfMonth },
    endDate: { $gte: firstDayOfMonth },
  });

  if (!monthlyPlan) {
    return next(
      new AppError("No monthly plan found for the current month", 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: monthlyPlan,
  });
});
