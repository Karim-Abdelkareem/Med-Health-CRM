import asyncHandler from "express-async-handler";
import User from "./userModel.js";
import AppError from "../../utils/AppError.js";
import Plan from "../plan/plan.model.js";

export const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, LM, DM, governate, role } = req.body;

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
        user,
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

export const changeUserPassword = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { currentUserPassword, password } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const confirm = await req.user.comparePassword(currentUserPassword);

  if (!confirm) {
    return next(new AppError("Current password is incorrect", 401));
  }

  user.password = password;
  await user.save();
  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
  });
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
  totalVisits,
  completedVisits,
  workingDays = 22,
  requiredPerDay = 10,
  requiredPercentage = 0.9
) {
  const kpiBase = 100;
  const requiredMonthly = workingDays * requiredPerDay; // 22 * 10 = 220
  const minRequiredVisits = requiredMonthly * requiredPercentage; // 220 * 0.9 = 198

  // Calculate completion percentage relative to required monthly visits
  const completionPercentage = (completedVisits / requiredMonthly) * 100;

  if (completionPercentage >= 90) {
    // Full KPI if 90% or more of required visits completed
    return kpiBase;
  } else {
    // Apply 15% penalty if less than 90% of required visits completed
    const penalty = 0.15;
    return kpiBase * (1 - penalty); // 85
  }
}

// KPI Calculation Functions
export const calculateKPIForAllEmployees = asyncHandler(
  async (req, res, next) => {
    const userRole = req.user.role;
    if (!["admin", "GM"].includes(userRole)) {
      return next(new AppError("ليس لديك صلاحية", 403));
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of current month

    const users = await User.find({ role: { $nin: ["admin", "GM"] } });

    const kpiReport = [];

    for (const employee of users) {
      const plans = await Plan.find({
        user: employee._id,
        visitDate: { $gte: startOfMonth, $lt: endOfMonth },
      });

      let totalVisits = 0;
      let completedVisits = 0;

      plans.forEach((plan) => {
        totalVisits += plan.locations.length;
        completedVisits += plan.locations.filter(
          (visit) => visit.status === "completed"
        ).length;
      });

      const workingDays = plans.length || 22;
      const requiredPerDay = 10;
      const requiredVisits = workingDays * requiredPerDay;

      const kpi = calculateKPI(
        totalVisits,
        completedVisits,
        workingDays,
        requiredPerDay
      );

      employee.kpi = kpi;
      await employee.save();

      kpiReport.push({
        employeeId: employee._id,
        name: employee.name,
        email: employee.email,
        totalPlans: workingDays,
        totalVisits,
        completedVisits,
        requiredVisits,
        completionPercentage:
          ((completedVisits / requiredVisits) * 100).toFixed(2) + "%",
        kpi,
      });
    }

    res.status(200).json({
      status: "success",
      message: "تم حساب KPI لجميع الموظفين",
      data: kpiReport,
    });
  }
);

export const calculateKPIForOneEmployee = asyncHandler(
  async (req, res, next) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const kpi = await calculateMonthlyKPI(userId);

    res.status(200).json({
      status: "success",
      message: "تم حساب KPI للمستخدم",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        kpi,
      },
    });
  }
);

export const getMonthlyKPIStats = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
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

    // Calculate working days based on plans or use standard 22 days
    const workingDays = plans.length || 22;
    const requiredVisits = workingDays * 12; // 12 visits per day

    // Target is 90%
    const target = 90;

    // Calculate achieved percentage (as a whole number)
    let achieved = 0;
    if (requiredVisits > 0) {
      achieved = Math.round((completedVisits / requiredVisits) * 100);
    }

    // Add to monthly data array
    monthlyData.push({
      month: monthNames[month],
      target,
      achieved,
      totalVisits,
      completedVisits,
      requiredVisits,
      kpi: achieved >= 90 ? 100 : 85,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Monthly KPI statistics retrieved successfully",
    data: monthlyData,
  });
});

// Endpoint to get KPI for completed visits
export const getCompletedVisitsKPI = asyncHandler(async (req, res, next) => {
  const { userId, month, year } = req.query;

  // If userId is provided, calculate for that user, otherwise use the current user
  const targetUserId = userId || req.user._id;

  // Convert month and year to numbers if provided
  const targetMonth = month ? parseInt(month) - 1 : null; // Subtract 1 as JS months are 0-indexed
  const targetYear = year ? parseInt(year) : null;

  try {
    // Check if user exists
    const user = await User.findById(targetUserId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Calculate KPI for completed visits
    const kpiData = await calculateCompletedVisitsKPI(
      targetUserId,
      targetMonth,
      targetYear
    );

    // Add user information to the response
    kpiData.user = {
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(200).json({
      status: "success",
      message: "KPI for completed visits calculated successfully",
      data: kpiData,
    });
  } catch (error) {
    return next(new AppError(`Error calculating KPI: ${error.message}`, 500));
  }
});

// Helper function for monthly KPI calculation
const calculateMonthlyKPI = async (userId) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0); // Last day of current month

  const plans = await Plan.find({
    user: userId,
    visitDate: { $gte: startOfMonth, $lt: endOfMonth },
  });

  let totalVisits = 0;
  let completedVisits = 0;

  plans.forEach((plan) => {
    totalVisits += plan.locations.length;
    completedVisits += plan.locations.filter(
      (visit) => visit.status === "completed"
    ).length;
  });

  // Calculate working days based on plans or use standard 22 days
  const workingDays = plans.length || 22;
  const requiredPerDay = 10;
  const requiredPercentage = 0.9; // 90%

  const kpi = calculateKPI(
    totalVisits,
    completedVisits,
    workingDays,
    requiredPerDay,
    requiredPercentage
  );

  const user = await User.findById(userId);
  user.kpi = kpi;
  await user.save();

  return kpi;
};

// Helper function for calculating KPI based on completed visits with updated requirements
const calculateCompletedVisitsKPI = async (
  userId,
  month = null,
  year = null
) => {
  // Set date range for the calculation
  let startOfMonth, endOfMonth;

  if (month !== null && year !== null) {
    // Use specified month and year
    startOfMonth = new Date(year, month, 1);
    endOfMonth = new Date(year, month + 1, 0);
  } else {
    // Use current month
    startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of current month
  }

  // Find plans for the specified date range
  const plans = await Plan.find({
    user: userId,
    visitDate: { $gte: startOfMonth, $lte: endOfMonth },
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

  // Use updated requirements: 10 visits per day, 22 days per month
  const workingDays = 22;
  const requiredPerDay = 10;
  const requiredMonthly = workingDays * requiredPerDay; // 22 * 10 = 220

  // Calculate completion percentage
  const completionPercentage = (completedVisits / requiredMonthly) * 100;

  // Determine KPI score and salary deduction status
  let kpiScore = 100;
  let salaryDeduction = false;

  // If completion percentage is below 90%, apply salary deduction
  if (completionPercentage < 90) {
    salaryDeduction = true;
  }

  return {
    userId,
    period: {
      month: startOfMonth.getMonth() + 1,
      year: startOfMonth.getFullYear(),
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    visits: {
      total: totalVisits,
      completed: completedVisits,
      required: requiredMonthly,
    },
    performance: {
      completionPercentage: parseFloat(completionPercentage.toFixed(2)),
      kpiScore,
      salaryDeduction,
    },
    plans: plans.length,
  };
};
