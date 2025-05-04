import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError.js";
import Location from "./locationModel.js";

export const createLocation = asyncHandler(async (req, res, next) => {
  const { locationName, address, state, city, longitude, latitude } = req.body;
  const location = await Location.create({
    user: req.user._id,
    locationName,
    address,
    state,
    city,
    longitude,
    latitude,
  });
  await location.save();
  res.status(201).json({
    status: "success",
    message: "Location created successfully",
    data: {
      _id: location._id,
      locationName: location.locationName,
      address: location.address,
      state: location.state,
      city: location.city,
      longitude: location.longitude,
      latitude: location.latitude,
    },
  });
});

export const getAllLocations = asyncHandler(async (req, res, next) => {
  const locations = await Location.find({ user: req.user._id });
  if (locations && locations.length > 0) {
    return res.status(200).json({
      status: "success",
      message: "Locations fetched successfully",
      data: locations,
    });
  }
  return next(new AppError("Locations not found", 404));
});

export const getLocationById = asyncHandler(async (req, res, next) => {
  const location = await Location.findById(req.params.id);
  if (location) {
    return res.status(200).json({
      status: "success",
      message: "Location fetched successfully",
      data: location,
    });
  }
  return next(new AppError("Location not found", 404));
});

export const updateLocation = asyncHandler(async (req, res, next) => {
  const location = await Location.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (location) {
    return res.status(200).json({
      status: "success",
      message: "Location updated successfully",
      data: location,
    });
  }
  return next(new AppError("Location not found", 404));
});

export const deleteLocation = asyncHandler(async (req, res, next) => {
  const location = await Location.findByIdAndDelete(req.params.id);
  if (location) {
    return res.status(200).json({
      status: "success",
      message: "Location deleted successfully",
      data: location,
    });
  }
  return next(new AppError("Location not found", 404));
});
