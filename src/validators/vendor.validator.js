import Joi from "joi"

export const serviceSchema = Joi.object({
  categoryId: Joi.number().integer().required(),
  title: Joi.string().min(2).max(160).required(),
  description: Joi.string().allow("", null),
  price: Joi.number().positive().required(),
  city: Joi.string().required(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  availability: Joi.object().optional(),
})

export const bankAccountSchema = Joi.object({
  accountHolderName: Joi.string().min(2).max(160).required(),
  accountNumber: Joi.string().pattern(/^\d{9,18}$/).required(),
  ifsc: Joi.string().pattern(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/).required(),
  bankName: Joi.string().min(2).max(120).required(),
})
