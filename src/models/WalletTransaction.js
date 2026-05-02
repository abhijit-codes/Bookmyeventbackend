import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const WalletTransaction = sequelize.define("WalletTransaction", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  wallet_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  booking_id: { type: DataTypes.BIGINT.UNSIGNED },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  type: { type: DataTypes.ENUM("pending_credit", "release", "withdrawal", "adjustment"), allowNull: false },
  status: { type: DataTypes.ENUM("pending", "completed", "failed"), defaultValue: "pending" },
  reference_id: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "wallet_transactions" })
