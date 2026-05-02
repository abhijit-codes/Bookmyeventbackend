import { DataTypes } from "sequelize"
import bcrypt from "bcryptjs"
import { sequelize } from "../config/database.js"

export const Admin = sequelize.define("Admin", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("admin"), defaultValue: "admin" },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: "admins",
  hooks: {
    beforeSave: async (admin) => {
      if (admin.changed("password")) admin.password = await bcrypt.hash(admin.password, 12)
    },
  },
})

Admin.prototype.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}
