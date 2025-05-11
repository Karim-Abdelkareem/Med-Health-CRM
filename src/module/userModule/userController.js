import asyncHandler from "express-async-handler";
import User from "./userModel.js";
import AppError from "../../utils/AppError.js";
import Plan from "../plan/plan.model.js";

export const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, LM, DM, governate, role } = req.body;
  console.log(req.body);

  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new AppError("User already exists", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    LM: LM || undefined,
    DM: DM || undefined,
    governate: governate || undefined,
  });

  if (user) {
    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  }
});

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({});

  if (users) {
    res.status(200).json({
      status: "success",
      message: "Users fetched successfully",
      data: users,
    });
  }
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (user) {
    res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: user,
    });
  }
});

export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
    runValidators: true,
  });
  if (user) {
    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (user) {
    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (user) {
    return res.status(200).json({
      status: "success",
      message: "User profile fetched successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});

export const getUsersByRole = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  switch (req.user.role) {
    case "GM":
      const gmUsers = await User.find({
        role: req.query.role,
        _id: { $ne: userId },
      });
      return res.status(200).json({
        status: "success",
        message: "Users fetched successfully",
        data: gmUsers,
      });
      break;
    case "HR":
      const HRUsers = await User.find({
        role: req.query.role,
        _id: { $ne: userId },
      });
      return res.status(200).json({
        status: "success",
        message: "Users fetched successfully",
        data: HRUsers,
      });
      break;
    case "LM":
      const LMUsers = await User.find({
        role: req.query.role,
        LM: req.user._id,
        _id: { $ne: req.user._id },
      });
      return res.status(200).json({
        status: "success",
        message: "Users fetched successfully",
        data: LMUsers,
      });
      break;
    case "Area":
      const AreaUsers = await User.find({
        role: req.query.role,
        Area: req.user._id,
        _id: { $ne: userId },
      });
      return res.status(200).json({
        status: "success",
        message: "Users fetched successfully",
        data: AreaUsers,
      });
      break;
    case "DM":
      const DMUsers = await User.find({
        role: req.query.role,
        DM: req.user._id,
        _id: { $ne: userId },
      });
      return res.status(200).json({
        status: "success",
        message: "Users fetched successfully",
        data: DMUsers,
      });
      break;
    default:
      return next(
        new AppError("You are not authorized to access this route", 403)
      );
  }
});

export const getAllEmployees = asyncHandler(async (req, res, next) => {
  const users = await User.find({ role: { $nin: ["HR", "GM"] } });
  res.status(200).json({
    status: "success",
    message: "Users fetched successfully",
    data: users,
  });
});

export const deactivateUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return next(new AppError("User No Longer Exist!", 404));
  user.active = !user.active;
  await user.save();
  res.status(200).json({
    status: "success",
    message: `User ${user.active ? "activated" : "deactivated"} successfully`,
  });
});

function calculateKPI(
  visitsCount,
  completedVisits,
  workingDays = 26,
  requiredPerDay = 12
) {
  const kpiBase = 100;
  const requiredVisits = workingDays * requiredPerDay;

  // Calculate completion percentage
  const completionPercentage = (completedVisits / requiredVisits) * 100;

  if (completionPercentage >= 100) {
    // Full KPI if 100% or more visits completed
    return kpiBase;
  } else if (completionPercentage >= 85) {
    // No penalty if at least 85% of visits completed
    return kpiBase;
  } else {
    // Apply penalty if less than 85% of visits completed
    const penalty = 0.15;
    const reducedKPI = kpiBase * (1 - penalty);
    return reducedKPI;
  }
}

export const updateKPI = async (userId, visitsCount) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const completedVisits = visitsCount.filter(
      (visit) => visit.status === "completed"
    ).length;
    const newKPI = calculateKPI(visitsCount.length, completedVisits);

    user.kpi = newKPI;
    await user.save();

    return newKPI;
  } catch (err) {
    throw new Error(`Error updating KPI: ${err.message}`);
  }
};

export const calculateMonthlyKPI = async (userId) => {
  const plans = await Plan.find({ user: userId, type: "daily" });

  let totalVisits = 0;
  let completedVisits = 0;

  plans.forEach((plan) => {
    totalVisits += plan.locations.length;
    completedVisits += plan.locations.filter(
      (visit) => visit.status === "completed"
    ).length;
  });

  const workingDays = plans.length;
  const kpi = calculateKPI(totalVisits, completedVisits, workingDays);

  const user = await User.findById(userId);
  user.kpi = kpi;
  await user.save();

  return kpi;
};

export const calculateKPIForAllEmployees = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (!["ADMIN", "GM"].includes(userRole)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const users = await User.find({ role: { $nin: ["ADMIN", "GM"] } });

    const kpiReport = [];

    for (const employee of users) {
      const plans = await Plan.find({
        user: employee._id,
        type: "daily",
        date: { $gte: startOfMonth, $lt: endOfMonth },
      });

      let totalVisits = 0;
      let completedVisits = 0;

      plans.forEach((plan) => {
        totalVisits += plan.locations.length;
        completedVisits += plan.locations.filter(
          (visit) => visit.status === "completed"
        ).length;
      });

      const workingDays = plans.length;
      const kpi = calculateKPI(totalVisits, completedVisits, workingDays);

      employee.kpi = kpi;
      await employee.save();

      kpiReport.push({
        employeeId: employee._id,
        name: employee.name,
        email: employee.email,
        totalPlans: workingDays,
        totalVisits,
        completedVisits,
        kpi,
      });
    }

    res.status(200).json({
      success: true,
      message: "تم حساب KPI لجميع الموظفين",
      data: kpiReport,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حساب KPI",
      error: err.message,
    });
  }
};

export const calculateKPIForOneEmployee = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const kpi = await calculateMonthlyKPI(userId);

    res.status(200).json({
      success: true,
      message: "تم حساب KPI للمستخدم",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        kpi,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حساب KPI",
      error: err.message,
    });
  }
};

export const getMonthlyKPIStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Array to store monthly data
    const monthlyData = [];

    // Month names
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Process each month of the current year up to current month
    for (let month = 0; month < currentDate.getMonth() + 1; month++) {
      // Set date range for the month
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0);

      // Find plans for this month
      const plans = await Plan.find({
        user: userId,
        visitDate: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      // Calculate total and completed visits
      let totalVisits = 0;
      let completedVisits = 0;

      plans.forEach((plan) => {
        totalVisits += plan.locations.length;
        completedVisits += plan.locations.filter(
          (visit) => visit.status === "completed"
        ).length;
      });

      // Target is always 26 days * 12 locations = 312 visits
      const target = 85; // Target percentage

      // Calculate achieved percentage (as a whole number)
      const requiredVisits = 26 * 12; // Fixed target: 26 days * 12 locations
      let achieved = 0;
      if (requiredVisits > 0) {
        achieved = Math.round((completedVisits / requiredVisits) * 100);
      }

      // Add to monthly data array
      monthlyData.push({
        month: monthNames[month],
        target,
        achieved,
      });
    }

    res.status(200).json({
      success: true,
      message: "Monthly KPI statistics retrieved successfully",
      data: monthlyData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error retrieving monthly KPI statistics",
      error: err.message,
    });
  }
};
