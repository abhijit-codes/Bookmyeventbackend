import { Router } from "express"
import { getWallet, requestWithdrawal } from "../controllers/wallet.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"

const router = Router()

router.get("/", authenticate, authorize("vendor"), getWallet)
router.post("/withdraw", authenticate, authorize("vendor"), requestWithdrawal)

export default router
