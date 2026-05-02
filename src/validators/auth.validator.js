import Joi from "joi"

export const userSignupSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).optional(),
  password: Joi.string().min(8).required(),
})

export const vendorSignupSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).required(),
  altPhone: Joi.string().max(20).allow("", null),
  address1: Joi.string().required(),
  address2: Joi.string().allow("", null),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().required(),
  password: Joi.string().min(8).required(),
  category: Joi.string().required(),
  businessName: Joi.string().allow("", null),
  organisationName: Joi.string().allow("", null),
  organisationNumber: Joi.string().allow("", null),
  organisationEmail: Joi.string().email().allow("", null),
  gstin: Joi.string().allow("", null),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid("admin", "vendor", "user").required(),
})

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
})

export const googleLoginSchema = Joi.object({
  idToken: Joi.string().required(),
})

export const vendorForgotPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
})

export const vendorForgotPasswordVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
})

export const vendorForgotPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Confirm password must match new password",
  }),
})

export const userForgotPasswordRequestSchema = vendorForgotPasswordRequestSchema
export const userForgotPasswordVerifySchema = vendorForgotPasswordVerifySchema
export const userForgotPasswordResetSchema = vendorForgotPasswordResetSchema
