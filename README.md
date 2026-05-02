# BookMyEvent Backend

Production-style Node.js + Express.js backend for the event service marketplace.

## Stack

- Express MVC API
- MySQL with Sequelize ORM
- JWT access + refresh tokens
- Role authorization: `admin`, `vendor`, `user`
- Cloudinary image upload
- Nodemailer transactional emails
- Razorpay order verification and payout placeholder
- Mapbox or Geoapify geocoding support

## Important Security Note

Do not commit real `.env` secrets. The values shared in chat should be rotated before production use.

## Main API Routes

- `POST /api/v1/auth/signup/user`
- `POST /api/v1/auth/signup/vendor` with multipart fields `aadhaarFront`, `aadhaarBack`, `liveSelfie`, optional `pan`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/vendors`
- `POST /api/v1/vendors/services`
- `POST /api/v1/bookings/advance-order`
- `POST /api/v1/bookings/:serviceId/verify-advance`
- `PATCH /api/v1/bookings/:id/vendor-confirm`
- `POST /api/v1/bookings/:id/remaining-order`
- `POST /api/v1/bookings/:id/verify-remaining`
- `PATCH /api/v1/bookings/:id/complete`
- `GET /api/v1/wallet`
- `POST /api/v1/wallet/withdraw`
- `POST /api/v1/admin/categories`
- `PATCH /api/v1/admin/vendors/:id/approve`

## Payment Flow

1. User creates Razorpay order for advance amount equal to 10% of total service amount minus Rs.1.
2. After successful payment verification, booking is created and vendor gets an email with customer phone/location.
3. Vendor confirms booking.
4. Customer receives email to pay remaining amount within 48 hours.
5. If customer misses the deadline, booking becomes expired and advance is non-refundable.
6. When remaining amount is paid, vendor earning is added to pending wallet balance after platform fee and admin commission.
7. After order completion, pending balance moves to available balance.
8. Vendor withdrawal must use RazorpayX or Cashfree Payouts. Direct bank transfer logic is intentionally not implemented.
