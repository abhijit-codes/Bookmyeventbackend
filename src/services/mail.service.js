import nodemailer from "nodemailer"
import { config } from "../config/env.js"
import { logger } from "../config/logger.js"
import { AppError } from "../utils/AppError.js"

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: config.email.user && config.email.pass ? {
    user: config.email.user,
    pass: config.email.pass,
  } : undefined,
})

export const sendMail = async ({ to, subject, html, requireConfigured = false }) => {
  if (!config.email.user || !config.email.pass) {
    if (requireConfigured) {
      throw new AppError("Email service is not configured. Please add SMTP credentials.", 503)
    }
    logger.warn(`Email skipped because SMTP is not configured: ${subject}`)
    return
  }

  await transporter.sendMail({ from: config.email.from, to, subject, html })
}
