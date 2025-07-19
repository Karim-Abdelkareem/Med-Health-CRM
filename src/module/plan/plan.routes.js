// src/module/plan/plan.routes.js
import express from "express";
import {
  getMyPlans,
  getMyPlansByFilter,
  updatePlan,
  deletePlan,
  addManagerNote,
  getPlansByHierarchy,
  updateVisitedRegion,
  endVisitedRegion,
  unvisitRegion,
  getMonthlyPlans,
  addNotesToPlanLocation,
  getPlansByVisitDate,
  deleteNoteInPlanLocation,
  editNoteInPlanLocation,
  addRoleBasedNotesToPlan,
  getPlanById,
  incompletePlanLocation,
  getUserPlans,
} from "./plan.controller.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router.get("/all", auth.protect, getMyPlans);
router.get("/", auth.protect, getMyPlansByFilter);
router.put("/:id", auth.protect, updatePlan);
router.delete("/:id", auth.protect, auth.allowedTo("HR", "GM"), deletePlan);
router.patch("/:id/manager-note", auth.protect, addManagerNote);
router.get("/all-under-me", auth.protect, getPlansByHierarchy);
router.put("/complete/:id/:locationId", auth.protect, updateVisitedRegion);
router.put("/end-visit/:id/:locationId", auth.protect, endVisitedRegion);
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
router.get("/user/:id", auth.protect, getUserPlans);

export default router;
