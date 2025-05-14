import express from "express";
import * as auhtController from "./authController.js";
import validate from "../../middleware/validate.js";
import {
  publicRegisterSchema,
  adminCreateUserSchema,
  loginSchema,
} from "./authValidator.js";
import auth from "../../middleware/authentication.js";

const router = express.Router();

router
  .route("/register")
  .post(validate(publicRegisterSchema), auhtController.register);

router.post(
  "/create-user",
  auth.protect,
  auth.allowedTo("ADMIN", "GM"),
  validate(adminCreateUserSchema),
  auhtController.createUserByAdminOrGM
);

router.route("/login").post(validate(loginSchema), auhtController.login);

router.route("/logout").post(auhtController.logout);

export default router;
