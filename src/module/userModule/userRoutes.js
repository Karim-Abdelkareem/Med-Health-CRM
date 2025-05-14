import express from "express";
import * as userController from "./userController.js";
import validate from "../../middleware/validate.js";
import { userValidationSchema } from "./userValidator.js";
import auth from "../../middleware/authentication.js";
import { adminCreateUserSchema } from "../auth/authValidator.js";
import * as auhtController from "../auth/authController.js";

const router = express.Router();

router
  .route("/")
  .post(
    auth.protect,
    auth.allowedTo("ADMIN", "GM", "HR"),
    validate(adminCreateUserSchema),
    auhtController.createUserByAdminOrGM
  )
  .get(userController.getAllUsers)
  .get(userController.getUserProfile);

router.get(
  "/kpi/all",
  auth.protect,
  auth.allowedTo("admin", "GM", "HR"),
  userController.calculateKPIForAllEmployees
);
router.get(
  "/kpi/user/:userId",
  auth.protect,
  userController.calculateKPIForOneEmployee
);
router.get(
  "/kpi/stats/:userId",
  auth.protect,
  userController.getMonthlyKPIStats
);
router.get("/kpi/stats", auth.protect, userController.getMonthlyKPIStats);
router.get(
  "/kpi/completed-visits",
  auth.protect,
  userController.getCompletedVisitsKPI
);

router
  .route("/:userId")
  .get(userController.getUserById)
  .put(userController.updateUser)
  .delete(userController.deleteUser);

router.get("/get/role", auth.protect, userController.getUsersByRole);
router.get("/get/emp", auth.protect, userController.getAllEmployees);
router.patch(
  "/deactivate/:userId",
  auth.protect,
  userController.deactivateUser
);
router.patch(
  "/change-password/:userId",
  auth.protect,
  userController.changeUserPassword
);

export default router;
