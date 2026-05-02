import jwt from "jsonwebtoken"
import { config } from "../config/env.js"
import { Admin, User, Vendor } from "../models/index.js"
import { AppError } from "../utils/AppError.js"

const modelByRole = { admin: Admin, vendor: Vendor, user: User }

export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) throw new AppError("Authentication token required", 401)

    const payload = jwt.verify(token, config.jwt.accessSecret)
    const Model = modelByRole[payload.role]
    if (!Model) throw new AppError("Invalid token role", 401)

    const account = await Model.findByPk(payload.id)
    if (!account) throw new AppError("Account not found", 401)

    req.auth = { id: account.id, role: payload.role, account }
    next()
  } catch (error) {
    next(error.statusCode ? error : new AppError("Invalid or expired token", 401))
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return next(new AppError("You are not authorized for this action", 403))
  }
  next()
}
