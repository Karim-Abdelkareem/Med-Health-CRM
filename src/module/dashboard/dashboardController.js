import asyncHandler from "express-async-handler";
import Dashboard from "./dashboardModel.js";
import User from "../userModule/userModel.js";
import Plan from "../plan/plan.model.js";
import Location from "../location/locationModel.js";
import Notification from "../notification/notificationModel.js";
import AppError from "../../utils/AppError.js";

// Get dashboard data for all users in the project
export const getDashboardData = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Set date range for the current month
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // Run parallel queries to improve performance
  let dashboard = await Dashboard.findOne({ userId });
  if (!dashboard) {
    dashboard = await Dashboard.create({ userId });
  }
  const [currentUser, allUsers, allPlans, allLocations, allNotifications] =
    await Promise.all([
      User.findById(userId),
      User.find().select(
        "_id name email role kpi active LM DM Area governate holidaysTaken"
      ),
      Plan.find({ visitDate: { $gte: startOfMonth, $lte: endOfMonth } })
        .populate("user", "_id")
        .lean(),
      Location.find().select("user").lean(),
      Notification.find().select("recipient status").lean(),
    ]);

  if (!currentUser) {
    return next(new AppError("User not found", 404));
  }

  // Pre-process data to avoid repeated queries
  // Index plans by user
  const plansByUser = {};
  allPlans.forEach((plan) => {
    const userId = plan.user?._id?.toString();
    if (!userId) return;

    if (!plansByUser[userId]) {
      plansByUser[userId] = [];
    }
    plansByUser[userId].push(plan);
  });

  // Count locations by user
  const locationCountByUser = {};
  allLocations.forEach((location) => {
    const userId = location.user?.toString();
    if (!userId) return;

    locationCountByUser[userId] = (locationCountByUser[userId] || 0) + 1;
  });

  // Count notifications by user
  const notificationCountByUser = {};
  allNotifications.forEach((notification) => {
    const userId = notification.recipient?.toString();
    if (!userId) return;

    if (notification.status === "unread") {
      notificationCountByUser[userId] =
        (notificationCountByUser[userId] || 0) + 1;
    }
  });

  // Calculate system-wide statistics
  const systemStats = calculateSystemWideStatistics(
    allUsers,
    allPlans,
    allLocations,
    allNotifications
  );

  // Process monthly KPI data once instead of repeatedly
  const monthlyKPIData = await calculateAllMonthlyKPIData(
    allUsers,
    currentDate
  );

  // Process all users' data
  const usersData = allUsers.map((user) => {
    const userId = user._id.toString();
    const userPlans = plansByUser[userId] || [];

    // Calculate KPI statistics
    let totalVisits = 0;
    let completedVisits = 0;

    userPlans.forEach((plan) => {
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
        locationsCount: locationCountByUser[userId] || 0,
        activePlans: userPlans.length,
      },
      notificationData: {
        unreadNotifications: notificationCountByUser[userId] || 0,
      },
      holidayData: {
        remainingHolidays: 27 - (user.holidaysTaken || 0),
        holidaysTaken: user.holidaysTaken || 0,
      },
      monthlyKPI: monthlyKPIData[userId] || [],
    };
  });

  // Prepare dashboard data
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
    allEmployeesMonthlyKPI: calculateAverageMonthlyKPI(
      monthlyKPIData,
      currentDate
    ),
    allUsers: usersData,
  };

  // Add role-specific statistics based on current user's role
  if (currentUser.role === "GM") {
    // GM-specific statistics without additional DB queries
    dashboardData.gmStats = calculateGMStatistics(allUsers);
  } else if (currentUser.role === "HR") {
    // HR-specific statistics without additional DB queries
    dashboardData.hrStats = calculateHRStatistics(allUsers);
  }

  res.status(200).json({
    status: "success",
    data: dashboardData,
  });
});

// Calculate system-wide statistics using pre-fetched data
const calculateSystemWideStatistics = (
  allUsers,
  allPlans,
  allLocations,
  allNotifications
) => {
  // Get user counts by role
  const userCountsByRole = {};
  let totalActiveUsers = 0;

  allUsers.forEach((user) => {
    userCountsByRole[user.role] = (userCountsByRole[user.role] || 0) + 1;
    if (user.active) {
      totalActiveUsers++;
    }
  });

  // Calculate visit statistics
  let totalVisits = 0;
  let completedVisits = 0;

  allPlans.forEach((plan) => {
    totalVisits += plan.locations.length;
    completedVisits += plan.locations.filter(
      (loc) => loc.status === "completed"
    ).length;
  });

  // Calculate system KPI
  const systemKPI =
    totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

  // Count notifications
  const unreadNotifications = allNotifications.filter(
    (n) => n.status === "unread"
  ).length;

  return {
    users: {
      total: allUsers.length,
      active: totalActiveUsers,
      byRole: userCountsByRole,
    },
    locations: {
      total: allLocations.length,
    },
    plans: {
      total: allPlans.length,
      totalVisits,
      completedVisits,
      completionRate: systemKPI,
    },
    notifications: {
      total: allNotifications.length,
      unread: unreadNotifications,
    },
  };
};

// Calculate GM-specific statistics without additional queries
const calculateGMStatistics = (allUsers) => {
  // Filter non-management users
  const regularUsers = allUsers.filter(
    (user) => !["ADMIN", "GM", "HR"].includes(user.role)
  );

  // Sort by KPI for top performers
  const topPerformers = [...regularUsers]
    .sort((a, b) => (b.kpi || 0) - (a.kpi || 0))
    .slice(0, 5)
    .map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      kpi: user.kpi || 0,
    }));

  // Filter and sort for underperformers
  const underperformers = regularUsers
    .filter((user) => (user.kpi || 0) < 85)
    .sort((a, b) => (a.kpi || 0) - (b.kpi || 0))
    .slice(0, 5)
    .map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      kpi: user.kpi || 0,
    }));

  return {
    topPerformers,
    underperformers,
  };
};

// Calculate HR-specific statistics without additional queries
const calculateHRStatistics = (allUsers) => {
  let totalHolidaysTaken = 0;
  let totalRemainingHolidays = 0;

  allUsers.forEach((user) => {
    totalHolidaysTaken += user.holidaysTaken || 0;
    totalRemainingHolidays += 27 - (user.holidaysTaken || 0);
  });

  // Sort for top holiday users
  const topHolidayUsers = [...allUsers]
    .sort((a, b) => (b.holidaysTaken || 0) - (a.holidaysTaken || 0))
    .slice(0, 5)
    .map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      holidaysTaken: user.holidaysTaken || 0,
    }));

  return {
    holidays: {
      totalTaken: totalHolidaysTaken,
      totalRemaining: totalRemainingHolidays,
      topUsers: topHolidayUsers,
    },
  };
};

// Calculate monthly KPI data for all employees efficiently
const calculateAllMonthlyKPIData = async (employees, currentDate) => {
  const currentYear = currentDate.getFullYear();
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
  const results = {};

  // Get all plans for the current year up to current month in one query
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfCurrentMonth = new Date(
    currentYear,
    currentDate.getMonth() + 1,
    0
  );

  const allYearPlans = await Plan.find({
    visitDate: { $gte: startOfYear, $lte: endOfCurrentMonth },
  }).lean();

  // Index plans by month and user
  const plansByMonthAndUser = {};

  allYearPlans.forEach((plan) => {
    const userId = plan.user?.toString();
    if (!userId) return;

    const planMonth = new Date(plan.visitDate).getMonth();

    if (!plansByMonthAndUser[userId]) {
      plansByMonthAndUser[userId] = {};
    }

    if (!plansByMonthAndUser[userId][planMonth]) {
      plansByMonthAndUser[userId][planMonth] = [];
    }

    plansByMonthAndUser[userId][planMonth].push(plan);
  });

  // Calculate KPI data for each employee
  employees.forEach((employee) => {
    const userId = employee._id.toString();
    results[userId] = [];

    for (let month = 0; month <= currentDate.getMonth(); month++) {
      const userMonthPlans = plansByMonthAndUser[userId]?.[month] || [];

      let totalVisits = 0;
      let completedVisits = 0;

      userMonthPlans.forEach((plan) => {
        totalVisits += plan.locations.length;
        completedVisits += plan.locations.filter(
          (loc) => loc.status === "completed"
        ).length;
      });

      const requiredVisits = 26 * 12;
      const achieved =
        requiredVisits > 0
          ? Math.round((completedVisits / requiredVisits) * 100)
          : 0;

      results[userId].push({
        month: monthNames[month],
        target: 85,
        achieved,
      });
    }
  });

  return results;
};

// Calculate average monthly KPI across all employees
const calculateAverageMonthlyKPI = (monthlyKPIData, currentDate) => {
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
  const result = [];

  // For each month up to the current one
  for (let month = 0; month <= currentDate.getMonth(); month++) {
    let totalKPI = 0;
    let employeeCount = 0;

    // Sum KPI values for this month across all employees
    Object.values(monthlyKPIData).forEach((userData) => {
      if (userData[month] && userData[month].achieved) {
        totalKPI += userData[month].achieved;
        employeeCount++;
      }
    });

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

// Update user dashboard preferences - unchanged
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

// Add activity to user dashboard - unchanged
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

// Get dashboard notifications - unchanged
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

// Update notification status - unchanged
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
