import Joi from "joi";

export const adminCreateUserSchema = Joi.object({
  name: Joi.string().required().trim().min(3),
  email: Joi.string().email().required().trim(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .required()
    .trim()
<<<<<<< HEAD
    .valid("GM", "LM", "Area", "DM", "HR", "R"),
=======
    .valid("ADMIN", "GM", "LM", "Area", "DM", "HR", "R"),
>>>>>>> 551bd43c4f7eedae107f65ae5fb5e295cdd81d6b
  governate: Joi.string().optional(),
  LM: Joi.string().optional().allow(null, ""),
  DM: Joi.string().optional().allow(null, ""),
  kpi: Joi.number().optional().default(100),
  active: Joi.boolean().default(true),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().min(8).required(),
});

export const publicRegisterSchema = Joi.object({
  name: Joi.string().required().trim().min(3),
  email: Joi.string().email().required().trim(),
  password: Joi.string().min(8).required(),
});
