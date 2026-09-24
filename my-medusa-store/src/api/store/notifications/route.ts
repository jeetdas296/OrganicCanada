import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../../modules/customer-notification"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const notificationService = req.scope.resolve(CUSTOMER_NOTIFICATION_MODULE)
  
  const limit = parseInt((req.query.limit as string) || "50", 10)
  const offset = parseInt((req.query.offset as string) || "0", 10)

  try {
    const filters: any = { customer_id: callerId }
    
    if (req.query.is_read !== undefined) {
      if (req.query.is_read === "true") {
        filters.read_at = { $ne: null }
      } else {
        filters.read_at = null
      }
    }

    const [notifications, count] = await notificationService.listAndCountCustomerNotifications(
      filters,
      {
        skip: offset,
        take: limit,
        order: { created_at: "DESC" }
      }
    )

    // Calculate total unread count for the header badge
    const [_, unreadCount] = await notificationService.listAndCountCustomerNotifications(
      { customer_id: callerId, read_at: null },
      { take: 1 }
    )

    return res.status(200).json({ notifications, count, unread_count: unreadCount })
  } catch (error: any) {
    console.error("[Notification] Error fetching notifications:", error)
    return res.status(500).json({ message: "Internal Server Error fetching notifications." })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const notificationService = req.scope.resolve(CUSTOMER_NOTIFICATION_MODULE)

  try {
    const unreadNotifications = await notificationService.listCustomerNotifications({
      customer_id: callerId,
      read_at: null
    })

    if (unreadNotifications.length > 0) {
      await notificationService.updateCustomerNotifications(
        unreadNotifications.map((n: any) => ({
          id: n.id,
          read_at: new Date()
        }))
      )
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error("[Notification] Error marking all notifications read:", error)
    return res.status(500).json({ message: "Internal Server Error updating notifications." })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const notificationService = req.scope.resolve(CUSTOMER_NOTIFICATION_MODULE)

  try {
    const allNotifications = await notificationService.listCustomerNotifications({
      customer_id: callerId
    })

    if (allNotifications.length > 0) {
      await notificationService.deleteCustomerNotifications(allNotifications.map((n: any) => n.id))
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error("[Notification] Error clearing notifications:", error)
    return res.status(500).json({ message: "Internal Server Error clearing notifications." })
  }
}
