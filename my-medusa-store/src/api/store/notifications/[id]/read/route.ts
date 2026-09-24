import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../../../../modules/customer-notification"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { id } = req.params
  const notificationService = req.scope.resolve(CUSTOMER_NOTIFICATION_MODULE)

  try {
    const notifications = await notificationService.listCustomerNotifications({
      id: id,
      customer_id: callerId
    })

    if (notifications.length === 0) {
      return res.status(404).json({ message: "Notification not found" })
    }

    const notification = notifications[0]
    
    if (!notification.read_at) {
      await notificationService.updateCustomerNotifications({
        id: notification.id,
        read_at: new Date()
      })
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error(`[Notification] Error marking notification ${id} as read:`, error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
