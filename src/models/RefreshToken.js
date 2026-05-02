import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const RefreshToken = sequelize.define("RefreshToken", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  owner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  owner_role: { type: DataTypes.ENUM("admin", "vendor", "user"), allowNull: false },
  token_hash: { type: DataTypes.STRING, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: { type: DataTypes.DATE },
}, { tableName: "refresh_tokens" })
