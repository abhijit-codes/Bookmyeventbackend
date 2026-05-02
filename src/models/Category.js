import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Category = sequelize.define("Category", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "categories" })
