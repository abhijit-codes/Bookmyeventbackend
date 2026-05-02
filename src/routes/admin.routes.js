import { Router } from "express"
import {
  approveVendor,
  completeManualWithdrawal,
  createCategory,
  createNotification,
  getAdminAnalytics,
  getAdminDashboard,
  getManualSettlementQueue,
  getModerationQueue,
  getVendorForAdmin,
  listBookingsForAdmin,
  listNotificationsForAdmin,
  listSupportTickets,
  listTransactionsForAdmin,
  listUsersForAdmin,
  listVendorsForAdmin,
  rejectVendor,
  replySupportTicket,
  suspendVendor,
  updateCommissionSettings,
  verifyBankAccount,
} from "../controllers/admin.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"

const router = Router()

router.use(authenticate, authorize("admin"))
router.get("/dashboard", getAdminDashboard)
router.patch("/commission-settings", updateCommissionSettings)
router.get("/users", listUsersForAdmin)
router.get("/vendors", listVendorsForAdmin)
router.get("/vendors/:id", getVendorForAdmin)
router.get("/bookings", listBookingsForAdmin)
router.get("/transactions", listTransactionsForAdmin)
router.get("/settlements", getManualSettlementQueue)
router.patch("/withdrawals/:id/complete", completeManualWithdrawal)
router.get("/analytics", getAdminAnalytics)
router.get("/reports", listSupportTickets)
router.patch("/reports/:id/reply", replySupportTicket)
router.get("/moderation", getModerationQueue)
router.get("/notifications", listNotificationsForAdmin)
router.post("/notifications", createNotification)
router.post("/categories", createCategory)
router.patch("/vendors/:id/approve", approveVendor)
router.patch("/vendors/:id/reject", rejectVendor)
router.patch("/vendors/:id/suspend", suspendVendor)
router.patch("/bank-accounts/:id/verify", verifyBankAccount)

export default router
