import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Set-Cookie", `pos_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
  return res.status(200).json({ message: "Logged out successfully" })
}
