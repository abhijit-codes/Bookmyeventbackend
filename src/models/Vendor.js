import { DataTypes } from "sequelize"
import bcrypt from "bcryptjs"
import { sequelize } from "../config/database.js"

export const Vendor = sequelize.define("Vendor", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  business_name: { type: DataTypes.STRING(160) },
  organisation_name: { type: DataTypes.STRING(160) },
  organisation_number: { type: DataTypes.STRING(80) },
  organisation_email: { type: DataTypes.STRING(160), validate: { isEmail: true } },
  gstin: { type: DataTypes.STRING(30) },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  alt_phone: { type: DataTypes.STRING(20) },
  profile_image_url: { type: DataTypes.STRING },
  dark_theme: { type: DataTypes.BOOLEAN, defaultValue: false },
  app_language: { type: DataTypes.ENUM("en", "hi", "or"), defaultValue: "en" },
  audio_language: { type: DataTypes.ENUM("en", "hi", "or"), defaultValue: "en" },
  support_language: { type: DataTypes.ENUM("en", "hi", "or"), defaultValue: "en" },
  order_alert_sound: { type: DataTypes.ENUM("classic", "soft", "urgent", "silent"), defaultValue: "classic" },
  password: { type: DataTypes.STRING, allowNull: false },
  address1: { type: DataTypes.STRING, allowNull: false },
  address2: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: false },
  pincode: { type: DataTypes.STRING(12), allowNull: false },
  latitude: { type: DataTypes.DECIMAL(10, 8) },
  longitude: { type: DataTypes.DECIMAL(11, 8) },
  role: { type: DataTypes.ENUM("vendor"), defaultValue: "vendor" },
  status: { type: DataTypes.ENUM("pending", "approved", "rejected", "suspended"), defaultValue: "pending" },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
  approved_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
  approved_at: { type: DataTypes.DATE },
}, { tableName: "vendors",
  hooks: {
    beforeSave: async (vendor) => {
      if (vendor.changed("password")) vendor.password = await bcrypt.hash(vendor.password, 12)
    },
  },
})

Vendor.prototype.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}
