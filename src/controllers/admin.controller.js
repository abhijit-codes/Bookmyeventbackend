import asyncHandler from "express-async-handler"
import { Op } from "sequelize"
import { sequelize } from "../config/database.js"
import {
  BankAccount,
  Booking,
  Category,
  Notification,
  Payment,
  SupportTicket,
  User,
  Vendor,
  VendorDocument,
  VendorService,
  Wallet,
  WalletTransaction,
} from "../models/index.js"
import { sendMail } from "../services/mail.service.js"
import { getPlatformSettings } from "../services/pricing.service.js"
import { releaseDueVendorInstallments } from "../services/settlement.service.js"
import { AppError } from "../utils/AppError.js"

const rupees = (value) => Number(value || 0)
const monthKey = (date) => new Date(date).toISOString().slice(0, 7)
const percentChange = (current, previous) => (previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : current ? 100 : 0)
const since = (monthsBack = 0) => {
  const date = new Date()
  date.setMonth(date.getMonth() - monthsBack, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

const adminVendorInclude = [
  { model: VendorDocument, attributes: ["id", "type", "url", "status", "createdAt"] },
  { model: VendorService, include: [Category] },
  { model: BankAccount, attributes: ["id", "account_holder_name", "account_number_last4", "ifsc", "bank_name", "is_verified", "createdAt"] },
]

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const [users, vendors, bookings, payments, tickets, commissionSettings] = await Promise.all([
    User.findAll({ attributes: { exclude: ["password"] }, order: [["created_at", "DESC"]] }),
    Vendor.findAll({ attributes: { exclude: ["password"] }, include: adminVendorInclude, order: [["created_at", "DESC"]] }),
    Booking.findAll({ include: [User, Vendor, VendorService], order: [["created_at", "DESC"]] }),
    Payment.findAll({ where: { status: "paid" }, order: [["created_at", "DESC"]] }),
    SupportTicket.findAll({ where: { status: "open" }, order: [["created_at", "DESC"]] }),
    getPlatformSettings(),
  ])

  const thisMonth = monthKey(new Date())
  const previousMonth = monthKey(since(1))
  const countByMonth = (rows, key) => rows.filter((row) => monthKey(row.createdAt || row.created_at) === key).length
  const paidBookings = bookings.filter((booking) => ["fully_paid", "completed"].includes(booking.status))
  const revenueByMonth = (key) => paidBookings.filter((booking) => monthKey(booking.createdAt || booking.created_at) === key).reduce((sum, booking) => sum + rupees(booking.admin_commission), 0)
  const paidRevenue = paidBookings.reduce((sum, booking) => sum + rupees(booking.admin_commission), 0)
  const pendingVendors = vendors.filter((vendor) => vendor.status === "pending")

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: users.length,
        activeVendors: vendors.filter((vendor) => vendor.status === "approved").length,
        totalBookings: bookings.length,
        revenue: paidRevenue,
        userGrowth: percentChange(countByMonth(users, thisMonth), countByMonth(users, previousMonth)),
        vendorGrowth: percentChange(countByMonth(vendors, thisMonth), countByMonth(vendors, previousMonth)),
        bookingGrowth: percentChange(countByMonth(bookings, thisMonth), countByMonth(bookings, previousMonth)),
        revenueGrowth: percentChange(revenueByMonth(thisMonth), revenueByMonth(previousMonth)),
      },
      commissionSettings,
      recentRegistrations: [
        ...users.slice(0, 5).map((user) => ({ ...user.toJSON(), type: "user" })),
        ...vendors.slice(0, 5).map((vendor) => ({ ...vendor.toJSON(), type: "vendor" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
      pendingVerifications: pendingVendors.slice(0, 5),
      recentBookings: bookings.slice(0, 6),
      alerts: [
        { type: "warning", message: `${pendingVendors.length} vendor verifications pending` },
        { type: "info", message: `${tickets.length} support messages waiting for admin reply` },
        { type: "success", message: "Dashboard is using live backend data" },
      ],
    },
  })
})

export const updateCommissionSettings = asyncHandler(async (req, res) => {
  const settings = await getPlatformSettings()
  const updates = {}
  if (req.body.vendorCommissionPercent !== undefined) updates.vendor_commission_percent = Number(req.body.vendorCommissionPercent)
  if (req.body.customerServiceChargePercent !== undefined) updates.customer_service_charge_percent = Number(req.body.customerServiceChargePercent)
  if (req.body.platformFee !== undefined) updates.platform_fee = Number(req.body.platformFee)

  Object.entries(updates).forEach(([key, value]) => {
    if (!Number.isFinite(value) || value < 0 || value > (key === "platform_fee" ? 100000 : 100)) {
      throw new AppError("Invalid commission setting", 422)
    }
  })

  await settings.update({ ...updates, updated_by_admin_id: req.auth.id })
  res.json({ success: true, data: settings, message: "Commission settings updated" })
})

export const listUsersForAdmin = asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${req.query.search}%` } },
      { email: { [Op.like]: `%${req.query.search}%` } },
      { phone: { [Op.like]: `%${req.query.search}%` } },
    ]
  }
  if (req.query.status === "active") where.is_active = true
  if (req.query.status === "inactive") where.is_active = false

  const users = await User.findAll({
    where,
    attributes: { exclude: ["password"] },
    include: [{ model: Booking, include: [Payment, Vendor] }, SupportTicket],
    order: [["created_at", "DESC"]],
  })

  res.json({ success: true, data: users })
})

export const listVendorsForAdmin = asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.status && req.query.status !== "all") where.status = req.query.status
  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${req.query.search}%` } },
      { business_name: { [Op.like]: `%${req.query.search}%` } },
      { email: { [Op.like]: `%${req.query.search}%` } },
      { phone: { [Op.like]: `%${req.query.search}%` } },
    ]
  }

  const vendors = await Vendor.findAll({
    where,
    attributes: { exclude: ["password"] },
    include: adminVendorInclude,
    order: [["created_at", "DESC"]],
  })
  res.json({ success: true, data: vendors })
})

export const getVendorForAdmin = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id, {
    attributes: { exclude: ["password"] },
    include: [...adminVendorInclude, { model: Booking, include: [User, VendorService, Payment] }, SupportTicket],
  })
  if (!vendor) throw new AppError("Vendor not found", 404)
  res.json({ success: true, data: vendor })
})

export const listBookingsForAdmin = asyncHandler(async (_req, res) => {
  const bookings = await Booking.findAll({ include: [User, Vendor, VendorService, Payment], order: [["created_at", "DESC"]] })
  res.json({ success: true, data: bookings })
})

export const listTransactionsForAdmin = asyncHandler(async (_req, res) => {
  const payments = await Payment.findAll({ include: [{ model: Booking, include: [User, Vendor, VendorService] }], order: [["created_at", "DESC"]] })
  res.json({ success: true, data: payments })
})

const installmentStatus = (transactions, referenceId) => {
  const item = transactions.find((transaction) => transaction.reference_id === referenceId)
  return item?.status || "pending"
}

export const getManualSettlementQueue = asyncHandler(async (_req, res) => {
  await releaseDueVendorInstallments()

  const [bookings, withdrawalRequests] = await Promise.all([
    Booking.findAll({
      where: { status: { [Op.in]: ["fully_paid", "completed"] } },
      include: [
        { model: User, attributes: ["id", "name", "email", "phone"] },
        { model: Vendor, attributes: ["id", "name", "business_name", "email", "phone"] },
        VendorService,
        WalletTransaction,
      ],
      order: [["event_date", "ASC"]],
    }),
    WalletTransaction.findAll({
      where: { type: "withdrawal", status: "pending" },
      include: [{ model: Wallet, include: [{ model: Vendor, include: [{ model: BankAccount, attributes: ["id", "account_holder_name", "account_number_last4", "ifsc", "bank_name", "is_verified"] }] }] }],
      order: [["created_at", "ASC"]],
    }),
  ])

  const settlements = bookings.map((booking) => {
    const customerAmount = rupees(booking.service_amount)
    const amount = rupees(booking.vendor_earning || booking.vendor_base_amount || booking.service_amount)
    const transactions = booking.WalletTransactions || []
    return {
      id: booking.id,
      bookingNumber: booking.booking_number,
      eventDate: booking.event_date,
      status: booking.status,
      serviceAmount: customerAmount,
      vendorEarning: amount,
      adminRevenue: rupees(booking.admin_commission),
      vendor: booking.Vendor,
      customer: booking.User,
      service: booking.VendorService,
      steps: [
        {
          key: "full-payment-30",
          label: "After full payment",
          percent: 30,
          amount: Math.round(amount * 30) / 100,
          status: installmentStatus(transactions, `booking-${booking.id}-full-payment-30`),
        },
        {
          key: "event-day-40",
          label: "Booking day",
          percent: 40,
          amount: Math.round(amount * 40) / 100,
          status: installmentStatus(transactions, `booking-${booking.id}-event-day-40`),
        },
        {
          key: "post-event-30",
          label: "After booking day",
          percent: 30,
          amount: Math.round(amount * 30) / 100,
          status: installmentStatus(transactions, `booking-${booking.id}-post-event-30`),
        },
      ],
    }
  })

  res.json({
    success: true,
    data: {
      settlements,
      withdrawalRequests,
      totals: {
        pendingWithdrawalAmount: withdrawalRequests.reduce((sum, item) => sum + rupees(item.amount), 0),
        pendingBookingStageAmount: settlements.reduce((sum, item) => sum + item.steps.filter((step) => step.status === "pending").reduce((inner, step) => inner + rupees(step.amount), 0), 0),
      },
    },
  })
})

export const completeManualWithdrawal = asyncHandler(async (req, res) => {
  const referenceNumber = String(req.body.referenceNumber || "").trim()
  if (referenceNumber.length < 3) throw new AppError("Bank transfer reference number is required", 422)

  const withdrawal = await WalletTransaction.findOne({
    where: { id: req.params.id, type: "withdrawal", status: "pending" },
    include: [{ model: Wallet, include: [Vendor] }],
  })
  if (!withdrawal) throw new AppError("Pending withdrawal request not found", 404)

  await sequelize.transaction(async (transaction) => {
    await withdrawal.update({
      status: "completed",
      reference_id: referenceNumber,
      notes: `${withdrawal.notes || "Manual withdrawal"} | Bank reference: ${referenceNumber}`,
      created_by_admin_id: req.auth.id,
    }, { transaction })
    await withdrawal.Wallet.increment({ withdrawn_balance: withdrawal.amount }, { transaction })
  })

  const vendor = withdrawal.Wallet?.Vendor
  if (vendor?.email) {
    await sendMail({
      to: vendor.email,
      subject: "Withdrawal payment completed",
      html: `
        <p>Your withdrawal payment has been marked completed.</p>
        <p>
          <strong>Amount:</strong> Rs.${rupees(withdrawal.amount).toLocaleString("en-IN")}<br>
          <strong>Bank reference:</strong> ${referenceNumber}
        </p>
      `,
    })
  }

  res.json({ success: true, data: withdrawal, message: "Manual withdrawal marked completed and vendor notified" })
})

export const getAdminAnalytics = asyncHandler(async (_req, res) => {
  const [users, vendors, bookings, payments] = await Promise.all([
    User.findAll(),
    Vendor.findAll(),
    Booking.findAll(),
    Payment.findAll({ where: { status: "paid" } }),
  ])
  const formatter = new Intl.DateTimeFormat("en-IN", { month: "short" })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = since(5 - index)
    const key = monthKey(date)
    return { key, label: formatter.format(date), users: 0, vendors: 0, bookings: 0, revenue: 0 }
  })
  const map = Object.fromEntries(months.map((item) => [item.key, item]))

  users.forEach((user) => { const item = map[monthKey(user.createdAt)]; if (item) item.users += 1 })
  vendors.forEach((vendor) => { const item = map[monthKey(vendor.createdAt)]; if (item) item.vendors += 1 })
  bookings.forEach((booking) => { const item = map[monthKey(booking.createdAt)]; if (item) item.bookings += 1 })
  payments.forEach((payment) => { const item = map[monthKey(payment.createdAt)]; if (item) item.revenue += rupees(payment.amount) })

  res.json({
    success: true,
    data: {
      months,
      totals: {
        users: users.length,
        vendors: vendors.length,
        approvedVendors: vendors.filter((vendor) => vendor.status === "approved").length,
        bookings: bookings.length,
        revenue: bookings.filter((booking) => ["fully_paid", "completed"].includes(booking.status)).reduce((sum, booking) => sum + rupees(booking.admin_commission), 0),
      },
    },
  })
})

export const listSupportTickets = asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.senderRole && req.query.senderRole !== "all") where.sender_role = req.query.senderRole
  const tickets = await SupportTicket.findAll({ where, include: [User, Vendor], order: [["created_at", "DESC"]] })
  res.json({ success: true, data: tickets })
})

export const replySupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id)
  if (!ticket) throw new AppError("Support ticket not found", 404)
  const reply = String(req.body.reply || "").trim()
  if (reply.length < 2) throw new AppError("Reply is required", 422)
  await ticket.update({ admin_reply: reply, status: "replied", replied_by_admin_id: req.auth.id, replied_at: new Date() })
  res.json({ success: true, data: ticket })
})

export const createNotification = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim()
  const message = String(req.body.message || "").trim()
  const audience = req.body.audience || "all"
  if (!title || !message) throw new AppError("Title and message are required", 422)
  if (!["all", "users", "vendors"].includes(audience)) throw new AppError("Invalid audience", 422)
  const notification = await Notification.create({ title, message, audience, created_by_admin_id: req.auth.id })
  res.status(201).json({ success: true, data: notification })
})

export const listNotificationsForAdmin = asyncHandler(async (_req, res) => {
  const notifications = await Notification.findAll({ order: [["created_at", "DESC"]] })
  res.json({ success: true, data: notifications })
})

export const getModerationQueue = asyncHandler(async (_req, res) => {
  const [vendors, documents, tickets] = await Promise.all([
    Vendor.findAll({ where: { status: "pending" }, attributes: { exclude: ["password"] }, include: adminVendorInclude, order: [["created_at", "ASC"]] }),
    VendorDocument.findAll({ where: { status: "pending" }, include: [Vendor], order: [["created_at", "ASC"]] }),
    SupportTicket.findAll({ where: { status: "open" }, include: [User, Vendor], order: [["created_at", "ASC"]] }),
  ])
  res.json({ success: true, data: { vendors, documents, tickets } })
})

export const createCategory = asyncHandler(async (req, res) => {
  const name = req.body.name
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const category = await Category.create({ name, slug, created_by_admin_id: req.auth.id })
  res.status(201).json({ success: true, data: category })
})

export const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id)
  if (!vendor) throw new AppError("Vendor not found", 404)
  await vendor.update({ status: "approved", approved_by_admin_id: req.auth.id, approved_at: new Date() })
  await VendorDocument.update({ status: "approved", approved_by_admin_id: req.auth.id }, { where: { vendor_id: vendor.id } })
  res.json({ success: true, data: vendor })
})

export const rejectVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id)
  if (!vendor) throw new AppError("Vendor not found", 404)
  await vendor.update({ status: "rejected", approved_by_admin_id: req.auth.id })
  await VendorDocument.update({ status: "rejected", approved_by_admin_id: req.auth.id }, { where: { vendor_id: vendor.id } })
  res.json({ success: true, data: vendor })
})

export const suspendVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id)
  if (!vendor) throw new AppError("Vendor not found", 404)
  await vendor.update({ status: "suspended", approved_by_admin_id: req.auth.id })
  res.json({ success: true, data: vendor })
})

export const verifyBankAccount = asyncHandler(async (req, res) => {
  const bankAccount = await BankAccount.findByPk(req.params.id)
  if (!bankAccount) throw new AppError("Bank account not found", 404)
  await bankAccount.update({ is_verified: true, approved_by_admin_id: req.auth.id })
  res.json({ success: true, data: bankAccount })
})
