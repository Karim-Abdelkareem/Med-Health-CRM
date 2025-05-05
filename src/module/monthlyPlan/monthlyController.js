import monthlyModel from "./monthlyModel.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";
import Plan from "../plan/plan.model.js";

export const createMonthlyPlan = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, plans, notes } = req.body;

  if (!plans || !Array.isArray(plans)) {
    return next(new AppError("Plans must be an array", 400));
  }

  // Create all individual plans
  const createdPlans = await Promise.all(
    plans.map(async (plan) => {
      const transformedLocations = plan.locations.map((id) => ({
        location: id,
        status: "incomplete", // default status
      }));

      const createdPlan = await Plan.create({
        user: req.user._id,
        visitDate: plan.visitDate,
        locations: transformedLocations,
        tasks: plan.tasks || [],
        notes: plan.notes && plan.notes.length > 0 ? plan.notes : [],
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
    notes: notes || "",
  });

  res.status(201).json({
    status: "success",
    message: "Monthly plan created successfully",
    data: {
      user: monthlyPlan.user,
      plans: monthlyPlan.plans,
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

  const monthlyPlan = await monthlyModel
    .findOne({
      user: req.user._id,
      startDate: { $lte: lastDayOfMonth },
      endDate: { $gte: firstDayOfMonth },
    })
    .populate({
      path: "plans",
      populate: {
        path: "locations.location",
      },
    })
    .populate({
      path: "plans",
      populate: {
        path: "notes.location",
      },
    })
    .populate({
      path: "plans",
      populate: {
        path: "hrNotes.location hrNotes.user",
      },
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
