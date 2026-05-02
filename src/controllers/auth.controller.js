import asyncHandler from "express-async-handler"
import jwt from "jsonwebtoken"
import crypto from "node:crypto"
import { OAuth2Client } from "google-auth-library"
import { config } from "../config/env.js"
import { Admin, Category, Notification, RefreshToken, SupportTicket, User, UserPasswordReset, Vendor, VendorDocument, VendorPasswordReset, Wallet } from "../models/index.js"
import { uploadImageBuffer } from "../services/cloudinary.service.js"
import { sendMail } from "../services/mail.service.js"
import { AppError } from "../utils/AppError.js"
import { hashToken, signAccessToken, signRefreshToken } from "../utils/tokens.js"

const modelByRole = { admin: Admin, vendor: Vendor, user: User }
const googleClient = new OAuth2Client(config.googleClientId)
const otpTtlMinutes = 10
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex")
const createOtp = () => String(crypto.randomInt(100000, 1000000))
const allowedLanguages = new Set(["en", "hi", "or"])
const allowedAlertSounds = new Set(["classic", "soft", "urgent", "silent"])

const pickDashboardSettings = (body) => {
  const updates = {}
  if (body.dark_theme !== undefined) updates.dark_theme = Boolean(body.dark_theme)
  if (body.app_language !== undefined && allowedLanguages.has(body.app_language)) updates.app_language = body.app_language
  if (body.audio_language !== undefined && allowedLanguages.has(body.audio_language)) updates.audio_language = body.audio_language
  if (body.support_language !== undefined && allowedLanguages.has(body.support_language)) updates.support_language = body.support_language
  if (body.order_alert_sound !== undefined && allowedAlertSounds.has(body.order_alert_sound)) updates.order_alert_sound = body.order_alert_sound
  return updates
}

const authResponse = async (account) => ({
  account: {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    status: account.status,
  },
  accessToken: signAccessToken(account),
  refreshToken: await signRefreshToken(account),
})

export const signupUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body)
  res.status(201).json({ success: true, data: await authResponse(user) })
})

export const signupVendor = asyncHandler(async (req, res) => {
  const files = req.files ?? {}
  for (const key of ["aadhaarFront", "aadhaarBack", "liveSelfie"]) {
    if (!files[key]?.[0]) throw new AppError(`${key} is mandatory`, 422)
  }

  const categorySlug = req.body.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const category = await Category.findOne({ where: { slug: categorySlug } })
  const finalCategory =
    category ??
    (await Category.create({
      name: req.body.category,
      slug: categorySlug,
    }))
  const vendor = await Vendor.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    alt_phone: req.body.altPhone,
    address1: req.body.address1,
    address2: req.body.address2,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    password: req.body.password,
    business_name: req.body.businessName,
    organisation_name: req.body.organisationName,
    organisation_number: req.body.organisationNumber,
    organisation_email: req.body.organisationEmail,
    gstin: req.body.gstin,
  })

  await Wallet.create({ vendor_id: vendor.id })

  const documentMap = {
    aadhaarFront: "aadhaar_front",
    aadhaarBack: "aadhaar_back",
    liveSelfie: "live_selfie",
    pan: "pan",
  }

  let profileImageUrl = null

  await Promise.all(
    Object.entries(documentMap)
      .filter(([field]) => files[field]?.[0])
      .map(async ([field, type]) => {
        const uploaded = await uploadImageBuffer(files[field][0], `book-my-event/vendors/${vendor.id}`)
        if (type === "live_selfie") profileImageUrl = uploaded.url
        return VendorDocument.create({
          vendor_id: vendor.id,
          type,
          url: uploaded.url,
          cloudinary_public_id: uploaded.publicId,
        })
      }),
  )

  if (profileImageUrl) await vendor.update({ profile_image_url: profileImageUrl })

  res.status(201).json({
    success: true,
    message: "Vendor signup submitted for admin approval",
    data: { vendorId: vendor.id, categoryId: finalCategory.id, status: vendor.status },
  })
})

export const login = asyncHandler(async (req, res) => {
  const Model = modelByRole[req.body.role]
  const account = await Model.findOne({ where: { email: req.body.email } })
  if (!account || !(await account.comparePassword(req.body.password))) {
    throw new AppError("Invalid email or password", 401)
  }
  if (req.body.role === "vendor" && account.status !== "approved") {
    throw new AppError("Vendor account is waiting for admin approval", 403)
  }

  res.json({ success: true, data: await authResponse(account) })
})

export const me = asyncHandler(async (req, res) => {
  const account = req.auth.account.toJSON()
  delete account.password
  res.json({ success: true, data: { ...account, role: req.auth.role } })
})

export const updateMe = asyncHandler(async (req, res) => {
  if (req.auth.role !== "user") throw new AppError("Only customers can update this profile", 403)

  const updates = pickDashboardSettings(req.body)
  ;["name", "phone"].forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field] === "" ? null : req.body[field]
  })

  await req.auth.account.update(updates)
  const account = req.auth.account.toJSON()
  delete account.password
  res.json({ success: true, data: { ...account, role: req.auth.role } })
})

export const updateMyProfileImage = asyncHandler(async (req, res) => {
  if (req.auth.role !== "user") throw new AppError("Only customers can update this profile image", 403)
  if (!req.file) throw new AppError("Profile image is mandatory", 422)

  const uploaded = await uploadImageBuffer(req.file, `book-my-event/users/${req.auth.id}`)
  await req.auth.account.update({ profile_image_url: uploaded.url })
  res.json({ success: true, data: { profile_image_url: uploaded.url } })
})

export const listMyNotifications = asyncHandler(async (req, res) => {
  const audience = req.auth.role === "vendor" ? ["all", "vendors"] : ["all", "users"]
  const notifications = await Notification.findAll({
    where: { audience },
    order: [["created_at", "DESC"]],
  })
  res.json({ success: true, data: notifications })
})

export const sendUserSupportMessage = asyncHandler(async (req, res) => {
  if (req.auth.role !== "user") throw new AppError("Only customers can send this message", 403)

  const message = String(req.body.message || "").trim()
  if (message.length < 5) throw new AppError("Message must be at least 5 characters", 422)

  const admin = await Admin.findOne({ order: [["id", "ASC"]] })
  const user = req.auth.account
  const ticket = await SupportTicket.create({
    sender_role: "user",
    user_id: user.id,
    subject: req.body.subject || "Customer support request",
    message,
  })

  if (admin?.email) {
    await sendMail({
      to: admin.email,
      subject: `Customer support message from ${user.name}`,
      html: `
        <p><strong>Customer:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Phone:</strong> ${user.phone || "N/A"}</p>
        <p>${message}</p>
      `,
    })
  }

  res.status(201).json({
    success: true,
    data: ticket,
    message: "Message sent to admin",
  })
})

export const refresh = asyncHandler(async (req, res) => {
  const payload = jwt.verify(req.body.refreshToken, config.jwt.refreshSecret)
  const tokenHash = hashToken(req.body.refreshToken)
  const saved = await RefreshToken.findOne({
    where: { owner_id: payload.id, owner_role: payload.role, token_hash: tokenHash, revoked_at: null },
  })
  if (!saved) throw new AppError("Invalid refresh token", 401)

  const Model = modelByRole[payload.role]
  const account = await Model.findByPk(payload.id)
  res.json({ success: true, data: { accessToken: signAccessToken(account) } })
})

export const logout = asyncHandler(async (req, res) => {
  if (req.body.refreshToken) {
    await RefreshToken.update({ revoked_at: new Date() }, { where: { token_hash: hashToken(req.body.refreshToken) } })
  }
  res.json({ success: true, message: "Logged out" })
})

export const googleLogin = asyncHandler(async (req, res) => {
  if (!config.googleClientId) throw new AppError("Google OAuth is not configured", 500)

  const ticket = await googleClient.verifyIdToken({
    idToken: req.body.idToken,
    audience: config.googleClientId,
  })
  const payload = ticket.getPayload()
  if (!payload?.email) throw new AppError("Google account email missing", 400)

  const [user] = await User.findOrCreate({
    where: { email: payload.email },
    defaults: {
      name: payload.name ?? payload.email.split("@")[0],
      email: payload.email,
      google_id: payload.sub,
    },
  })

  res.json({ success: true, data: await authResponse(user) })
})

export const requestVendorPasswordOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const vendor = await Vendor.findOne({ where: { email } })
  if (!vendor) throw new AppError("Vendor account not found", 404)

  await VendorPasswordReset.update(
    { used_at: new Date() },
    { where: { vendor_id: vendor.id, used_at: null } },
  )

  const otp = createOtp()
  await VendorPasswordReset.create({
    vendor_id: vendor.id,
    email: vendor.email,
    otp_hash: hashOtp(otp),
    expires_at: new Date(Date.now() + otpTtlMinutes * 60 * 1000),
  })

  await sendMail({
    to: vendor.email,
    subject: "BookMyEvent vendor password reset OTP",
    html: `<p>Your vendor password reset OTP is <strong>${otp}</strong>.</p><p>This OTP is valid for ${otpTtlMinutes} minutes.</p>`,
    requireConfigured: true,
  })

  res.json({
    success: true,
    message: "OTP sent to vendor email.",
  })
})

export const requestUserPasswordOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const user = await User.findOne({ where: { email } })
  if (!user) throw new AppError("Customer account not found", 404)

  await UserPasswordReset.update(
    { used_at: new Date() },
    { where: { user_id: user.id, used_at: null } },
  )

  const otp = createOtp()
  await UserPasswordReset.create({
    user_id: user.id,
    email: user.email,
    otp_hash: hashOtp(otp),
    expires_at: new Date(Date.now() + otpTtlMinutes * 60 * 1000),
  })

  await sendMail({
    to: user.email,
    subject: "BookMyEvent password reset OTP",
    html: `<p>Your customer password reset OTP is <strong>${otp}</strong>.</p><p>This OTP is valid for ${otpTtlMinutes} minutes.</p>`,
    requireConfigured: true,
  })

  res.json({
    success: true,
    message: "OTP sent to customer email.",
  })
})

const findValidUserReset = async ({ email, otp }) => {
  const reset = await UserPasswordReset.findOne({
    where: {
      email,
      otp_hash: hashOtp(otp),
      used_at: null,
    },
    order: [["created_at", "DESC"]],
    include: [User],
  })

  if (!reset) throw new AppError("Invalid OTP", 400)
  if (reset.attempts >= 5) throw new AppError("Too many OTP attempts. Please request a new OTP.", 429)
  if (new Date() > reset.expires_at) throw new AppError("OTP expired. Please request a new OTP.", 400)

  return reset
}

export const verifyUserPasswordOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const reset = await findValidUserReset({ email, otp: req.body.otp })
  await reset.update({ verified_at: new Date(), attempts: reset.attempts + 1 })
  res.json({ success: true, message: "OTP verified. You can set a new password now." })
})

export const resetUserPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const reset = await findValidUserReset({ email, otp: req.body.otp })
  await reset.User.update({ password: req.body.password })
  await reset.update({ verified_at: reset.verified_at || new Date(), used_at: new Date() })
  res.json({ success: true, message: "Customer password reset successfully. Please login with your new password." })
})

const findValidVendorReset = async ({ email, otp }) => {
  const reset = await VendorPasswordReset.findOne({
    where: {
      email,
      otp_hash: hashOtp(otp),
      used_at: null,
    },
    order: [["created_at", "DESC"]],
    include: [Vendor],
  })

  if (!reset) throw new AppError("Invalid OTP", 400)
  if (reset.attempts >= 5) throw new AppError("Too many OTP attempts. Please request a new OTP.", 429)
  if (new Date() > reset.expires_at) throw new AppError("OTP expired. Please request a new OTP.", 400)

  return reset
}

export const verifyVendorPasswordOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const reset = await findValidVendorReset({ email, otp: req.body.otp })
  await reset.update({ verified_at: new Date(), attempts: reset.attempts + 1 })
  res.json({ success: true, message: "OTP verified. You can set a new password now." })
})

export const resetVendorPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const reset = await findValidVendorReset({ email, otp: req.body.otp })
  await reset.Vendor.update({ password: req.body.password })
  await reset.update({ verified_at: reset.verified_at || new Date(), used_at: new Date() })
  res.json({ success: true, message: "Vendor password reset successfully. Please login with your new password." })
})
