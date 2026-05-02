import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Wallet = sequelize.define("Wallet", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
  total_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  pending_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  available_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  withdrawn_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "wallets" })
