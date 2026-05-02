import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Address = sequelize.define("Address", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED },
  label: { type: DataTypes.STRING(80), defaultValue: "Default" },
  address1: { type: DataTypes.STRING, allowNull: false },
  address2: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: false },
  pincode: { type: DataTypes.STRING(12), allowNull: false },
  latitude: { type: DataTypes.DECIMAL(10, 8) },
  longitude: { type: DataTypes.DECIMAL(11, 8) },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "addresses" })
