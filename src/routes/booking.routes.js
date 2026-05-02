import { Router } from "express"
import {
  cancelBookingByVendor,
  cancelBookingByUser,
  completeBooking,
  confirmBookingByVendor,
  createAdvanceOrder,
  createRemainingOrder,
  listMyBookings,
  verifyAdvanceAndCreateBooking,
  verifyRemainingPayment,
} from "../controllers/booking.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validate.middleware.js"
import { createBookingSchema, verifyPaymentSchema } from "../validators/booking.validator.js"

const router = Router()

router.get("/mine", authenticate, authorize("user"), listMyBookings)
router.post("/advance-order", authenticate, authorize("user"), validate(createBookingSchema), createAdvanceOrder)
router.post("/:serviceId/verify-advance", authenticate, authorize("user"), verifyAdvanceAndCreateBooking)
router.patch("/:id/vendor-confirm", authenticate, authorize("vendor"), confirmBookingByVendor)
router.patch("/:id/vendor-cancel", authenticate, authorize("vendor"), cancelBookingByVendor)
router.patch("/:id/user-cancel", authenticate, authorize("user"), cancelBookingByUser)
router.post("/:id/remaining-order", authenticate, authorize("user"), createRemainingOrder)
router.post("/:id/verify-remaining", authenticate, authorize("user"), validate(verifyPaymentSchema), verifyRemainingPayment)
router.patch("/:id/complete", authenticate, authorize("vendor"), completeBooking)

export default router
