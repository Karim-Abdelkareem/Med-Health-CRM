// src/module/plan/plan.routes.js
import express from "express";
import {
  createPlan,
  getMyPlans,
  getMyPlansByFilter,
  updatePlan,
  deletePlan,
  addManagerNote,
  getPlansByHierarchy,
  updateVisitedRegion,
  getMyPlansWithDate,
  unvisitRegion,
  getMonthlyPlans,
} from "./plan.controller.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router.post("/", auth.protect, createPlan);
router.get("/date", auth.protect, getMyPlansWithDate);
router.get("/all", auth.protect, getMyPlans);
router.get("/", auth.protect, getMyPlansByFilter);
router.put("/:id", auth.protect, updatePlan);
router.delete("/:id", auth.protect, deletePlan);
router.patch("/:id/manager-note", auth.protect, addManagerNote);
router.get("/all-under-me", auth.protect, getPlansByHierarchy);
router.put("/complete/:id/:region", auth.protect, updateVisitedRegion);
router.put("/unvisit/:id/:region", auth.protect, unvisitRegion);
router.get("/monthly", auth.protect, getMonthlyPlans);

export default router;
