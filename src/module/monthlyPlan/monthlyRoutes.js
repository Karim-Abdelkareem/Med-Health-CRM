import express from "express";
import * as monthlyController from "./monthlyController.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router.post("/", auth.protect, monthlyController.createMonthlyPlan);
router.get("/", auth.protect, monthlyController.getMyPlans);
router.get("/current", auth.protect, monthlyController.getCurrentMonthPlans);

export default router;
