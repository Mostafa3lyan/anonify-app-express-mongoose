import Joi from "joi";
import { Types } from "mongoose";

export const generalValidationFields = {
  email: Joi.string().email({
    // minDomainSegments: 2,
    // maxDomainSegments: 3,
    // tlds: { allow: ["com", "net"] },
  }),

  otp: Joi.string().length(6).pattern(/^\d+$/).messages({
    "string.length": "OTP must be 6 digits",
    "string.pattern.base": "OTP must contain only digits",
  }),

  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,30}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and special character",
    }),

  fullName: Joi.string().min(3).max(30).messages({
    "string.base": "Full name must be a string",
    "string.empty": "Full name is required",
  }),

  phone: Joi.string().pattern(/^(?:\+20|0)?1[0125]\d{8}$/),

  confirmPassword: function (path = "password") {
    return Joi.string().valid(Joi.ref(path)).messages({
      "any.only": "Confirm password does not match",
    });
  },

  id: Joi.string().custom((value, helper) => {
    return Types.ObjectId.isValid(value)
      ? true
      : helper.message("invalid objectId");
  }),

  file: function (validation = []) {
    return Joi.object().keys({
      fieldname: Joi.string().required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().required(),
      mimetype: Joi.string()
        .valid(...Object.values(validation))
        .required(),
      finalPath: Joi.string().required(),
      destination: Joi.string().required(),
      filename: Joi.string().required(),
      path: Joi.string().required(),
      size: Joi.number().required(),
    });
  },
};
