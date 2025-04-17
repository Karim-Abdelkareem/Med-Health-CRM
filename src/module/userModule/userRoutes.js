import express from 'express';
import * as userController from './userController.js';
import validate from '../../middleware/validate.js';
import { userValidationSchema } from './userValidator.js';
import auth from "../../middleware/authentication.js";




const router = express.Router();

router.route('/')
  .post(validate(userValidationSchema), userController.createUser)
  .get(userController.getAllUsers)
  .get(userController.getUserProfile)

router.get("/calculate-kpi", auth.protect , userController.calculateKPIForAllEmployees);


router.route('/:userId')
 .get(userController.getUserById)
 .put(userController.updateUser)
 .delete(userController.deleteUser);


export default router;