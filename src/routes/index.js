import { Router } from "express"
import adminRoutes from "./admin.routes.js"
import authRoutes from "./auth.routes.js"
import bookingRoutes from "./booking.routes.js"
import favoriteRoutes from "./favorite.routes.js"
import vendorRoutes from "./vendor.routes.js"
import walletRoutes from "./wallet.routes.js"

const router = Router()

router.use("/auth", authRoutes)
router.use("/vendors", vendorRoutes)
router.use("/bookings", bookingRoutes)
router.use("/favorites", favoriteRoutes)
router.use("/wallet", walletRoutes)
router.use("/admin", adminRoutes)

export default router
