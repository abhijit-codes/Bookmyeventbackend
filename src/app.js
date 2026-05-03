import compression from "compression"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import morgan from "morgan"
import { config } from "./config/env.js"
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js"
import { logger, stream } from "./config/logger.js"
import routes from "./routes/index.js"

const app = express()
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(compression())
app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
  "/uploads",
  express.static(path.join(backendRoot, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
      res.setHeader("Access-Control-Allow-Origin", "*")
    },
  }),
)
app.use(morgan("combined", { stream }))
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)
app.get("/", (_req, res) => {
  res.send("BookMyEvent API running 🚀")
})

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "BookMyEvent API" })
})

app.use("/api/v1", routes)
app.use(notFoundHandler)
app.use(errorHandler)

logger.info("Express app configured")

export default app
