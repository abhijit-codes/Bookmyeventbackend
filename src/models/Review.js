import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Review = sequelize.define("Review", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  booking_id: { type: DataTypes.BIGINT.UNSIGNED },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment: { type: DataTypes.TEXT },
  created_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
  approved_by_admin_id: { type: DataTypes.BIGINT.UNSIGNED },
}, { tableName: "reviews" })
