import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const UserFavorite = sequelize.define("UserFavorite", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
  tableName: "user_favorites",
  indexes: [{ unique: true, fields: ["user_id", "vendor_id"] }],
})
