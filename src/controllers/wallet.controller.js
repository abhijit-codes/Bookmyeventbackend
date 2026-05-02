import asyncHandler from "express-async-handler"
import { config } from "../config/env.js"
import { sequelize } from "../config/database.js"
import { BankAccount, Wallet, WalletTransaction } from "../models/index.js"
import { releaseDueVendorInstallments } from "../services/settlement.service.js"
import { AppError } from "../utils/AppError.js"

export const getWallet = asyncHandler(async (req, res) => {
  await releaseDueVendorInstallments(req.auth.id)
  const wallet = await Wallet.findOne({
    where: { vendor_id: req.auth.id },
    include: [WalletTransaction],
  })
  res.json({ success: true, data: wallet })
})

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount)
  if (!amount || amount <= 0) throw new AppError("Valid withdrawal amount required", 422)

  const bankAccount = await BankAccount.findOne({ where: { vendor_id: req.auth.id, is_verified: true } })
  if (!bankAccount) throw new AppError("Verified bank account required", 400)

  const wallet = await Wallet.findOne({ where: { vendor_id: req.auth.id } })
  if (!wallet) throw new AppError("Wallet not found", 404)
  if (Number(wallet.available_balance) < amount) throw new AppError("Insufficient wallet balance", 400)
  if (Number(wallet.available_balance) - amount < config.minimumWalletBalance) {
    throw new AppError(`Minimum wallet balance of Rs.${config.minimumWalletBalance} must remain after withdrawal`, 400)
  }

  const requestReferenceId = `manual-withdraw-${req.auth.id}-${Date.now()}`

  await sequelize.transaction(async (transaction) => {
    await wallet.decrement({ available_balance: amount }, { transaction })
    await WalletTransaction.create({
      wallet_id: wallet.id,
      vendor_id: req.auth.id,
      amount,
      type: "withdrawal",
      status: "pending",
      reference_id: requestReferenceId,
      notes: `Manual withdrawal requested to ${bankAccount.bank_name} account ending ${bankAccount.account_number_last4}`,
    }, { transaction })
  })

  res.json({ success: true, message: "Withdrawal request sent to admin for manual bank transfer" })
})
