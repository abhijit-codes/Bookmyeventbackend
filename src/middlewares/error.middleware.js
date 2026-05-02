import { logger } from "../config/logger.js"

export const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

export const errorHandler = (error, _req, res, _next) => {
  let statusCode = error.statusCode || 500
  let message = error.message

  if (error.name === "SequelizeUniqueConstraintError") {
    statusCode = 409
    message = "Account already exists with this email"
  }

  if (error.name === "SequelizeValidationError") {
    statusCode = 422
    message = error.errors?.map((item) => item.message).join(", ") || "Validation failed"
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 413
    message = "Image is too large. Please capture again or use a smaller image."
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    statusCode = 401
    message = "Session expired. Please login again."
  }

  logger.error(error.message, { stack: error.stack })

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Something went wrong. Please check backend logs." : message,
  })
}
