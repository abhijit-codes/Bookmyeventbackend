import { Sequelize } from "sequelize"
import { logger } from "./logger.js"

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",

  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },

  logging: (message) => logger.debug(message),

  define: {
    underscored: true,
    timestamps: true,
  },

  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
})