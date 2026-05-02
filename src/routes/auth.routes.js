import { Router } from "express"
import { googleLogin, listMyNotifications, login, logout, me, refresh, requestUserPasswordOtp, requestVendorPasswordOtp, resetUserPassword, resetVendorPassword, sendUserSupportMessage, signupUser, signupVendor, updateMe, updateMyProfileImage, verifyUserPasswordOtp, verifyVendorPasswordOtp } from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/upload.middleware.js"
import { validate } from "../middlewares/validate.middleware.js"
import { googleLoginSchema, loginSchema, refreshSchema, userForgotPasswordRequestSchema, userForgotPasswordResetSchema, userForgotPasswordVerifySchema, userSignupSchema, vendorForgotPasswordRequestSchema, vendorForgotPasswordResetSchema, vendorForgotPasswordVerifySchema, vendorSignupSchema } from "../validators/auth.validator.js"

const router = Router()

router.post("/signup/user", validate(userSignupSchema), signupUser)
router.post(
  "/signup/vendor",
  upload.fields([
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
    { name: "liveSelfie", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  validate(vendorSignupSchema),
  signupVendor,
)
router.post("/login", validate(loginSchema), login)
router.post("/google", validate(googleLoginSchema), googleLogin)
router.post("/forgot-password/request-otp", validate(userForgotPasswordRequestSchema), requestUserPasswordOtp)
router.post("/forgot-password/verify-otp", validate(userForgotPasswordVerifySchema), verifyUserPasswordOtp)
router.post("/forgot-password/reset", validate(userForgotPasswordResetSchema), resetUserPassword)
router.post("/vendor/forgot-password/request-otp", validate(vendorForgotPasswordRequestSchema), requestVendorPasswordOtp)
router.post("/vendor/forgot-password/verify-otp", validate(vendorForgotPasswordVerifySchema), verifyVendorPasswordOtp)
router.post("/vendor/forgot-password/reset", validate(vendorForgotPasswordResetSchema), resetVendorPassword)
router.post("/refresh", validate(refreshSchema), refresh)
router.post("/logout", logout)
router.get("/me", authenticate, me)
router.get("/me/notifications", authenticate, listMyNotifications)
router.patch("/me", authenticate, updateMe)
router.patch("/me/image", authenticate, upload.single("profileImage"), updateMyProfileImage)
router.post("/me/support-message", authenticate, sendUserSupportMessage)

export default router
