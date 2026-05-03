import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve("backend", ".env") })
dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  corsOrigins: (process.env.CORS_ORIGINS ?? process.env.CLIENT_URL ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
db: {
  host: process.env.DB_HOST ?? "",
  user: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  name: process.env.DB_NAME ?? "",
  port: Number(process.env.DB_PORT ?? 3306),
  dialect: "mysql",
},
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  email: {
    host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT ?? 587),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM ?? "BookMyEvent <no-reply@bookmyevent.local>",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    xAccountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
  geoapifyKey: process.env.GEOAPIFY_API_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  bankEncryptionKey: process.env.BANK_ACCOUNT_ENCRYPTION_KEY ?? "dev-bank-account-encryption-key-32",
  adminCommissionPercent: Number(process.env.ADMIN_COMMISSION_PERCENT ?? 10),
  platformFee: Number(process.env.PLATFORM_FEE ?? 500),
  paymentDueHours: Number(process.env.PAYMENT_DUE_HOURS ?? 48),
  vendorAcceptDueHours: Number(process.env.VENDOR_ACCEPT_DUE_HOURS ?? 48),
  minimumWalletBalance: Number(process.env.MINIMUM_WALLET_BALANCE ?? 300),
}
