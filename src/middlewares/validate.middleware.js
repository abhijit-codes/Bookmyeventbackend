import { AppError } from "../utils/AppError.js"

export const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  })

  if (error) {
    return next(new AppError(error.details.map((detail) => detail.message).join(", "), 422))
  }

  req.body = value
  next()
}
