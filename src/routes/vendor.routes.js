import { Router } from "express"
import { addBankAccount, addService, getVendor, getVendorDashboard, listVendorBookings, listVendors, sendSupportMessage, updateVendorProfile, updateVendorProfileImage } from "../controllers/vendor.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/upload.middleware.js"
import { validate } from "../middlewares/validate.middleware.js"
import { bankAccountSchema, serviceSchema } from "../validators/vendor.validator.js"

const router = Router()

router.get("/", listVendors)
router.get("/dashboard", authenticate, authorize("vendor"), getVendorDashboard)
router.get("/dashboard/bookings", authenticate, authorize("vendor"), listVendorBookings)
router.patch("/profile", authenticate, authorize("vendor"), updateVendorProfile)
router.patch("/profile/image", authenticate, authorize("vendor"), upload.single("profileImage"), updateVendorProfileImage)
router.post("/support-message", authenticate, authorize("vendor"), sendSupportMessage)
router.get("/:id", getVendor)
router.post(
  "/services",
  authenticate,
  authorize("vendor"),
  upload.array("images", 8),
  validate(serviceSchema),
  addService,
)
router.post("/bank-accounts", authenticate, authorize("vendor"), validate(bankAccountSchema), addBankAccount)

export default router
