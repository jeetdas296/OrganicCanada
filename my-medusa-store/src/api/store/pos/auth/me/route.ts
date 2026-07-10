import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyToken } from "../../../../../modules/pos/utils/auth"

function getCookie(name: string, cookiesHeader: string | undefined): string | null {
  if (!cookiesHeader) return null
  const match = cookiesHeader.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return match[2]
  return null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const token = getCookie("pos_token", req.headers.cookie) || req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const posModule = req.scope.resolve("pos")

  try {
    const user = await posModule.retrievePosUser(decoded.id)
    if (!user || !user.active) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { password_hash, ...safeUser } = user
    return res.status(200).json({ user: safeUser })
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" })
  }
}
