import Joi from "joi";

export const userValidationSchema = Joi.object({
  name: Joi.string().required().trim().min(3),
  email: Joi.string().email().required().trim(),
  password: Joi.string()
    .min(8)
    .required()
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
      )
    ),
  role: Joi.string()
    .required()
    .trim()
    .valid("ADMIN", "GM", "LM", "DM", "HR", "R")
    .uppercase(),
  governate: Joi.string().optional(),
  LM: Joi.string().optional().allow(null, ""),
  DM: Joi.string().optional().allow(null, ""),
  kpi: Joi.number().optional().default(100),
  active: Joi.boolean().default(true),
});
