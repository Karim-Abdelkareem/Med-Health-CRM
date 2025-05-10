import express from "express";
import * as userProfileController from "./userProfileController.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

// المسارات
router.get("/profile", auth.protect, userProfileController.getUserProfile);

router.patch("/profile", auth.protect, userProfileController.updateUserProfile);

router.patch(
  "/change-password",
  auth.protect,
  userProfileController.changePassword
);

router.patch(
  "/settings",
  auth.protect,
  userProfileController.updateUserSettings
);

router.get(
  "/activity-log",
  auth.protect,
  userProfileController.getUserActivityLog
);

router.patch(
  "/profile-picture",
  auth.protect,
  userProfileController.updateProfilePicture
);

export default router;
