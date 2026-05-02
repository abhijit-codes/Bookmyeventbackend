import asyncHandler from "express-async-handler"
import { Op } from "sequelize"
import { config } from "../config/env.js"
import { sequelize } from "../config/database.js"
import { Booking, Payment, User, Vendor, VendorService, Wallet, WalletTransaction } from "../models/index.js"
import { sendMail } from "../services/mail.service.js"
import { createRazorpayOrder, createRazorpayRefund, verifyRazorpaySignature } from "../services/payment.service.js"
import { calculateBookingPricing } from "../services/pricing.service.js"
import { settleFullPaymentInstallments } from "../services/settlement.service.js"
import { AppError } from "../utils/AppError.js"

const bookingNumber = () => `BME-${Date.now()}`
const vendorActionDeadlineHours = config.vendorAcceptDueHours
const calculateAdvanceAmount = (amount) => Math.min(Number(amount), Math.max(Math.round(Number(amount) * 0.1) - 1, 1))
const formatBookingDate = (date) => {
  if (!date) return "N/A"
  const [year, month, day] = String(date).split("-")
  return year && month && day ? `${day}/${month}/${year}` : String(date)
}
const paidContactStatuses = ["fully_paid", "completed"]
const hideVendorContactUntilPaid = (booking) => {
  const plain = booking.toJSON()
  if (!paidContactStatuses.includes(plain.status) && plain.Vendor) {
    delete plain.Vendor.email
    delete plain.Vendor.phone
    delete plain.Vendor.alt_phone
    delete plain.Vendor.address1
    delete plain.Vendor.address2
    delete plain.Vendor.pincode
    delete plain.Vendor.gstin
    delete plain.Vendor.organisation_number
  }
  return plain
}

const createBookingAfterAdvance = async ({ req, service, provider, providerOrderId, providerPaymentId, providerSignature }) => {
  const pricing = await calculateBookingPricing(service.price)
  const serviceAmount = pricing.customerPayableAmount
  const advanceAmount = calculateAdvanceAmount(serviceAmount)
  const remainingAmount = Math.max(serviceAmount - advanceAmount, 0)
  const booking = await Booking.create({
    booking_number: bookingNumber(),
    user_id: req.auth.id,
    vendor_id: service.vendor_id,
    vendor_service_id: service.id,
    event_date: req.body.eventDate,
    event_time: req.body.eventTime,
    event_address: req.body.eventAddress,
    event_city: req.body.eventCity,
    event_state: req.body.eventState,
    event_pincode: req.body.eventPincode,
    event_latitude: req.body.eventLatitude,
    event_longitude: req.body.eventLongitude,
    notes: req.body.notes,
    service_amount: serviceAmount,
    vendor_base_amount: pricing.vendorBaseAmount,
    advance_amount: advanceAmount,
    platform_fee: pricing.platformFee,
    vendor_commission_percent: pricing.vendorCommissionPercent,
    vendor_commission_amount: pricing.vendorCommissionAmount,
    customer_service_charge_percent: pricing.customerServiceChargePercent,
    customer_service_charge: pricing.customerServiceCharge,
    admin_commission: pricing.adminRevenue,
    vendor_earning: pricing.vendorBaseAmount,
    remaining_amount: remainingAmount,
    status: "advance_paid",
  })

  await Payment.create({
    booking_id: booking.id,
    user_id: req.auth.id,
    amount: advanceAmount,
    type: "advance",
    provider,
    provider_order_id: providerOrderId,
    provider_payment_id: providerPaymentId,
    provider_signature: providerSignature,
    status: "paid",
  })

  const user = await User.findByPk(req.auth.id)
  const customerName = user?.name || req.auth.name || "Customer"
  const customerEmail = user?.email || req.auth.email || "N/A"
  const customerPhone = user?.phone || req.auth.phone || "N/A"
  const eventAddress = [
    booking.event_address,
    booking.event_city,
    booking.event_state,
    booking.event_pincode,
  ].filter(Boolean).join(", ")

  await sendMail({
    to: service.Vendor.email,
    subject: "New booking request received",
    html: `
      <p>You have received a new booking request.</p>
      <p>
        <strong>Customer:</strong> ${customerName}<br>
        <strong>Email:</strong> ${customerEmail}<br>
        <strong>Phone:</strong> ${customerPhone}<br>
        <strong>Service:</strong> ${service.title}<br>
        <strong>Date:</strong> ${formatBookingDate(booking.event_date)}<br>
        <strong>Time:</strong> ${booking.event_time || "N/A"}<br>
        <strong>Address:</strong> ${eventAddress || "N/A"}
      </p>
      <p>Please open your vendor dashboard and accept or reject this request within ${vendorActionDeadlineHours} hours.</p>
    `,
  })

  return booking
}

export const createAdvanceOrder = asyncHandler(async (req, res) => {
  const service = await VendorService.findByPk(req.body.vendorServiceId, { include: [Vendor] })
  if (!service) throw new AppError("Vendor service not found", 404)

  const pricing = await calculateBookingPricing(service.price)
  const serviceAmount = pricing.customerPayableAmount
  const advanceAmount = calculateAdvanceAmount(serviceAmount)
  const order = await createRazorpayOrder({
    amount: advanceAmount,
    receipt: `advance-${Date.now()}`,
  })

  res.status(201).json({
    success: true,
    data: {
      razorpayKeyId: config.razorpay.keyId,
      razorpayOrder: order,
      bookingDraft: {
        ...req.body,
        pricing,
        serviceAmount,
        advanceAmount,
        remainingAmount: Math.max(serviceAmount - advanceAmount, 0),
      },
    },
  })
})

export const listMyBookings = asyncHandler(async (req, res) => {
  await Booking.update(
    { status: "expired" },
    {
      where: {
        user_id: req.auth.id,
        status: "vendor_confirmed",
        remaining_due_at: { [Op.lt]: new Date() },
      },
    },
  )

  const bookings = await Booking.findAll({
    where: { user_id: req.auth.id },
    order: [["created_at", "DESC"]],
    include: [Vendor, VendorService, Payment],
  })
  res.json({ success: true, data: bookings.map(hideVendorContactUntilPaid) })
})

export const verifyAdvanceAndCreateBooking = asyncHandler(async (req, res) => {
  if (!verifyRazorpaySignature(req.body)) throw new AppError("Invalid payment signature", 400)

  const service = await VendorService.findByPk(req.params.serviceId, { include: [Vendor] })
  if (!service) throw new AppError("Vendor service not found", 404)

  const booking = await createBookingAfterAdvance({
    req,
    service,
    provider: "razorpay",
    providerOrderId: req.body.orderId,
    providerPaymentId: req.body.paymentId,
    providerSignature: req.body.signature,
  })

  res.status(201).json({ success: true, data: booking })
})

export const confirmBookingByVendor = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ where: { id: req.params.id, vendor_id: req.auth.id }, include: [User] })
  if (!booking) throw new AppError("Booking not found", 404)
  if (booking.status !== "advance_paid") throw new AppError("Booking cannot be confirmed now", 400)
  if (Date.now() - new Date(booking.createdAt).getTime() > vendorActionDeadlineHours * 60 * 60 * 1000) {
    await booking.update({ status: "expired" })
    throw new AppError("Accept window expired. Customer advance should be refunded within 24 hours.", 400)
  }

  const dueAt = new Date(Date.now() + config.paymentDueHours * 60 * 60 * 1000)
  await booking.update({ status: "vendor_confirmed", remaining_due_at: dueAt })

  await sendMail({
    to: booking.User.email,
    subject: "Vendor accepted your order",
    html: `<p>Your vendor accepted the booking. Please pay the remaining amount within ${config.paymentDueHours} hours. Advance amount is non-refundable after the deadline.</p>`,
  })

  res.json({ success: true, data: booking })
})

export const cancelBookingByVendor = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ where: { id: req.params.id, vendor_id: req.auth.id }, include: [User, Payment] })
  if (!booking) throw new AppError("Booking not found", 404)
  if (booking.status !== "advance_paid") throw new AppError("Booking cannot be cancelled now", 400)

  const advancePayment = booking.Payments?.find((payment) => payment.type === "advance" && payment.status === "paid")
  if (!advancePayment) throw new AppError("Paid advance payment not found for refund", 400)

  const refund = await createRazorpayRefund({
    paymentId: advancePayment.provider_payment_id,
    amount: booking.advance_amount,
    notes: {
      bookingId: String(booking.id),
      bookingNumber: booking.booking_number,
      reason: "Vendor rejected booking",
    },
  })

  await sequelize.transaction(async (transaction) => {
    await booking.update({ status: "rejected" }, { transaction })
    if (refund.status === "processed") await advancePayment.update({ status: "refunded" }, { transaction })
    await Payment.create({
      booking_id: booking.id,
      user_id: booking.user_id,
      amount: booking.advance_amount,
      type: "refund",
      provider: "razorpay",
      provider_order_id: refund.id || `refund-${booking.id}`,
      provider_payment_id: advancePayment.provider_payment_id,
      status: refund.status === "processed" ? "refunded" : "created",
    }, { transaction })
  })

  await sendMail({
    to: booking.User.email,
    subject: "Booking request cancelled",
    html: `<p>Your vendor cancelled the booking request. Your advance refund of Rs.${Number(booking.advance_amount).toLocaleString("en-IN")} has been initiated and should be processed within 24 hours.</p>`,
  })

  res.json({ success: true, data: booking, message: "Booking cancelled. Refund has been initiated and should be processed within 24 hours." })
})

export const cancelBookingByUser = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ where: { id: req.params.id, user_id: req.auth.id }, include: [Vendor, Payment] })
  if (!booking) throw new AppError("Booking not found", 404)
  if (booking.status !== "advance_paid") {
    throw new AppError("You can cancel only before the vendor accepts. After acceptance, pay the remaining amount within 48 hours or advance is non-refundable.", 400)
  }

  const reason = String(req.body.reason || "").trim()
  if (!reason) throw new AppError("Cancellation reason is required", 400)

  const advancePayment = booking.Payments?.find((payment) => payment.type === "advance" && payment.status === "paid")
  if (!advancePayment) throw new AppError("Paid advance payment not found for refund", 400)

  const refund = await createRazorpayRefund({
    paymentId: advancePayment.provider_payment_id,
    amount: booking.advance_amount,
    notes: {
      bookingId: String(booking.id),
      bookingNumber: booking.booking_number,
      reason: `Customer cancelled: ${reason}`,
    },
  })

  await sequelize.transaction(async (transaction) => {
    await booking.update({ status: "cancelled" }, { transaction })
    if (refund.status === "processed") await advancePayment.update({ status: "refunded" }, { transaction })
    await Payment.create({
      booking_id: booking.id,
      user_id: booking.user_id,
      amount: booking.advance_amount,
      type: "refund",
      provider: "razorpay",
      provider_order_id: refund.id || `refund-${booking.id}`,
      provider_payment_id: advancePayment.provider_payment_id,
      provider_signature: reason,
      status: refund.status === "processed" ? "refunded" : "created",
    }, { transaction })
  })

  await sendMail({
    to: booking.Vendor.email,
    subject: "Customer cancelled booking request",
    html: `<p>The customer cancelled booking ${booking.booking_number} before vendor acceptance.</p><p><strong>Reason:</strong> ${reason}</p>`,
  })

  res.json({ success: true, data: booking, message: "Booking cancelled. Advance refund has been initiated and should be processed within 24 hours." })
})

export const createRemainingOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ where: { id: req.params.id, user_id: req.auth.id } })
  if (!booking) throw new AppError("Booking not found", 404)
  if (booking.status !== "vendor_confirmed") throw new AppError("Remaining payment is not available", 400)
  if (new Date() > booking.remaining_due_at) {
    await booking.update({ status: "expired" })
    throw new AppError("Payment window expired. Advance is not refundable.", 400)
  }

  const order = await createRazorpayOrder({ amount: booking.remaining_amount, receipt: `remaining-${booking.id}` })
  res.status(201).json({ success: true, data: { razorpayKeyId: config.razorpay.keyId, razorpayOrder: order } })
})

export const verifyRemainingPayment = asyncHandler(async (req, res) => {
  if (!verifyRazorpaySignature(req.body)) throw new AppError("Invalid payment signature", 400)

  const booking = await Booking.findOne({ where: { id: req.params.id, user_id: req.auth.id } })
  if (!booking) throw new AppError("Booking not found", 404)

  await sequelize.transaction(async (transaction) => {
    const adminCommission = Number(booking.admin_commission)
    const vendorEarning = Number(booking.vendor_earning || booking.vendor_base_amount || booking.VendorService?.price || 0)
    await booking.update(
      { status: "fully_paid", admin_commission: adminCommission, vendor_earning: vendorEarning },
      { transaction },
    )
    await Payment.create({
      booking_id: booking.id,
      user_id: req.auth.id,
      amount: booking.remaining_amount,
      type: "remaining",
      provider_order_id: req.body.orderId,
      provider_payment_id: req.body.paymentId,
      provider_signature: req.body.signature,
      status: "paid",
    }, { transaction })

    await settleFullPaymentInstallments(booking, { transaction })
  })

  res.json({ success: true, message: "Remaining payment verified" })
})

export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ where: { id: req.params.id, vendor_id: req.auth.id } })
  if (!booking) throw new AppError("Booking not found", 404)
  if (booking.status !== "fully_paid") throw new AppError("Only fully paid bookings can be completed", 400)

  await sequelize.transaction(async (transaction) => {
    await booking.update({ status: "completed" }, { transaction })
  })

  res.json({ success: true, message: "Booking completed. Remaining settlement will release by schedule." })
})
