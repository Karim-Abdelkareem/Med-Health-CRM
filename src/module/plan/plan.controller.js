import Plan from "./plan.model.js";
import { rolesHierarchy, canAccessHigherRole } from "../../utils/roles.js";
import User from "../userModule/userModel.js";
import { updateKPI } from "../userModule/userController.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";

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
      region,
      tasks,
      notes,
    });

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

//update Visited Region
export const updateVisitedRegion = asyncHandler(async (req, res) => {
  const { id, region: regionId } = req.params;
  const { visitedLatitude, visitedLongitude } = req.body;

  const plan = await Plan.findById(id);

  if (!plan) return new AppError("Plan not found", 404);

  if (plan.user.toString() !== req.user._id.toString()) {
    return new AppError("Unauthorized", 403);
  }

  const selectedRegion = plan.region.id(regionId);

  if (!selectedRegion) new AppError("Region not found", 404);

  selectedRegion.visitedLatitude = visitedLatitude;
  selectedRegion.visitedLongitude = visitedLongitude;
  selectedRegion.visitedDate = new Date();
  selectedRegion.status = "completed";

  await plan.save();
  res.status(200).json({ message: "Visited Region updated successfully" });
});

//
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
