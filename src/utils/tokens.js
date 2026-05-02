import crypto from "node:crypto"
import jwt from "jsonwebtoken"
import { config } from "../config/env.js"
import { RefreshToken } from "../models/index.js"

export const signAccessToken = (account) =>
  jwt.sign({ id: account.id, role: account.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  })

export const signRefreshToken = async (account) => {
  const token = jwt.sign({ id: account.id, role: account.role }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  })
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await RefreshToken.create({
    owner_id: account.id,
    owner_role: account.role,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })

  return token
}

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex")
