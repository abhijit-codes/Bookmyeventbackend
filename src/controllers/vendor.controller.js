import asyncHandler from "express-async-handler"
import { Op } from "sequelize"
import { Admin, BankAccount, Booking, Category, Review, SupportTicket, User, Vendor, VendorDocument, VendorService, Wallet } from "../models/index.js"
import { uploadImageBuffer } from "../services/cloudinary.service.js"
import { sendMail } from "../services/mail.service.js"
import { validateBankAccount } from "../services/payment.service.js"
import { attachPricingToServices } from "../services/pricing.service.js"
import { releaseDueVendorInstallments } from "../services/settlement.service.js"
import { AppError } from "../utils/AppError.js"
import { encryptText } from "../utils/crypto.js"
import { haversineKm } from "../utils/distance.js"

const liveSelfieInclude = {
  model: VendorDocument,
  where: { type: "live_selfie" },
  required: false,
  attributes: ["url"],
}
const publicVendorAttributes = {
  exclude: ["password", "email", "phone", "alt_phone", "address1", "address2", "pincode", "gstin", "organisation_number"],
}
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

const withProfileImageFallback = async (vendor) => {
  const plain = vendor.toJSON()
  const selfieUrl = plain.profile_image_url || plain.VendorDocuments?.[0]?.url || null
  plain.profile_image_url = selfieUrl
  if (plain.VendorServices) plain.VendorServices = await attachPricingToServices(plain.VendorServices)
  delete plain.VendorDocuments

  if (selfieUrl && !vendor.profile_image_url) {
    await vendor.update({ profile_image_url: selfieUrl })
  }

  return plain
}

export const listVendors = asyncHandler(async (req, res) => {
  const vendorWhere = { status: "approved" }
  const serviceWhere = {}

  if (req.query.search) {
    vendorWhere[Op.or] = [
      { name: { [Op.like]: `%${req.query.search}%` } },
      { business_name: { [Op.like]: `%${req.query.search}%` } },
      { city: { [Op.like]: `%${req.query.search}%` } },
      { state: { [Op.like]: `%${req.query.search}%` } },
    ]
  }

  if (req.query.city) serviceWhere.city = { [Op.like]: `%${req.query.city}%` }
  if (req.query.minPrice || req.query.maxPrice) {
    serviceWhere.price = {}
    if (req.query.minPrice) serviceWhere.price[Op.gte] = Number(req.query.minPrice)
    if (req.query.maxPrice) serviceWhere.price[Op.lte] = Number(req.query.maxPrice)
  }

  const categoryWhere = req.query.category && req.query.category !== "All" ? { name: req.query.category } : undefined

  const vendors = await Vendor.findAll({
    where: vendorWhere,
    attributes: publicVendorAttributes,
    include: [
      {
        model: VendorService,
        where: Object.keys(serviceWhere).length ? serviceWhere : undefined,
        required: Object.keys(serviceWhere).length > 0 || Boolean(categoryWhere),
        include: [{ model: Category, where: categoryWhere, required: Boolean(categoryWhere) }],
      },
      { model: Review, attributes: ["id", "rating"] },
      liveSelfieInclude,
    ],
  })

  const withDistance = await Promise.all(vendors.map(async (vendor) => {
    const plain = await withProfileImageFallback(vendor)
    if (req.query.latitude && req.query.longitude && plain.latitude && plain.longitude) {
      plain.distanceKm = Number(
        haversineKm(
          { latitude: req.query.latitude, longitude: req.query.longitude },
          { latitude: plain.latitude, longitude: plain.longitude },
        ).toFixed(2),
      )
    }
    return plain
  }))

  res.json({ success: true, data: withDistance })
})

export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({
    where: { id: req.params.id, status: "approved" },
    attributes: publicVendorAttributes,
    include: [
      { model: VendorService, include: [Category] },
      { model: Review, include: [{ model: User, attributes: ["id", "name"] }] },
      liveSelfieInclude,
    ],
  })
  if (!vendor) throw new AppError("Vendor not found", 404)
  res.json({ success: true, data: await withProfileImageFallback(vendor) })
})

export const addService = asyncHandler(async (req, res) => {
  const files = req.files ?? []
  const images = await Promise.all(
    files.map((file) => uploadImageBuffer(file, `book-my-event/services/${req.auth.id}`)),
  )

  const service = await VendorService.create({
    vendor_id: req.auth.id,
    category_id: req.body.categoryId,
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    city: req.body.city,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    availability: req.body.availability,
    images,
  })

  res.status(201).json({ success: true, data: service })
})

export const addBankAccount = asyncHandler(async (req, res) => {
  const accountNumber = String(req.body.accountNumber).trim()
  const ifsc = String(req.body.ifsc).trim().toUpperCase()
  const repeatedAccount = await BankAccount.findOne({
    where: {
      vendor_id: req.auth.id,
      account_number_last4: accountNumber.slice(-4),
      ifsc,
    },
  })
  if (repeatedAccount) throw new AppError("This bank account is already saved", 409)

  const validation = await validateBankAccount({
    accountHolderName: req.body.accountHolderName,
    accountNumber,
    ifsc,
  })
  if (!validation.verified) throw new AppError("Bank account could not be verified", 422)

  const bankAccount = await BankAccount.create({
    vendor_id: req.auth.id,
    account_holder_name: req.body.accountHolderName,
    encrypted_account_number: encryptText(accountNumber),
    account_number_last4: accountNumber.slice(-4),
    ifsc,
    bank_name: req.body.bankName,
    is_verified: validation.verified,
  })

  res.status(201).json({
    success: true,
    data: {
      id: bankAccount.id,
      accountHolderName: bankAccount.account_holder_name,
      accountNumberLast4: bankAccount.account_number_last4,
      ifsc: bankAccount.ifsc,
      bankName: bankAccount.bank_name,
      isVerified: bankAccount.is_verified,
    },
  })
})

export const getVendorDashboard = asyncHandler(async (req, res) => {
  await releaseDueVendorInstallments(req.auth.id)
  const vendor = await Vendor.findByPk(req.auth.id, {
    attributes: { exclude: ["password"] },
    include: [
      { model: VendorService, include: [Category] },
      { model: Wallet },
      { model: BankAccount, attributes: ["id", "account_holder_name", "account_number_last4", "ifsc", "bank_name", "is_verified", "createdAt"] },
      { model: Review, include: [{ model: User, attributes: ["id", "name"] }, Booking] },
      { model: Booking, include: [User, VendorService] },
      liveSelfieInclude,
    ],
  })
  if (!vendor) throw new AppError("Vendor not found", 404)
  res.json({ success: true, data: await withProfileImageFallback(vendor) })
})

export const updateVendorProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "business_name",
    "organisation_name",
    "organisation_number",
    "organisation_email",
    "gstin",
    "phone",
    "alt_phone",
    "address1",
    "address2",
    "city",
    "state",
    "pincode",
    "latitude",
    "longitude",
  ]

  const updates = pickDashboardSettings(req.body)
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field] === "" ? null : req.body[field]
  })

  const vendor = await Vendor.findByPk(req.auth.id)
  if (!vendor) throw new AppError("Vendor not found", 404)
  await vendor.update(updates)

  const updatedVendor = await Vendor.findByPk(req.auth.id, { attributes: { exclude: ["password"] } })
  res.json({ success: true, data: updatedVendor })
})

export const updateVendorProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("Profile image is mandatory", 422)

  const vendor = await Vendor.findByPk(req.auth.id)
  if (!vendor) throw new AppError("Vendor not found", 404)

  const uploaded = await uploadImageBuffer(req.file, `book-my-event/vendors/${vendor.id}`)
  await vendor.update({ profile_image_url: uploaded.url })

  const existingSelfie = await VendorDocument.findOne({
    where: { vendor_id: vendor.id, type: "live_selfie" },
    order: [["created_at", "DESC"]],
  })

  const documentPayload = {
    vendor_id: vendor.id,
    type: "live_selfie",
    url: uploaded.url,
    cloudinary_public_id: uploaded.publicId,
  }

  if (existingSelfie) await existingSelfie.update(documentPayload)
  else await VendorDocument.create(documentPayload)

  res.json({
    success: true,
    data: { profile_image_url: uploaded.url },
    message: "Profile image updated",
  })
})

export const sendSupportMessage = asyncHandler(async (req, res) => {
  const message = String(req.body.message || "").trim()
  if (message.length < 5) throw new AppError("Message must be at least 5 characters", 422)

  const vendor = await Vendor.findByPk(req.auth.id, { attributes: { exclude: ["password"] } })
  const admin = await Admin.findOne({ order: [["id", "ASC"]] })
  const ticket = await SupportTicket.create({
    sender_role: "vendor",
    vendor_id: vendor.id,
    subject: req.body.subject || "Vendor support request",
    message,
  })

  if (admin?.email) {
    await sendMail({
      to: admin.email,
      subject: `Vendor support message from ${vendor.business_name || vendor.name}`,
      html: `
        <p><strong>Vendor:</strong> ${vendor.business_name || vendor.name}</p>
        <p><strong>Email:</strong> ${vendor.email}</p>
        <p><strong>Phone:</strong> ${vendor.phone}</p>
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

export const listVendorBookings = asyncHandler(async (req, res) => {
  await releaseDueVendorInstallments(req.auth.id)
  const bookings = await Booking.findAll({
    where: { vendor_id: req.auth.id },
    order: [["created_at", "DESC"]],
    include: [User, VendorService],
  })
  res.json({ success: true, data: bookings })
})
