import express from 'express';
import * as userController from './userController.js';
import validate from '../../middleware/validate.js';
import { userValidationSchema } from './userValidator.js';

const router = express.Router();

router.route('/')
  .post(validate(userValidationSchema), userController.createUser)
  .get(userController.getAllUsers)
  .get(userController.getUserProfile)

router.route('/:userId')
 .get(userController.getUserById)
 .put(userController.updateUser)
 .delete(userController.deleteUser);

export default router;