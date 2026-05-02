import Joi from "joi"

export const createBookingSchema = Joi.object({
  vendorServiceId: Joi.number().integer().required(),
  eventDate: Joi.date().required(),
  eventTime: Joi.string().allow("", null),
  eventAddress: Joi.string().required(),
  eventCity: Joi.string().allow("", null),
  eventState: Joi.string().allow("", null),
  eventPincode: Joi.string().allow("", null),
  eventLatitude: Joi.number().optional(),
  eventLongitude: Joi.number().optional(),
  notes: Joi.string().allow("", null),
})

export const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  paymentId: Joi.string().required(),
  signature: Joi.string().required(),
})
