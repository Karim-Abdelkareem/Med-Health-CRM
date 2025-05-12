import express from "express";
import * as holidayController from "./holidayController.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router.post("/", auth.protect, holidayController.createHolidayRequest);

router.get("/", auth.protect, holidayController.getHolidayRequests);

router.patch(
  "/:holidayId",
  auth.protect,
  holidayController.approveRejectHoliday
);

router.get(
  "/calculate-remaining-holidays",
  auth.protect,
  holidayController.calculateRemainingHolidays
);

router.get(
  "/holiday/:holidayId",
  auth.protect,
  holidayController.getHolidayById
);

router.get("/user/:id", auth.protect, holidayController.getUserHoliday);

export default router;
