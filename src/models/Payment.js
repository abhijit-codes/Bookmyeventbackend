import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Payment = sequelize.define("Payment", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  type: { type: DataTypes.ENUM("advance", "remaining", "refund"), allowNull: false },
  provider: { type: DataTypes.ENUM("razorpay", "cashfree", "upi"), defaultValue: "razorpay" },
  provider_order_id: { type: DataTypes.STRING },
  provider_payment_id: { type: DataTypes.STRING },
  provider_signature: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM("created", "paid", "failed", "refunded"), defaultValue: "created" },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "payments" })
