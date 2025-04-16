// src/module/plan/plan.routes.js
import express from "express";
import { createPlan, getMyPlans, getMyPlansByFilter, updatePlan, deletePlan } from "./plan.controller.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router.post("/", auth.protect, createPlan);
router.get("/all", auth.protect, getMyPlans);
router.get("/", auth.protect, getMyPlansByFilter);
router.put("/:id", auth.protect, updatePlan);
router.delete("/:id", auth.protect, deletePlan);

export default router;
