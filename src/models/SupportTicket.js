import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const SupportTicket = sequelize.define("SupportTicket", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  sender_role: { type: DataTypes.ENUM("user", "vendor"), allowNull: false },
  user_id: { type: DataTypes.BIGINT.UNSIGNED },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED },
  subject: { type: DataTypes.STRING(180), defaultValue: "Support request" },
  message: { type: DataTypes.TEXT, allowNull: false },
  admin_reply: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM("open", "replied", "closed"), defaultValue: "open" },
  replied_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
  replied_at: { type: DataTypes.DATE },
}, { tableName: "support_tickets" })
