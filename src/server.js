import app from "./app.js"
import { config } from "./config/env.js"
import { sequelize } from "./config/database.js"
import { logger } from "./config/logger.js"
import "./models/index.js"
import { seedSystemData } from "./seeders/system.seed.js"
import { ensureRuntimeSchema } from "./utils/schema.js"

const startServer = async () => {
  try {
    await sequelize.authenticate()
    logger.info("MySQL connection established")

    if (config.nodeEnv === "development") {
      await sequelize.sync()
      await ensureRuntimeSchema()
      logger.info("Sequelize models synced")
      await seedSystemData()
    }

    app.listen(config.port, () => {
      logger.info(`API server running on port ${config.port}`)
    })
  } catch (error) {
    logger.error("Unable to start server", error)
    process.exit(1)
  }
}

startServer()
