import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hashPassword } from "../../../../modules/pos/utils/auth"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const posUserId = req.params.id
  const { email, password, full_name, role, active, store_location_id, sales_channel_id } = req.body as any
  const posModule = req.scope.resolve("pos")

  try {
    const updateData: any = { id: posUserId }
    if (email) updateData.email = email
    if (password) updateData.password_hash = hashPassword(password)
    if (full_name) updateData.full_name = full_name
    if (role) updateData.role = role
    if (active !== undefined) updateData.active = active
    if (store_location_id !== undefined) updateData.store_location_id = store_location_id
    if (sales_channel_id !== undefined) updateData.sales_channel_id = sales_channel_id

    const updated = await posModule.updatePosUsers(updateData)
    const user = Array.isArray(updated) ? updated[0] : updated
    const { password_hash, ...safeUser } = user

    return res.status(200).json({ pos_user: safeUser })
  } catch (error: any) {
    console.error("❌ [POS PUT] Error:", error.message)
    return res.status(500).json({ message: "Failed to update POS user." })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const posUserId = req.params.id
  const posModule = req.scope.resolve("pos")

  try {
    await posModule.deletePosUsers(posUserId)
    return res.status(200).json({ id: posUserId, object: "pos_user", deleted: true })
  } catch (error: any) {
    console.error("❌ [POS DELETE] Error:", error.message)
    return res.status(500).json({ message: "Failed to delete POS user." })
  }
}
