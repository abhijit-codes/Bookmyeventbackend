import { v2 as cloudinary } from "cloudinary"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "../config/env.js"

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
})

const saveLocal = async (file, folder) => {
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]+/g, "-")
  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]+/g, "-")}`
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
  const uploadDir = path.join(backendRoot, "uploads", safeFolder)
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, safeName), file.buffer)
  return { url: `/uploads/${safeFolder}/${safeName}`, publicId: safeName }
}

export const uploadImageBuffer = async (file, folder = "book-my-event") => {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    return saveLocal(file, folder)
  }

  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
        if (error) return reject(error)
        resolve({ url: result.secure_url, publicId: result.public_id })
      })
      stream.end(file.buffer)
    })
  } catch (_error) {
    return saveLocal(file, folder)
  }
}
