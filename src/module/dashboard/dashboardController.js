import asyncHandler from "express-async-handler";
import Dashboard from "./dashboardModel.js";
import User from "../userModule/userModel.js";
import Plan from "../plan/plan.model.js";
import Location from "../location/locationModel.js";
import Notification from "../notification/notificationModel.js";
// Holiday model is not directly used, but we calculate remaining holidays from user.holidaysTaken
import AppError from "../../utils/AppError.js";

// Get dashboard data for all users in the project
export const getDashboardData = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Get or create dashboard for the current user
  let dashboard = await Dashboard.findOne({ userId });

  if (!dashboard) {
    dashboard = await Dashboard.create({ userId });
  }

  // Get current user data
  const currentUser = await User.findById(userId);
  if (!currentUser) {
    return next(new AppError("User not found", 404));
  }

  // Get current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Set date range for the current month
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // Get all users in the system
  const allUsers = await User.find().select(
    "_id name email role kpi active LM DM Area governate holidaysTaken"
  );

  // Get system-wide statistics
  const systemStats = await getSystemWideStatistics(startOfMonth, endOfMonth);

  // Get monthly KPI data for all employees
  const allEmployeesMonthlyKPI = await getAllEmployeesMonthlyKPI();

  // Prepare base dashboard data
  let dashboardData = {
    currentUser: {
      _id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      kpi: currentUser.kpi || 100,
    },
    recentActivities: dashboard.recentActivities.slice(0, 5),
    preferences: dashboard.preferences,
    systemStats: systemStats,
    allEmployeesMonthlyKPI: allEmployeesMonthlyKPI,
    allUsers: [],
  };

  // Get data for all users
  const usersData = await Promise.all(
    allUsers.map(async (user) => {
      // Get plans for the current month for this user
      const plans = await Plan.find({
        user: user._id,
        visitDate: { $gte: startOfMonth, $lte: endOfMonth },
      });

      // Calculate KPI statistics
      let totalVisits = 0;
      let completedVisits = 0;

      plans.forEach((plan) => {
        totalVisits += plan.locations.length;
        completedVisits += plan.locations.filter(
          (loc) => loc.status === "completed"
        ).length;
      });

      // Calculate completion percentage
      const requiredVisits = 26 * 12; // 26 days * 12 locations
      const completionPercentage =
        requiredVisits > 0
          ? Math.round((completedVisits / requiredVisits) * 100)
          : 0;

      // Get unread notifications count
      const unreadNotifications = await Notification.countDocuments({
        recipient: user._id,
        status: "unread",
      });

      // Get remaining holidays
      const remainingHolidays = 27 - (user.holidaysTaken || 0);

      // Get locations count
      const locationsCount = await Location.countDocuments({ user: user._id });

      // Get monthly KPI data
      const monthlyData = await getMonthlyKPIData(user._id);

      // Return user data with statistics
      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          kpi: user.kpi || 100,
          active: user.active,
          LM: user.LM,
          DM: user.DM,
          Area: user.Area,
          governate: user.governate,
        },
        kpiData: {
          totalVisits,
          completedVisits,
          completionPercentage,
        },
        planData: {
          locationsCount,
          activePlans: plans.length,
        },
        notificationData: {
          unreadNotifications,
        },
        holidayData: {
          remainingHolidays,
          holidaysTaken: user.holidaysTaken || 0,
        },
        monthlyKPI: monthlyData,
      };
    })
  );

  // Add all users data to dashboard
  dashboardData.allUsers = usersData;

  // Add role-specific statistics based on current user's role
  if (currentUser.role === "GM") {
    // Additional GM-specific statistics
    dashboardData.gmStats = await getGMStatistics();
  } else if (currentUser.role === "HR") {
    // Additional HR-specific statistics
    dashboardData.hrStats = await getHRStatistics();
  }

  res.status(200).json({
    status: "success",
    data: dashboardData,
  });
});

// Get system-wide statistics for GM and HR
const getSystemWideStatistics = async (startOfMonth, endOfMonth) => {
  // Get total users count by role
  const userCounts = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  // Format user counts
  const userCountsByRole = {};
  userCounts.forEach((item) => {
    userCountsByRole[item._id] = item.count;
  });

  // Get total active users
  const totalActiveUsers = await User.countDocuments({ active: true });

  // Get total locations
  const totalLocations = await Location.countDocuments();

  // Get total plans for current month
  const totalPlans = await Plan.countDocuments({
    visitDate: { $gte: startOfMonth, $lte: endOfMonth },
  });

  // Get completed vs incomplete visits
  const allPlans = await Plan.find({
    visitDate: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let totalVisits = 0;
  let completedVisits = 0;

  allPlans.forEach((plan) => {
    totalVisits += plan.locations.length;
    completedVisits += plan.locations.filter(
      (loc) => loc.status === "completed"
    ).length;
  });

  // Calculate overall system KPI
  const systemKPI =
    totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

  // Get total notifications
  const totalNotifications = await Notification.countDocuments();
  const unreadNotifications = await Notification.countDocuments({
    status: "unread",
  });

  return {
    users: {
      total: Object.values(userCountsByRole).reduce((a, b) => a + b, 0),
      active: totalActiveUsers,
      byRole: userCountsByRole,
    },
    locations: {
      total: totalLocations,
    },
    plans: {
      total: totalPlans,
      totalVisits,
      completedVisits,
      completionRate: systemKPI,
    },
    notifications: {
      total: totalNotifications,
      unread: unreadNotifications,
    },
  };
};

// Get GM-specific statistics
const getGMStatistics = async () => {
  // Get top performing employees (highest KPI)
  const topPerformers = await User.find({
    role: { $nin: ["ADMIN", "GM", "HR"] },
  })
    .sort({ kpi: -1 })
    .limit(5)
    .select("name email role kpi");

  // Get underperforming employees (KPI < 85)
  const underperformers = await User.find({
    role: { $nin: ["ADMIN", "GM", "HR"] },
    kpi: { $lt: 85 },
  })
    .sort({ kpi: 1 })
    .limit(5)
    .select("name email role kpi");

  return {
    topPerformers,
    underperformers,
    // Add more GM-specific statistics as needed
  };
};

// Get HR-specific statistics
const getHRStatistics = async () => {
  // Get holiday statistics
  const users = await User.find();

  let totalHolidaysTaken = 0;
  let totalRemainingHolidays = 0;

  users.forEach((user) => {
    totalHolidaysTaken += user.holidaysTaken || 0;
    totalRemainingHolidays += 27 - (user.holidaysTaken || 0);
  });

  // Get users with most holidays taken
  const topHolidayUsers = await User.find()
    .sort({ holidaysTaken: -1 })
    .limit(5)
    .select("name email role holidaysTaken");

  return {
    holidays: {
      totalTaken: totalHolidaysTaken,
      totalRemaining: totalRemainingHolidays,
      topUsers: topHolidayUsers,
    },
    // Add more HR-specific statistics as needed
  };
};

// Get monthly KPI data for all employees
const getAllEmployeesMonthlyKPI = async () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

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

  // Get all regular employees
  const employees = await User.find({
    role: { $nin: ["ADMIN", "GM", "HR"] },
  }).select("_id name");

  // Initialize result array
  const result = [];

  // Process each month
  for (let month = 0; month < currentDate.getMonth() + 1; month++) {
    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 1, 0);

    // Calculate average KPI for this month
    let totalKPI = 0;
    let employeeCount = 0;

    for (const employee of employees) {
      const plans = await Plan.find({
        user: employee._id,
        visitDate: { $gte: startDate, $lte: endDate },
      });

      if (plans.length > 0) {
        let totalVisits = 0;
        let completedVisits = 0;

        plans.forEach((plan) => {
          totalVisits += plan.locations.length;
          completedVisits += plan.locations.filter(
            (visit) => visit.status === "completed"
          ).length;
        });

        const requiredVisits = 26 * 12;
        const achieved =
          requiredVisits > 0
            ? Math.round((completedVisits / requiredVisits) * 100)
            : 0;

        totalKPI += achieved;
        employeeCount++;
      }
    }

    const averageKPI =
      employeeCount > 0 ? Math.round(totalKPI / employeeCount) : 0;

    result.push({
      month: monthNames[month],
      target: 85,
      averageAchieved: averageKPI,
    });
  }

  return result;
};

// Helper function to get monthly KPI data for a single user
const getMonthlyKPIData = async (userId) => {
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
      visitDate: { $gte: startDate, $lte: endDate },
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

    // Target is always 85% (minimum required to avoid penalty)
    const target = 85;

    // Calculate achieved percentage
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

  return monthlyData;
};

// Update user dashboard preferences
export const updatePreferences = asyncHandler(async (req, res) => {
  const { theme, notificationsEnabled, language } = req.body;

  let dashboard = await Dashboard.findOne({ userId: req.user._id });

  if (!dashboard) {
    dashboard = await Dashboard.create({
      userId: req.user._id,
      preferences: { theme, notificationsEnabled, language },
    });
  } else {
    dashboard.preferences = {
      ...dashboard.preferences,
      ...(theme && { theme }),
      ...(notificationsEnabled !== undefined && { notificationsEnabled }),
      ...(language && { language }),
    };

    await dashboard.save();
  }

  res.status(200).json({
    status: "success",
    data: dashboard.preferences,
  });
});

// Add activity to user dashboard
export const addActivity = asyncHandler(async (req, res) => {
  const { type, description } = req.body;

  let dashboard = await Dashboard.findOne({ userId: req.user._id });

  if (!dashboard) {
    dashboard = await Dashboard.create({
      userId: req.user._id,
      recentActivities: [{ type, description }],
    });
  } else {
    dashboard.recentActivities.unshift({
      type,
      description,
      timestamp: new Date(),
    });

    // Limit to 20 activities
    if (dashboard.recentActivities.length > 20) {
      dashboard.recentActivities = dashboard.recentActivities.slice(0, 20);
    }

    await dashboard.save();
  }

  res.status(201).json({
    status: "success",
    data: dashboard.recentActivities[0],
  });
});

// Get dashboard notifications
export const getNotifications = asyncHandler(async (req, res) => {
  let dashboard = await Dashboard.findOne({ userId: req.user._id });

  if (!dashboard) {
    dashboard = await Dashboard.create({ userId: req.user._id });
  }

  res.status(200).json({
    status: "success",
    data: dashboard.notifications,
  });
});

// Update notification status
export const updateNotificationStatus = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const { read } = req.body;

  const dashboard = await Dashboard.findOne({ userId: req.user._id });

  if (!dashboard) {
    return next(new AppError("Dashboard not found", 404));
  }

  const notification = dashboard.notifications.id(notificationId);

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  notification.read = read;
  await dashboard.save();

  res.status(200).json({
    status: "success",
    data: notification,
  });
});
