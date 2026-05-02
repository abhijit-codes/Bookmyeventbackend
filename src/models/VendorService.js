import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const VendorService = sequelize.define("VendorService", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  city: { type: DataTypes.STRING(100), allowNull: false },
  latitude: { type: DataTypes.DECIMAL(10, 8) },
  longitude: { type: DataTypes.DECIMAL(11, 8) },
  images: { type: DataTypes.JSON },
  availability: { type: DataTypes.JSON },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
  approved_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "vendor_services" })
