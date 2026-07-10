import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hashPassword } from "../../../modules/pos/utils/auth"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, password, full_name, role, active, store_location_id, sales_channel_id } = req.body as any

  if (!email || !password || !full_name) {
    return res.status(400).json({ message: "email, password, and full_name are required." })
  }

  const posModule = req.scope.resolve("pos")

  try {
    const password_hash = hashPassword(password)
    const user = await posModule.createPosUsers({
      email,
      password_hash,
      full_name,
      role: role || "cashier",
      active: active !== undefined ? active : true,
      store_location_id: store_location_id || null,
      sales_channel_id: sales_channel_id || null,
    })

    const { password_hash: _, ...safeUser } = user
    return res.status(201).json({ pos_user: safeUser })
  } catch (error: any) {
    console.error("❌ [POS POST] Error:", error.message)
    return res.status(500).json({ message: "Failed to create POS user." })
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const posModule = req.scope.resolve("pos")

  try {
    const users = await posModule.listPosUsers({})
    const safeUsers = users.map((u: any) => {
      const { password_hash, ...rest } = u
      return rest
    })
    return res.status(200).json({ pos_users: safeUsers })
  } catch (error: any) {
    console.error("❌ [POS GET] Error:", error.message)
    return res.status(500).json({ message: "Failed to list POS users." })
  }
}
