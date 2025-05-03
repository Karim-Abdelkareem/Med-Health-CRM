import exprss from "express";
import * as locationController from "./locationController.js";
import auth from "../../middleware/authentication.js";

const router = exprss.Router();

router
  .route("/")
  .post(
    auth.protect,
    auth.allowedTo("ADMIN", "GM", "HR"),
    locationController.createLocation
  )
  .get(auth.protect, locationController.getAllLocations);

router
  .route("/:id")
  .get(auth.protect, locationController.getLocationById)
  .put(
    auth.protect,
    auth.allowedTo("ADMIN", "GM", "HR"),
    locationController.updateLocation
  )
  .delete(
    auth.protect,
    auth.allowedTo("ADMIN", "GM", "HR"),
    locationController.deleteLocation
  );

export default router;
