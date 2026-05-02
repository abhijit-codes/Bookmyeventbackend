import { Router } from "express"
import { addMyFavorite, listMyFavorites, removeMyFavorite } from "../controllers/favorite.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"

const router = Router()

router.get("/", authenticate, authorize("user"), listMyFavorites)
router.post("/:vendorId", authenticate, authorize("user"), addMyFavorite)
router.delete("/:vendorId", authenticate, authorize("user"), removeMyFavorite)

export default router
