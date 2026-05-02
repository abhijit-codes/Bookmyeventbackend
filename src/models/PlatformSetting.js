import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const PlatformSetting = sequelize.define("PlatformSetting", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendor_commission_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 5 },
  customer_service_charge_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 2 },
  platform_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 99 },
  updated_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "platform_settings" })
