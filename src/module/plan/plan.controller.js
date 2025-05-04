import Plan from "./plan.model.js";
import { rolesHierarchy, canAccessHigherRole } from "../../utils/roles.js";
import User from "../userModule/userModel.js";
import { updateKPI } from "../userModule/userController.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";

// Helper function to create daily plans
const createDailyPlans = async (weeklyPlan, region) => {
  const dailyPlans = [];

  // Create 7 daily plans for each week
  for (let i = 0; i < 7; i++) {
    let dailyPlan = {
      type: "daily",
      date: new Date(weeklyPlan.date.getTime() + i * 24 * 60 * 60 * 1000),
      region: [],
      tasks: weeklyPlan.tasks || [],
      notes: weeklyPlan.notes,
    };

    // Add 12 regions (visits) per daily plan
    for (let j = 0; j < 12; j++) {
      dailyPlan.region.push({
        location: region.location,
        doctorName: region.doctorName,
        latitude: region.latitude,
        longitude: region.longitude,
        visitTime: region.visitTime,
      });
    }

    const newDailyPlan = await Plan.create(dailyPlan);
    dailyPlans.push(newDailyPlan);
  }

  return dailyPlans;
};

// Create a new plan (monthly, weekly, or daily)
export const createPlan = async (req, res) => {
  try {
    const { type, date, tasks, region, notes } = req.body;
    let warningMessage = null;

    if (type === "daily" && region.length < 10) {
      warningMessage = "You should have at least 10 locations for daily plan";
    }

    const newPlan = await Plan.create({
      user: req.user._id,
      type,
      date,
      region: region || undefined,
      tasks: tasks || undefined,
      notes,
    });

    if (type === "monthly") {
      // Automatically create 4 weekly plans for monthly plan
      const weeklyPlans = await createWeeklyPlans(newPlan, region);
      return res.status(201).json({
        success: true,
        message: "Monthly plan created successfully",
        data: newPlan,
        warning: warningMessage,
      });
    }

    if (type === "weekly") {
      // Automatically create 7 daily plans for weekly plan
      const dailyPlans = await createDailyPlans(newPlan, region);
      return res.status(201).json({
        success: true,
        message: "Weekly plan created successfully",
        data: dailyPlans,
        warning: warningMessage,
      });
    }

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: newPlan,
      warning: warningMessage,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error creating plan",
      error: err.message,
    });
  }
};

// Create weekly plans for monthly plan
const createWeeklyPlans = async (monthlyPlan, region) => {
  const weeklyPlans = [];
  for (let i = 0; i < 4; i++) {
    let weeklyPlan = {
      type: "weekly",
      date: new Date(monthlyPlan.date.getTime() + i * 7 * 24 * 60 * 60 * 1000), // Offset by one week for each plan
      region: region || [],
      tasks: monthlyPlan.tasks || [],
      notes: monthlyPlan.notes,
    };

    const newWeeklyPlan = await Plan.create(weeklyPlan);
    weeklyPlans.push(newWeeklyPlan);

    // Automatically create 7 daily plans for each weekly plan
    await createDailyPlans(newWeeklyPlan, region);
  }
  return weeklyPlans;
};

// Get all plans of the current user filtered by type
export const getMyPlans = async (req, res) => {
  const { type } = req.query;
  try {
    const plans = await Plan.find({ user: req.user._id, type }).sort({
      date: 1,
    });
    res.json(plans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching plans", error: err.message });
  }
};

// Update an existing plan
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    if (plan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedPlan = await Plan.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedPlan);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating plan", error: err.message });
  }
};

// Delete an existing plan
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    if (plan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await plan.deleteOne();
    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting plan", error: err.message });
  }
};

// Get plans of the current user based on filter
export const getMyPlansByFilter = async (req, res) => {
  try {
    const { keyword, type, date, startDate, endDate } = req.query;
    let filter = { user: req.user._id };

    if (type) {
      if (["daily", "weekly", "monthly"].includes(type)) {
        filter.type = type;
      } else {
        return res.json([]);
      }
    }

    if (keyword && keyword.trim() !== "") {
      filter.$or = [
        { region: { $regex: keyword, $options: "i" } },
        { notes: { $regex: keyword, $options: "i" } },
      ];
    }

    if (date) {
      const exactDate = new Date(date);
      if (!isNaN(exactDate)) {
        const nextDay = new Date(exactDate);
        nextDay.setDate(exactDate.getDate() + 1);

        filter.date = {
          $gte: exactDate,
          $lt: nextDay,
        };
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start) && !isNaN(end)) {
        filter.date = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const plans = await Plan.find(filter).sort({ date: 1 });
    res.json(plans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching plans", error: err.message });
  }
};

// Add manager note to a user's plan
export const addManagerNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const plan = await Plan.findById(id).populate("user");

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const currentUserRole = req.user.role;
    const targetUserRole = plan.user.role;

    if (canAccessHigherRole(currentUserRole, targetUserRole)) {
      plan.managerNotes = note;
      await plan.save();
      return res.json({ message: "Note added successfully", plan });
    } else {
      return res
        .status(403)
        .json({ message: "Not authorized to add notes to this user's plan" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error adding note", error: err.message });
  }
};

// Fetch plans based on user role hierarchy
export const getPlansByHierarchy = async (req, res) => {
  try {
    const currentUserRole = req.user.role;
    const users = await User.find({
      role: {
        $in: Object.keys(rolesHierarchy).filter((role) =>
          canAccessHigherRole(currentUserRole, role)
        ),
      },
    });

    const userIds = users.map((u) => u._id);
    const plans = await Plan.find({ user: { $in: userIds } })
      .populate("user")
      .sort({ date: 1 });

    res.json(plans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching plans", error: err.message });
  }
};

// Update visited region information in a plan
export const updateVisitedRegion = asyncHandler(async (req, res, next) => {
  const { id, region: regionId } = req.params;
  const { visitedLatitude, visitedLongitude } = req.body;

  const plan = await Plan.findById(id);

  if (!plan) return next(new AppError("Plan not found", 404));

  if (plan.user.toString() !== req.user._id.toString()) {
    return next(new AppError("Unauthorized", 403));
  }

  const selectedRegion = plan.region.id(regionId);

  if (!selectedRegion) return next(new AppError("Region not found", 404));

  selectedRegion.visitedLatitude = visitedLatitude;
  selectedRegion.visitedLongitude = visitedLongitude;
  selectedRegion.visitedDate = new Date();
  selectedRegion.status = "completed";

  await plan.save();
  res.status(200).json({ message: "Visited Region updated successfully" });
});

// Unvisit region in a plan
export const unvisitRegion = asyncHandler(async (req, res, next) => {
  const { id, region: regionId } = req.params;

  const plan = await Plan.findById(id);

  if (!plan) return next(new AppError("Plan not found", 404));

  if (plan.user.toString() !== req.user._id.toString()) {
    return next(new AppError("Unauthorized", 403));
  }

  const selectedRegion = plan.region.id(regionId);

  if (!selectedRegion) return next(new AppError("Region not found", 404));

  selectedRegion.visitedLatitude = null;
  selectedRegion.visitedLongitude = null;
  selectedRegion.visitedDate = null;
  selectedRegion.status = "pending";

  await plan.save();
  res.status(200).json({ message: "Region unvisited successfully" });
});

// Get plans filtered by user role and date range
export const getMonthlyPlans = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, userId } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Please provide both start and end dates", 400));
  }

  const plans = await Plan.find({
    user: userId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  });

  if (plans) {
    res.status(200).json({
      status: "success",
      message: "User's monthly plans fetched successfully",
      data: plans,
    });
  } else {
    return next(new AppError("No plans found for this period", 404));
  }
});
export const getMyPlansWithDate = async (req, res) => {
  const { type } = req.query;

  // Get today's start and end date
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Get the start and end date of this week (from Sunday to Saturday)
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Set to Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  // Get the start and end date of this month (from the 1st to the last day of the month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1); // Set to the 1st day of the month
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(startOfMonth.getMonth() + 1); // Move to the next month
  endOfMonth.setDate(0); // Set to the last day of the current month
  endOfMonth.setHours(23, 59, 59, 999);

  try {
    let plans;

    // Based on the `type` (today, weekly, monthly), fetch the respective plans
    if (type === "daily") {
      plans = await Plan.find({
        user: req.user._id,
        type: "daily",
        date: { $gte: startOfDay, $lte: endOfDay },
      }).sort({ date: 1 });
    } else if (type === "weekly") {
      plans = await Plan.find({
        user: req.user._id,
        type: "weekly",
        date: { $gte: startOfWeek, $lte: endOfWeek },
      }).sort({ date: 1 });
    } else if (type === "monthly") {
      plans = await Plan.find({
        user: req.user._id,
        type: "monthly",
        date: { $gte: startOfMonth, $lte: endOfMonth },
      }).sort({ date: 1 });
    } else {
      return res.status(400).json({ message: "Invalid plan type" });
    }

    res.json(plans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching plans", error: err.message });
  }
};
