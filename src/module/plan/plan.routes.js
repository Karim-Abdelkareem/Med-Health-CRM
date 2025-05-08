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
  unvisitRegion,
  getMonthlyPlans,
  addNotesToPlanLocation,
  getPlansByVisitDate,
  deleteNoteInPlanLocation,
  editNoteInPlanLocation,
  addRoleBasedNotesToPlan,
  getPlanById,
  incompletePlanLocation,
} from "./plan.controller.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router.post("/", auth.protect, createPlan);
router.get("/all", auth.protect, getMyPlans);
router.get("/", auth.protect, getMyPlansByFilter);
router.put("/:id", auth.protect, updatePlan);
router.delete("/:id", auth.protect, deletePlan);
router.patch("/:id/manager-note", auth.protect, addManagerNote);
router.get("/all-under-me", auth.protect, getPlansByHierarchy);
router.put("/complete/:id/:locationId", auth.protect, updateVisitedRegion);
router.put("/unvisit/:id/:locationId", auth.protect, unvisitRegion);
router.get("/monthly", auth.protect, getMonthlyPlans);
router.get("/by-visit-date", auth.protect, getPlansByVisitDate);
router.post(
  "/:planId/locations/:locationId/notes",
  auth.protect,
  addNotesToPlanLocation
);
router.patch(
  "/:planId/locations/:locationId/notes/:noteId",
  auth.protect,
  editNoteInPlanLocation
);
router.delete(
  "/:planId/locations/:locationId/notes/:noteId",
  auth.protect,
  deleteNoteInPlanLocation
);

// Route for adding role-based notes
router.post(
  "/:planId/locations/:locationId/role-notes",
  auth.protect,
  addRoleBasedNotesToPlan
);

router.get("/:id", auth.protect, getPlanById);
router.put("/incomplete/:id/:locationId", auth.protect, incompletePlanLocation);

export default router;
