import express from "express";
import * as auhtController from "./authController.js";
import validate from "../../middleware/validate.js";
import { registerSchema, loginSchema } from "./authValidator.js";

const router = express.Router();

router
  .route("/register")
  .post(validate(registerSchema), auhtController.register);
router.route("/login").post(validate(loginSchema), auhtController.login);

export default router;
