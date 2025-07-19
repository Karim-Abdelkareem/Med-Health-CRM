import monthlyModel from "./monthlyModel.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";
import Plan from "../plan/plan.model.js";
import mongoose from "mongoose";
import User from "../userModule/userModel.js";

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
    })
    .populate({
      path: "plans",
      populate: {
        path: "lmNotes.location lmNotes.user",
      },
    })
    .populate({
      path: "plans",
      populate: {
        path: "gmNotes.location gmNotes.user",
      },
    })
    .populate({
      path: "plans",
      populate: {
        path: "dmNotes.location dmNotes.user",
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

export const deleteMonthlyPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Check if ID is valid
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid monthly plan ID", 400));
  }

  // Find the monthly plan
  const monthlyPlan = await monthlyModel.findById(id);

  if (!monthlyPlan) {
    return next(new AppError("Monthly plan not found", 404));
  }

  // Get all plan IDs associated with this monthly plan
  const planIds = monthlyPlan.plans;

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Delete all individual plans
    if (planIds && planIds.length > 0) {
      // Use the plan IDs directly - Mongoose can handle ObjectIds
      await Plan.deleteMany({ _id: { $in: planIds } }, { session });
    }

    // Delete the monthly plan
    await monthlyModel.findByIdAndDelete(id, { session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Monthly plan and all associated plans deleted successfully",
    });
  } catch (error) {
    // Abort transaction in case of error
    await session.abortTransaction();
    session.endSession();
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
