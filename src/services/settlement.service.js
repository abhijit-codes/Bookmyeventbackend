import { Op } from "sequelize"
import { sequelize } from "../config/database.js"
import { Booking, Wallet, WalletTransaction } from "../models/index.js"

const roundMoney = (value) => Math.round(Number(value) * 100) / 100
const vendorSettlementAmount = (booking) => Number(booking.vendor_earning || booking.vendor_base_amount || booking.service_amount)
const installmentAmount = (booking, percent) => roundMoney((vendorSettlementAmount(booking) * percent) / 100)
const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}
const bookingDate = (booking) => new Date(`${booking.event_date}T00:00:00`)

const ensureWallet = async (vendorId, transaction) => {
  const [wallet] = await Wallet.findOrCreate({
    where: { vendor_id: vendorId },
    defaults: { vendor_id: vendorId },
    transaction,
  })
  return wallet
}

const hasTransaction = async ({ booking, referenceId, transaction }) => {
  const existing = await WalletTransaction.findOne({
    where: {
      booking_id: booking.id,
      vendor_id: booking.vendor_id,
      reference_id: referenceId,
    },
    transaction,
  })
  return Boolean(existing)
}

export const settleFullPaymentInstallments = async (booking, options = {}) => {
  const run = async (transaction) => {
    const wallet = await ensureWallet(booking.vendor_id, transaction)
    const firstReleaseRef = `booking-${booking.id}-full-payment-30`
    if (await hasTransaction({ booking, referenceId: firstReleaseRef, transaction })) return

    const firstRelease = installmentAmount(booking, 30)
    const futureRelease = roundMoney(vendorSettlementAmount(booking) - firstRelease)

    await wallet.increment({
      total_balance: vendorSettlementAmount(booking),
      available_balance: firstRelease,
      pending_balance: futureRelease,
    }, { transaction })

    await WalletTransaction.bulkCreate([
      {
        wallet_id: wallet.id,
        vendor_id: booking.vendor_id,
        booking_id: booking.id,
        amount: firstRelease,
        type: "release",
        status: "completed",
        reference_id: firstReleaseRef,
        notes: "30% released after customer full payment",
      },
      {
        wallet_id: wallet.id,
        vendor_id: booking.vendor_id,
        booking_id: booking.id,
        amount: futureRelease,
        type: "pending_credit",
        status: "pending",
        reference_id: `booking-${booking.id}-future-70`,
        notes: "70% pending for booking day and post-event release",
      },
    ], { transaction })
  }

  if (options.transaction) return run(options.transaction)
  return sequelize.transaction(run)
}

const releaseDueInstallment = async ({ booking, percent, referenceId, notes, transaction }) => {
  if (await hasTransaction({ booking, referenceId, transaction })) return

  const wallet = await ensureWallet(booking.vendor_id, transaction)
  const amount = installmentAmount(booking, percent)
  await wallet.decrement({ pending_balance: amount }, { transaction })
  await wallet.increment({ available_balance: amount }, { transaction })
  await WalletTransaction.create({
    wallet_id: wallet.id,
    vendor_id: booking.vendor_id,
    booking_id: booking.id,
    amount,
    type: "release",
    status: "completed",
    reference_id: referenceId,
    notes,
  }, { transaction })
}

export const releaseDueVendorInstallments = async (vendorId) => {
  const where = { status: { [Op.in]: ["fully_paid", "completed"] } }
  if (vendorId) where.vendor_id = vendorId

  const bookings = await Booking.findAll({ where })
  const today = startOfToday()

  for (const booking of bookings) {
    await settleFullPaymentInstallments(booking)

    const eventDay = bookingDate(booking)
    if (eventDay <= today) {
      await sequelize.transaction((transaction) => releaseDueInstallment({
        booking,
        percent: 40,
        referenceId: `booking-${booking.id}-event-day-40`,
        notes: "40% released on booking event day",
        transaction,
      }))
    }

    if (eventDay < today) {
      await sequelize.transaction((transaction) => releaseDueInstallment({
        booking,
        percent: 30,
        referenceId: `booking-${booking.id}-post-event-30`,
        notes: "30% released after booking event day",
        transaction,
      }))
    }
  }
}
