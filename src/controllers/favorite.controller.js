import asyncHandler from "express-async-handler"
import { UserFavorite, Vendor } from "../models/index.js"
import { AppError } from "../utils/AppError.js"

export const listMyFavorites = asyncHandler(async (req, res) => {
  if (req.auth.role !== "user") throw new AppError("Only customers can view favorites", 403)

  const favorites = await UserFavorite.findAll({
    where: { user_id: req.auth.id },
    include: [{ model: Vendor, attributes: { exclude: ["password"] } }],
    order: [["created_at", "DESC"]],
  })

  res.json({
    success: true,
    data: favorites.map((favorite) => ({
      id: favorite.id,
      vendor_id: favorite.vendor_id,
      Vendor: favorite.Vendor,
    })),
  })
})

export const addMyFavorite = asyncHandler(async (req, res) => {
  if (req.auth.role !== "user") throw new AppError("Only customers can save favorites", 403)

  const vendorId = Number(req.params.vendorId)
  const vendor = await Vendor.findOne({ where: { id: vendorId, status: "approved" } })
  if (!vendor) throw new AppError("Vendor not found", 404)

  const [favorite] = await UserFavorite.findOrCreate({
    where: { user_id: req.auth.id, vendor_id: vendorId },
  })

  res.status(201).json({ success: true, data: favorite })
})

export const removeMyFavorite = asyncHandler(async (req, res) => {
  if (req.auth.role !== "user") throw new AppError("Only customers can remove favorites", 403)

  await UserFavorite.destroy({
    where: { user_id: req.auth.id, vendor_id: Number(req.params.vendorId) },
  })

  res.json({ success: true, message: "Favorite removed" })
})
