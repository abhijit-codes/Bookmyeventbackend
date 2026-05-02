import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const VendorDocument = sequelize.define("VendorDocument", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  type: { type: DataTypes.ENUM("aadhaar_front", "aadhaar_back", "live_selfie", "pan", "gst", "business"), allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  cloudinary_public_id: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
  approved_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "vendor_documents" })
