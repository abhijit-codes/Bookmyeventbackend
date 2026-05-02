import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

const addColumnIfMissing = async (tableName, columnName, definition) => {
  const queryInterface = sequelize.getQueryInterface()
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) await queryInterface.addColumn(tableName, columnName, definition)
}

export const ensureRuntimeSchema = async () => {
  const dashboardSettingColumns = {
    dark_theme: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    app_language: {
      type: DataTypes.ENUM("en", "hi", "or"),
      defaultValue: "en",
    },
    audio_language: {
      type: DataTypes.ENUM("en", "hi", "or"),
      defaultValue: "en",
    },
    support_language: {
      type: DataTypes.ENUM("en", "hi", "or"),
      defaultValue: "en",
    },
    order_alert_sound: {
      type: DataTypes.ENUM("classic", "soft", "urgent", "silent"),
      defaultValue: "classic",
    },
  }

  for (const [columnName, definition] of Object.entries(dashboardSettingColumns)) {
    await addColumnIfMissing("users", columnName, definition)
    await addColumnIfMissing("vendors", columnName, definition)
  }

  await addColumnIfMissing("bookings", "vendor_base_amount", {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  })
  await addColumnIfMissing("bookings", "vendor_commission_percent", {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  })
  await addColumnIfMissing("bookings", "vendor_commission_amount", {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  })
  await addColumnIfMissing("bookings", "customer_service_charge_percent", {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  })
  await addColumnIfMissing("bookings", "customer_service_charge", {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  })
}
