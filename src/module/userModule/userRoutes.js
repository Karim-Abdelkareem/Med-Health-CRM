import express from "express";
import * as userController from "./userController.js";
import validate from "../../middleware/validate.js";
import { userValidationSchema } from "./userValidator.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router
  .route("/")
  .post(userController.createUser)
  .get(userController.getAllUsers)
  .get(userController.getUserProfile);

router.get(
  "/kpi/all",
  auth.protect,
  auth.allowedTo("admin", "GM"),
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

export default router;
