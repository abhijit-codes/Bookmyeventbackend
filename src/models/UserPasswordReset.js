import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const UserPasswordReset = sequelize.define("UserPasswordReset", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: false, validate: { isEmail: true } },
  otp_hash: { type: DataTypes.STRING(128), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  verified_at: { type: DataTypes.DATE },
  used_at: { type: DataTypes.DATE },
  attempts: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
}, { tableName: "user_password_resets" })
