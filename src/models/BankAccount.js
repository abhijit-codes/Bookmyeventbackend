import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const BankAccount = sequelize.define("BankAccount", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  account_holder_name: { type: DataTypes.STRING(160), allowNull: false },
  encrypted_account_number: { type: DataTypes.TEXT, allowNull: false },
  account_number_last4: { type: DataTypes.STRING(4), allowNull: false },
  ifsc: { type: DataTypes.STRING(20), allowNull: false },
  bank_name: { type: DataTypes.STRING(120), allowNull: false },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
  approved_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "bank_accounts" })
