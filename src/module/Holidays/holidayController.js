import asyncHandler from "express-async-handler";
import Holiday from "./holidayModel.js";
import AppError from "../../utils/AppError.js";
import User from "../userModule/userModel.js";
import Notification from "../notification/notificationModel.js";

// Create a new holiday request
export const createHolidayRequest = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, days, reason } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Ensure request is at least 24h in advance
  if (startDate - new Date() < 24 * 60 * 60 * 1000) {
    return next(
      new AppError("You must request a holiday at least 24h in advance", 400)
    );
  }

  if (user.holidaysTaken + days >= 27) {
    return next(
      new AppError("You have reached the maximum number of holidays", 400)
    );
  }

  const holiday = await Holiday.create({
    user: req.user._id,
    startDate,
    endDate,
    reason,
    days,
  });

  await Notification.create({
    recipient: user.LM,
    sender: req.user._id,
    type: "holiday_request",
    title: "New Holiday Request",
    message: `A new holiday request has been created by ${req.user.name}`,
    priority: "urgent",
    actionUrl: `/holiday-details/${holiday._id}`,
    metadata: {
      holidayId: holiday._id,
    },
  });

  const HR = await User.findOne({ role: "HR" });
  if (!HR) {
    return next(new AppError("HR not found", 404));
  }

  await Notification.create({
    recipient: HR._id,
    sender: req.user._id,
    type: "holiday_request",
    title: "New Holiday Request",
    message: `A new holiday request has been created by ${req.user.name}`,
    priority: "urgent",
    actionUrl: `/holiday-details/${holiday._id}`,
    metadata: {
      holidayId: holiday._id,
    },
  });

  res.status(201).json({
    status: "success",
    message: "Holiday request created successfully",
    data: holiday,
  });
});

// Get all holiday requests of the current user
export const getHolidayRequests = asyncHandler(async (req, res, next) => {
  const holidays = await Holiday.find({ user: req.user._id });
  res.status(200).json({
    status: "success",
    message: "Holiday requests fetched successfully",
    data: holidays,
  });
});

// Approve or reject a holiday request
export const approveRejectHoliday = asyncHandler(async (req, res, next) => {
  const { holidayId } = req.params;
  const { status } = req.body;
  const holiday = await Holiday.findById(holidayId);

  if (!holiday) {
    return next(new AppError("Holiday request not found", 404));
  }

  if (holiday.approvedBy.includes(req.user._id)) {
    return next(
      new AppError("You have already approved this holiday request", 400)
    );
  }

  // Add current user to approvedBy array
  holiday.approvedBy.push(req.user._id);

  // If status is reject, set it directly
  if (status === "rejected") {
    holiday.status = "rejected";
  } else {
    // Check if approvedBy array has 2 approvals after adding current user
    if (holiday.approvedBy.length === 2) {
      holiday.status = "approved";
      const user = await User.findById(holiday.user);
      if (!user) {
        return next(new AppError("User not found", 404));
      }
      user.holidaysTaken += holiday.days;
      await user.save();
    } else {
      // Keep status as pending if not yet 2 approvals
      holiday.status = "pending";
    }
  }

  await holiday.save();

  res.status(200).json({
    status: "success",
    message: "Holiday request updated successfully",
    data: holiday,
  });
});

//Calculate The Remaining Holidays
export const calculateRemainingHolidays = asyncHandler(
  async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    const remainingHolidays = 27 - user.holidaysTaken;
    res.status(200).json({
      status: "success",
      message: "Remaining holidays calculated successfully",
      data: remainingHolidays,
    });
  }
);

//Get Holiday By Id
export const getHolidayById = asyncHandler(async (req, res, next) => {
  const { holidayId } = req.params;
  const holiday = await Holiday.findById(holidayId)
    .populate("user")
    .populate("approvedBy");
  if (!holiday) {
    return next(new AppError("Holiday not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Holiday fetched successfully",
    data: holiday,
  });
});

//Get User Holiday
export const getUserHoliday = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  const userHolidays = await Holiday.find({ user: user._id });
  res.status(200).json({
    status: "success",
    message: "User holidays fetched successfully",
    data: userHolidays,
  });
});
