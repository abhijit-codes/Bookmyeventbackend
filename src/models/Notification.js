import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(160), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  audience: { type: DataTypes.ENUM("all", "users", "vendors"), allowNull: false, defaultValue: "all" },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "notifications" })
