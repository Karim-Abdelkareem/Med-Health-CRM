import Plan from "./plan.model.js";
import { rolesHierarchy, canAccessHigherRole } from "../../utils/roles.js";
import User from "../userModule/userModel.js";
import { updateKPI } from "../userModule/userController.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";
import Notification from "../notification/notificationModel.js";

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
  const { id, locationId } = req.params;
  const { startLatitude, startLongitude } = req.body;

  // Validate input
  if (!startLatitude || !startLongitude) {
    return next(
      new AppError("Please provide both latitude and longitude", 400)
    );
  }

  try {
    // Find the plan
    const plan = await Plan.findById(id);

    if (!plan) {
      return next(new AppError("Plan not found", 404));
    }

    // Check if user is authorized to update this plan
    if (plan.user.toString() !== req.user._id.toString()) {
      return next(
        new AppError("You are not authorized to update this plan", 403)
      );
    }

    // Try to find by _id
    let locationIndex = plan.locations.findIndex(
      (loc) => loc._id && loc._id.toString() === locationId
    );
    // If not found, try to find by location field
    if (locationIndex === -1) {
      locationIndex = plan.locations.findIndex(
        (loc) => loc.location && loc.location.toString() === locationId
      );
    }

    if (locationIndex === -1) {
      // Log all location IDs for debugging
      console.log(
        "All location IDs:",
        plan.locations.map((loc) => ({
          _id: loc._id ? loc._id.toString() : "undefined",
          location: loc.location ? loc.location.toString() : "undefined",
        }))
      );
      return next(new AppError("Location not found in this plan", 404));
    }

    // Check if notes is a string and convert it to an array if needed
    if (typeof plan.notes === "string") {
      // First, update the plan to convert notes from string to array
      await Plan.findByIdAndUpdate(
        id,
        { $set: { notes: [] } },
        { runValidators: false }
      );
    }

    // Create an update object with only the fields we want to change
    const updateData = {
      $set: {
        [`locations.${locationIndex}.startLatitude`]: startLatitude,
        [`locations.${locationIndex}.startLongitude`]: startLongitude,
        [`locations.${locationIndex}.startDate`]: new Date(),
      },
    };

    // Update the plan using findByIdAndUpdate to avoid validation issues with other fields
    await Plan.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: false,
    });

    return res.status(200).json({
      status: "success",
      message: "Location marked as completed successfully",
      data: {
        planId: plan._id,
        locationId,
        startLatitude,
        startLongitude,
        startDate: new Date(),
      },
    });
  } catch (error) {
    return next(
      new AppError(`Error updating location status: ${error.message}`, 500)
    );
  }
});

//End the Visit
export const endVisitedRegion = asyncHandler(async (req, res, next) => {
  const { id, locationId } = req.params;
  const { endLatitude, endLongitude } = req.body;

  // Validate input
  if (!endLatitude || !endLongitude) {
    return next(
      new AppError("Please provide both latitude and longitude", 400)
    );
  }

  // Find the plan
  const plan = await Plan.findById(id);

  if (!plan) {
    return next(new AppError("Plan not Found", 404));
  }

  if (plan.user.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to update this plan", 403)
    );
  }
  let locationIndex = plan.locations.findIndex(
    (loc) => loc._id && loc._id.toString() === locationId
  );
  // If not found, try to find by location field
  if (locationIndex === -1) {
    locationIndex = plan.locations.findIndex(
      (loc) => loc.location && loc.location.toString() === locationId
    );
  }

  if (locationIndex === -1) {
    return next(new AppError("Location not found in this plan", 404));
  }
  if (typeof plan.notes === "string") {
    // First, update the plan to convert notes from string to array
    await Plan.findByIdAndUpdate(
      id,
      { $set: { notes: [] } },
      { runValidators: false }
    );
  }

  // Create an update object with only the fields we want to change
  const updateData = {
    $set: {
      [`locations.${locationIndex}.status`]: "completed",
      [`locations.${locationIndex}.endLatitude`]: endLatitude,
      [`locations.${locationIndex}.endLongitude`]: endLongitude,
      [`locations.${locationIndex}.endDate`]: new Date(),
    },
  };

  // Update the plan using findByIdAndUpdate to avoid validation issues with other fields
  await Plan.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: false,
  });

  return res.status(200).json({
    status: "success",
    message: "Location marked as completed successfully",
    data: {
      planId: plan._id,
      locationId,
      endLatitude,
      endLongitude,
      endDate: new Date(),
    },
  });
});

// Unvisit region in a plan
export const unvisitRegion = asyncHandler(async (req, res, next) => {
  const { id, locationId } = req.params;

  try {
    // Find the plan
    const plan = await Plan.findById(id);

    if (!plan) {
      return next(new AppError("Plan not found", 404));
    }

    // Check if user is authorized to update this plan
    if (plan.user.toString() !== req.user._id.toString()) {
      return next(
        new AppError("You are not authorized to update this plan", 403)
      );
    }

    // Try to find by _id
    let locationIndex = plan.locations.findIndex(
      (loc) => loc._id && loc._id.toString() === locationId
    );

    // If not found, try to find by location field
    if (locationIndex === -1) {
      locationIndex = plan.locations.findIndex(
        (loc) => loc.location && loc.location.toString() === locationId
      );
    }

    if (locationIndex === -1) {
      // Log all location IDs for debugging
      console.log(
        "All location IDs:",
        plan.locations.map((loc) => ({
          _id: loc._id ? loc._id.toString() : "undefined",
          location: loc.location ? loc.location.toString() : "undefined",
        }))
      );
      return next(new AppError("Location not found in this plan", 404));
    }

    // Check if notes is a string and convert it to an array if needed
    if (typeof plan.notes === "string") {
      // First, update the plan to convert notes from string to array
      await Plan.findByIdAndUpdate(
        id,
        { $set: { notes: [] } },
        { runValidators: false }
      );
    }

    // Create an update object with only the fields we want to change
    const updateData = {
      $set: {
        [`locations.${locationIndex}.status`]: "incomplete",
        [`locations.${locationIndex}.visitedLatitude`]: null,
        [`locations.${locationIndex}.visitedLongitude`]: null,
        [`locations.${locationIndex}.visitedDate`]: null,
      },
    };

    // Update the plan using findByIdAndUpdate to avoid validation issues with other fields
    await Plan.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: false,
    });

    return res.status(200).json({
      status: "success",
      message: "Location marked as incomplete successfully",
      data: {
        planId: plan._id,
        locationId,
      },
    });
  } catch (error) {
    return next(
      new AppError(`Error updating location status: ${error.message}`, 500)
    );
  }
});

// Get plans filtered by user role and visit date range
export const getMonthlyPlans = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, userId } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Please provide both start and end dates", 400));
  }

  if (!userId) {
    return next(new AppError("User ID is required", 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    return next(new AppError("Invalid start or end date format", 400));
  }

  const plans = await Plan.find({
    user: userId,
    visitDate: { $gte: start, $lte: end },
  })
    .populate("locations.location")
    .populate("user")
    .sort({ visitDate: 1 })
    .exec();

  if (plans.length > 0) {
    return res.status(200).json({
      status: "success",
      message: "User's monthly plans fetched successfully",
      data: plans,
    });
  } else {
    return next(new AppError("No plans found for this period", 404));
  }
});

// Get plans by visit date range
export const getPlansByVisitDate = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  if (!startDate || !endDate) {
    return next(new AppError("Please provide both start and end dates", 400));
  }

  try {
    // Find plans where at least one location has a visitDate within the specified range
    const plans = await Plan.find({
      user: userId,
      visitDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("locations.location")
      .populate("user")
      .populate("hrNotes.location hrNotes.user");

    if (plans && plans.length > 0) {
      return res.status(200).json({
        status: "success",
        message: "Plans fetched successfully",
        data: plans,
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "No plans found for this period",
        data: [],
      });
    }
  } catch (error) {
    return next(new AppError(`Error fetching plans: ${error.message}`, 500));
  }
});

// Add notes to plan location
export const addNotesToPlanLocation = asyncHandler(async (req, res, next) => {
  const { planId, locationId } = req.params;
  const { note } = req.body;

  if (!note || typeof note !== "string" || !note.trim()) {
    return next(new AppError("Note content is required", 400));
  }

  const plan = await Plan.findById(planId);

  if (!plan) return next(new AppError("Plan not found", 404));

  if (plan.user.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to update this plan", 403)
    );
  }

  const locationIndex = plan.locations.findIndex(
    (loc) => loc._id?.toString() === locationId
  );
  if (locationIndex === -1) {
    return next(new AppError("Location not found in this plan", 404));
  }

  const newNote = {
    location: plan.locations[locationIndex].location,
    note: note.trim(),
  };

  plan.notes.push(newNote);
  await plan.save();

  return res.status(200).json({
    status: "success",
    message: "Note added to location successfully",
    data: {
      note: newNote,
    },
  });
});

// Add role-based notes to plan location
export const addRoleBasedNotesToPlan = asyncHandler(async (req, res, next) => {
  const { planId, locationId } = req.params;
  const { note } = req.body;
  const userRole = req.user.role;

  // Validate input
  if (!note || typeof note !== "string" || !note.trim()) {
    return next(new AppError("Note content is required", 400));
  }

  try {
    // Find the plan
    const plan = await Plan.findById(planId)
      .populate("user")
      .populate("locations.location");

    if (!plan) {
      return next(new AppError("Plan not found", 404));
    }

    // Find the location in the plan
    const locationIndex = plan.locations.findIndex(
      (loc) => loc._id?.toString() === locationId
    );

    if (locationIndex === -1) {
      return next(new AppError("Location not found in this plan", 404));
    }

    const locationObj = plan.locations[locationIndex].location;

    // Create the note object
    const noteObj = {
      user: req.user._id,
      location: locationObj,
      note: note.trim(),
    };

    // Determine which notes array to update based on user role
    let notesField;
    switch (userRole) {
      case "GM":
        notesField = "gmNotes";
        break;
      case "LM":
        notesField = "lmNotes";
        break;
      case "HR":
        notesField = "hrNotes";
        break;
      case "DM":
        notesField = "dmNotes";
        break;
      default:
        return next(
          new AppError("Your role does not have permission to add notes", 403)
        );
    }

    // Check if the notes field is a string and convert it to an array if needed
    if (typeof plan[notesField] === "string") {
      await Plan.findByIdAndUpdate(
        planId,
        { $set: { [notesField]: [] } },
        { runValidators: false }
      );

      const updatedPlan = await Plan.findById(planId);
      if (!updatedPlan) {
        return next(new AppError("Plan not found after update", 404));
      }

      if (typeof updatedPlan[notesField] === "string") {
        return next(
          new AppError(`Could not convert ${notesField} to array`, 500)
        );
      }
    }

    // Use $push to add the note to the appropriate array
    const updateData = {
      $push: { [notesField]: noteObj },
    };

    // Update the plan
    await Plan.findByIdAndUpdate(planId, updateData, {
      new: true,
      runValidators: false,
    });

    // Create notification for the representative
    const notificationTitle = `New Note from ${userRole}`;
    const notificationMessage = `A new note has been added by ${req.user.name} on location ${plan.locations[locationIndex].location.locationName}`;

    await Notification.create({
      recipient: plan.user._id,
      sender: req.user._id,
      type: "plan_update",
      title: notificationTitle,
      message: notificationMessage,
      priority: "medium",
      actionUrl: `/location-details/${planId}/${plan.locations[locationIndex].location._id}`,
      metadata: {
        planId,
        locationId,
        noteType: userRole,
        noteContent: note.trim(),
        locationName: plan.locations[locationIndex].location.locationName,
      },
    });

    return res.status(200).json({
      status: "success",
      message: `Note added to ${userRole} notes successfully`,
      data: {
        planId,
        locationId,
        role: userRole,
        note: note.trim(),
      },
    });
  } catch (error) {
    return next(new AppError(`Error adding note: ${error.message}`, 500));
  }
});

// Edit note in plan location
export const editNoteInPlanLocation = asyncHandler(async (req, res, next) => {
  const { planId, locationId, noteId } = req.params;
  const { note } = req.body;

  if (!note || typeof note !== "string" || !note.trim()) {
    return next(new AppError("Note content is required", 400));
  }

  const plan = await Plan.findById(planId);

  if (!plan) return next(new AppError("Plan not found", 404));

  if (plan.user.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to update this plan", 403)
    );
  }

  const locationIndex = plan.locations.findIndex(
    (loc) => loc._id?.toString() === locationId
  );
  if (locationIndex === -1) {
    return next(new AppError("Location not found in this plan", 404));
  }

  const noteIndex = plan.notes.findIndex((n) => n._id?.toString() === noteId);
  if (noteIndex === -1) {
    return next(new AppError("Note not found in this plan", 404));
  }

  plan.notes[noteIndex].note = note.trim();
  await plan.save();

  return res.status(200).json({
    status: "success",
    message: "Note updated successfully",
    data: {
      note: plan.notes[noteIndex],
    },
  });
});

// Delete note in plan location
export const deleteNoteInPlanLocation = asyncHandler(async (req, res, next) => {
  const { planId, locationId, noteId } = req.params;

  const plan = await Plan.findById(planId);

  if (!plan) return next(new AppError("Plan not found", 404));

  if (plan.user.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to update this plan", 403)
    );
  }

  const locationIndex = plan.locations.findIndex(
    (loc) => loc._id?.toString() === locationId
  );
  if (locationIndex === -1) {
    return next(new AppError("Location not found in this plan", 404));
  }

  const noteIndex = plan.notes.findIndex((n) => n._id?.toString() === noteId);
  if (noteIndex === -1) {
    return next(new AppError("Note not found in this plan", 404));
  }

  plan.notes.splice(noteIndex, 1);
  await plan.save();

  return res.status(200).json({
    status: "success",
    message: "Note deleted successfully",
    data: {
      noteId,
    },
  });
});

// Get Plan by id
export const getPlanById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const plan = await Plan.findById(id)
    .populate("locations.location")
    .populate("hrNotes.user");
  if (!plan) return next(new AppError("Plan not found", 404));
  res.status(200).json(plan);
});

//incomplete plan
export const incompletePlanLocation = asyncHandler(async (req, res, next) => {
  const { id, locationId } = req.params;
  const { note } = req.body;
  const userRole = req.user.role;

  try {
    // Find the plan with populated location data
    const plan = await Plan.findById(id).populate("locations.location");

    if (!plan) {
      return next(new AppError("Plan not found", 404));
    }

    // Try to find by _id
    let locationIndex = plan.locations.findIndex(
      (loc) => loc._id && loc._id.toString() === locationId
    );

    // If not found, try to find by location field
    if (locationIndex === -1) {
      locationIndex = plan.locations.findIndex(
        (loc) =>
          loc.location &&
          loc.location._id &&
          loc.location._id.toString() === locationId
      );
    }

    if (locationIndex === -1) {
      return next(new AppError("Location not found in this plan", 404));
    }

    // Get the location object
    const locationObj = plan.locations[locationIndex].location;
    const locationName = locationObj.locationName || "Unknown Location";

    // Check if notes is a string and convert it to an array if needed
    if (typeof plan.notes === "string") {
      // First, update the plan to convert notes from string to array
      await Plan.findByIdAndUpdate(
        id,
        { $set: { notes: [] } },
        { runValidators: false }
      );
    }

    // Create an update object with only the fields we want to change
    const updateData = {
      $set: {
        [`locations.${locationIndex}.status`]: "incomplete",
      },
    };

    // Update the plan using findByIdAndUpdate to avoid validation issues with other fields
    await Plan.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: false,
    });

    // Add a note if provided
    if (note && note.trim()) {
      // Determine which notes array to update based on user role
      let notesField;
      switch (userRole) {
        case "GM":
          notesField = "gmNotes";
          break;
        case "LM":
          notesField = "lmNotes";
          break;
        case "HR":
          notesField = "hrNotes";
          break;
        case "DM":
          notesField = "dmNotes";
          break;
        default:
          notesField = "notes";
      }

      // Check if the notes field is a string and convert it to an array if needed
      if (typeof plan[notesField] === "string") {
        await Plan.findByIdAndUpdate(
          id,
          { $set: { [notesField]: [] } },
          { runValidators: false }
        );
      }

      // Create the note object
      const noteObj = {
        user: req.user._id,
        location: locationObj._id || locationObj,
        type: note.trim(),
      };

      // If it's a regular note (not role-based), use a different structure
      if (notesField === "notes") {
        await Plan.findByIdAndUpdate(
          id,
          {
            $push: {
              notes: {
                location: locationObj._id || locationObj,
                note: note.trim(),
              },
            },
          },
          { runValidators: false }
        );
      } else {
        // Add the note to the appropriate role-based notes array
        await Plan.findByIdAndUpdate(
          id,
          { $push: { [notesField]: noteObj } },
          { runValidators: false }
        );
      }
    }

    // Create notification for the plan owner
    const notificationTitle = `Location Status Changed by ${userRole}`;
    const notificationMessage = `Location "${locationName}" has been marked as Incompleted by ${req.user.name}`;

    await Notification.create({
      recipient: plan.user._id,
      sender: req.user._id,
      type: "plan_update",
      title: notificationTitle,
      message: notificationMessage,
      priority: "high",
      actionUrl: `/location-details/${id}/${locationObj._id || locationId}`,
      metadata: {
        planId: id,
        locationId: locationObj._id ? locationObj._id.toString() : locationId,
        statusChange: "incomplete",
        changedBy: userRole,
        noteContent: note ? note.trim() : null,
        locationName: locationName,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Location marked as incomplete successfully",
      data: {
        planId: plan._id,
        locationId,
        noteAdded: note ? true : false,
        notification: {
          title: notificationTitle,
          message: notificationMessage,
        },
      },
    });
  } catch (error) {
    return next(
      new AppError(`Error updating location status: ${error.message}`, 500)
    );
  }
});
