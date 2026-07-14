import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyPassword, generateToken } from "../../../../../modules/pos/utils/auth"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, password } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required." })
  }

  const posModule = req.scope.resolve("pos")

  try {
    console.log("➡️ [POS LOGIN] Login attempt. (Email redacted)")
    const users = await posModule.listPosUsers({ email })
    const user = users[0]

    if (!user) {
      console.log("❌ [POS LOGIN] User not found.")
      return res.status(401).json({ message: "Invalid email or password." })
    }

    if (!user.active) {
      console.log("❌ [POS LOGIN] User inactive.")
      return res.status(401).json({ message: "Account is deactivated." })
    }

    const isValid = verifyPassword(password, user.password_hash)

    if (!isValid) {
      console.log("❌ [POS LOGIN] Password invalid.")
      return res.status(401).json({ message: "Invalid email or password." })
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role })

    // Set cookie
    res.setHeader("Set-Cookie", `pos_token=${token}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax; Secure`)

    const { password_hash, ...safeUser } = user
    return res.status(200).json({ message: "Logged in successfully", user: safeUser, token })
  } catch (error: any) {
    console.error("❌ [POS LOGIN] Error:", error.message)
    return res.status(500).json({ message: "Internal server error." })
  }
}
