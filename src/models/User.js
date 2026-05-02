import { DataTypes } from "sequelize"
import bcrypt from "bcryptjs"
import { sequelize } from "../config/database.js"

export const User = sequelize.define("User", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(20) },
  profile_image_url: { type: DataTypes.STRING },
  dark_theme: { type: DataTypes.BOOLEAN, defaultValue: false },
  app_language: { type: DataTypes.ENUM("en", "hi", "or"), defaultValue: "en" },
  audio_language: { type: DataTypes.ENUM("en", "hi", "or"), defaultValue: "en" },
  support_language: { type: DataTypes.ENUM("en", "hi", "or"), defaultValue: "en" },
  order_alert_sound: { type: DataTypes.ENUM("classic", "soft", "urgent", "silent"), defaultValue: "classic" },
  password: { type: DataTypes.STRING },
  google_id: { type: DataTypes.STRING },
  role: { type: DataTypes.ENUM("user"), defaultValue: "user" },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "users",
  hooks: {
    beforeSave: async (user) => {
      if (user.password && user.changed("password")) user.password = await bcrypt.hash(user.password, 12)
    },
  },
})

User.prototype.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}
