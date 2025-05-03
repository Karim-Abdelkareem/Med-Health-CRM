import asyncHandler from "express-async-handler";
import User from "./userModel.js";
import AppError from "../../utils/AppError.js";
import Plan from "../plan/plan.model.js";

export const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return next(new AppError("Please provide all required fields", 400));
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new AppError("User already exists", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
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
  const user = await User.findById(req.params.id);

  if (user) {
    res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: user,
    });
  }
});

export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (user) {
    res.status(200).json({
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
    res.status(200).json({
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
    res.status(200).json({
      status: "success",
      message: "User profile fetched successfully",
      data: user,
    });
  }
  return next(new AppError("User not found", 404));
});

export const getUsersByRole = asyncHandler(async (req, res, next) => {
  console.log(req.query.role);

  const users = await User.find({ role: req.query.role });
  res.status(200).json({
    status: "success",
    message: "Users fetched successfully",
    data: users,
  });
});

function calculateKPI(visitsCount) {
  const kpiBase = 100;

  if (visitsCount >= 10) {
    return kpiBase;
  } else {
    const penalty = 0.1;
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

    const newKPI = calculateKPI(visitsCount);

    user.kpi = newKPI;
    await user.save();

    return newKPI;
  } catch (err) {
    throw new Error(`Error updating KPI: ${err.message}`);
  }
};

export const calculateMonthlyKPI = async (userId) => {
  const plans = await Plan.find({ user: userId, type: "monthly" });

  let totalVisits = 0;
  plans.forEach((plan) => {
    totalVisits += plan.region.length;
  });

  const kpi = totalVisits * 10;

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

      const totalVisits = plans.reduce(
        (sum, plan) => sum + (plan.region.length || 0),
        0
      );
      const maxExpectedVisits = plans.length * 10;

      let kpi = 100;
      if (maxExpectedVisits > 0) {
        kpi = Math.round((totalVisits / maxExpectedVisits) * 100);
      }

      employee.kpi = kpi;
      await employee.save();

      kpiReport.push({
        employeeId: employee._id,
        name: employee.name,
        email: employee.email,
        totalPlans: plans.length,
        totalVisits,
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
