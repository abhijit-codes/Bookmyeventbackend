import crypto from "node:crypto"
import { config } from "../config/env.js"
import { AppError } from "../utils/AppError.js"

export const createRazorpayOrder = async ({ amount, receipt }) => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new AppError("Razorpay is not configured", 500)
  }

  const amountInPaise = Math.round(Number(amount) * 100)
  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    throw new AppError("Invalid payment amount", 400)
  }

  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64")
  let response

  try {
    response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt,
      }),
    })
  } catch (_error) {
    throw new AppError("Unable to reach Razorpay. Check internet connection on the backend server.", 502)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new AppError(data.error?.description || "Razorpay order creation failed", response.status)
  }

  return data
}

export const createRazorpayRefund = async ({ paymentId, amount, notes = {} }) => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new AppError("Razorpay is not configured", 500)
  }
  if (!paymentId) throw new AppError("Advance payment id missing for refund", 400)

  const amountInPaise = Math.round(Number(amount) * 100)
  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    throw new AppError("Invalid refund amount", 400)
  }

  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64")
  let response

  try {
    response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        speed: "optimum",
        notes,
      }),
    })
  } catch (_error) {
    throw new AppError("Unable to reach Razorpay for refund. Check internet connection on the backend server.", 502)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new AppError(data.error?.description || "Razorpay refund creation failed", response.status)
  }

  return data
}

const razorpayAuthHeader = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new AppError("Razorpay is not configured", 500)
  }
  return `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64")}`
}

export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(body)
    .digest("hex")
  return expected === signature
}

export const validateBankAccount = async ({ accountHolderName, accountNumber, ifsc }) => {
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifsc || "").toUpperCase())) {
    throw new AppError("Invalid IFSC format", 422)
  }
  if (!/^\d{9,18}$/.test(String(accountNumber || ""))) {
    throw new AppError("Invalid bank account number", 422)
  }
  if (/^(\d)\1+$/.test(String(accountNumber))) {
    throw new AppError("Fake account number is not allowed", 422)
  }

  if (!config.razorpay.xAccountNumber) {
    return { verified: true, provider: "local_format", accountHolderName }
  }

  const response = await fetch("https://api.razorpay.com/v1/fund_accounts/validations", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_number: config.razorpay.xAccountNumber,
      fund_account: {
        account_type: "bank_account",
        bank_account: {
          name: accountHolderName,
          ifsc,
          account_number: accountNumber,
        },
      },
      amount: 100,
      currency: "INR",
      notes: { purpose: "vendor_bank_validation" },
    }),
  }).catch(() => {
    throw new AppError("Unable to reach RazorpayX for bank validation", 502)
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new AppError(data.error?.description || "Bank account validation failed", response.status)
  }

  return { verified: ["completed", "created"].includes(data.status), provider: "razorpayx", raw: data }
}

export const createPayout = async ({ amount, bankAccount, referenceId, purpose = "payout", notes = {} }) => {
  if (!config.razorpay.xAccountNumber) {
    throw new AppError("RAZORPAYX_ACCOUNT_NUMBER is required for vendor withdrawals", 501)
  }

  const contactResponse = await fetch("https://api.razorpay.com/v1/contacts", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: bankAccount.accountHolderName,
      type: "vendor",
      reference_id: `vendor-${bankAccount.vendorId}-${Date.now()}`,
      notes,
    }),
  }).catch(() => {
    throw new AppError("Unable to reach RazorpayX for contact creation", 502)
  })
  const contact = await contactResponse.json().catch(() => ({}))
  if (!contactResponse.ok) throw new AppError(contact.error?.description || "RazorpayX contact creation failed", contactResponse.status)

  const fundAccountResponse = await fetch("https://api.razorpay.com/v1/fund_accounts", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contact_id: contact.id,
      account_type: "bank_account",
      bank_account: {
        name: bankAccount.accountHolderName,
        ifsc: bankAccount.ifsc,
        account_number: bankAccount.accountNumber,
      },
    }),
  }).catch(() => {
    throw new AppError("Unable to reach RazorpayX for fund account creation", 502)
  })
  const fundAccount = await fundAccountResponse.json().catch(() => ({}))
  if (!fundAccountResponse.ok) throw new AppError(fundAccount.error?.description || "RazorpayX fund account creation failed", fundAccountResponse.status)

  const payoutResponse = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_number: config.razorpay.xAccountNumber,
      fund_account_id: fundAccount.id,
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      mode: "IMPS",
      purpose,
      queue_if_low_balance: true,
      reference_id: referenceId,
      narration: "BookMyEvent",
      notes,
    }),
  }).catch(() => {
    throw new AppError("Unable to reach RazorpayX for payout", 502)
  })
  const payout = await payoutResponse.json().catch(() => ({}))
  if (!payoutResponse.ok) throw new AppError(payout.error?.description || "RazorpayX payout failed", payoutResponse.status)

  return payout
}
