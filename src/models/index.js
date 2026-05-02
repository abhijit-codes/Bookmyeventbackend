import { Admin } from "./Admin.js"
import { Address } from "./Address.js"
import { BankAccount } from "./BankAccount.js"
import { Booking } from "./Booking.js"
import { Category } from "./Category.js"
import { Payment } from "./Payment.js"
import { PlatformSetting } from "./PlatformSetting.js"
import { Notification } from "./Notification.js"
import { RefreshToken } from "./RefreshToken.js"
import { Review } from "./Review.js"
import { SupportTicket } from "./SupportTicket.js"
import { User } from "./User.js"
import { UserFavorite } from "./UserFavorite.js"
import { UserPasswordReset } from "./UserPasswordReset.js"
import { Vendor } from "./Vendor.js"
import { VendorDocument } from "./VendorDocument.js"
import { VendorPasswordReset } from "./VendorPasswordReset.js"
import { VendorService } from "./VendorService.js"
import { Wallet } from "./Wallet.js"
import { WalletTransaction } from "./WalletTransaction.js"

Category.hasMany(VendorService, { foreignKey: "category_id" })
VendorService.belongsTo(Category, { foreignKey: "category_id" })

Vendor.hasMany(VendorService, { foreignKey: "vendor_id" })
VendorService.belongsTo(Vendor, { foreignKey: "vendor_id" })

Vendor.hasMany(VendorDocument, { foreignKey: "vendor_id" })
VendorDocument.belongsTo(Vendor, { foreignKey: "vendor_id" })

Vendor.hasMany(VendorPasswordReset, { foreignKey: "vendor_id" })
VendorPasswordReset.belongsTo(Vendor, { foreignKey: "vendor_id" })

User.hasMany(UserPasswordReset, { foreignKey: "user_id" })
UserPasswordReset.belongsTo(User, { foreignKey: "user_id" })

User.hasMany(UserFavorite, { foreignKey: "user_id" })
UserFavorite.belongsTo(User, { foreignKey: "user_id" })
Vendor.hasMany(UserFavorite, { foreignKey: "vendor_id" })
UserFavorite.belongsTo(Vendor, { foreignKey: "vendor_id" })

Vendor.hasOne(Wallet, { foreignKey: "vendor_id" })
Wallet.belongsTo(Vendor, { foreignKey: "vendor_id" })

Vendor.hasMany(BankAccount, { foreignKey: "vendor_id" })
BankAccount.belongsTo(Vendor, { foreignKey: "vendor_id" })

User.hasMany(Address, { foreignKey: "user_id" })
Vendor.hasMany(Address, { foreignKey: "vendor_id" })

User.hasMany(Booking, { foreignKey: "user_id" })
Vendor.hasMany(Booking, { foreignKey: "vendor_id" })
VendorService.hasMany(Booking, { foreignKey: "vendor_service_id" })
Booking.belongsTo(User, { foreignKey: "user_id" })
Booking.belongsTo(Vendor, { foreignKey: "vendor_id" })
Booking.belongsTo(VendorService, { foreignKey: "vendor_service_id" })

Booking.hasMany(Payment, { foreignKey: "booking_id" })
Payment.belongsTo(Booking, { foreignKey: "booking_id" })

Wallet.hasMany(WalletTransaction, { foreignKey: "wallet_id" })
WalletTransaction.belongsTo(Wallet, { foreignKey: "wallet_id" })
Booking.hasMany(WalletTransaction, { foreignKey: "booking_id" })

User.hasMany(Review, { foreignKey: "user_id" })
Vendor.hasMany(Review, { foreignKey: "vendor_id" })
Booking.hasOne(Review, { foreignKey: "booking_id" })
Review.belongsTo(User, { foreignKey: "user_id" })
Review.belongsTo(Vendor, { foreignKey: "vendor_id" })
Review.belongsTo(Booking, { foreignKey: "booking_id" })

Admin.hasMany(Category, { foreignKey: "created_by_admin_id", as: "createdCategories" })
Admin.hasMany(Vendor, { foreignKey: "approved_by_admin_id", as: "approvedVendors" })
Admin.hasMany(Notification, { foreignKey: "created_by_admin_id" })
Admin.hasMany(SupportTicket, { foreignKey: "replied_by_admin_id", as: "repliedTickets" })
User.hasMany(SupportTicket, { foreignKey: "user_id" })
Vendor.hasMany(SupportTicket, { foreignKey: "vendor_id" })
SupportTicket.belongsTo(User, { foreignKey: "user_id" })
SupportTicket.belongsTo(Vendor, { foreignKey: "vendor_id" })

export {
  Admin,
  Address,
  BankAccount,
  Booking,
  Category,
  Payment,
  PlatformSetting,
  Notification,
  RefreshToken,
  Review,
  SupportTicket,
  User,
  UserFavorite,
  UserPasswordReset,
  Vendor,
  VendorDocument,
  VendorPasswordReset,
  VendorService,
  Wallet,
  WalletTransaction,
}
