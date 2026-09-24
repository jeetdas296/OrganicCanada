import { retrieveCustomer } from "@lib/data/customer"
import { getNotifications } from "@lib/data/notifications"
import { NotificationProvider } from "../notification-provider"
import { NotificationBell } from "../notification-bell"

export default async function NotificationWrapper() {
  const customer = await retrieveCustomer().catch(() => null)
  
  let initialData = { notifications: [], count: 0, unread_count: 0 }
  if (customer) {
    initialData = await getNotifications(undefined, 50, 0)
  }

  if (!customer) {
    return null // Hide if not logged in
  }

  return (
    <NotificationProvider initialData={initialData} customerId={customer.id}>
      <NotificationBell />
    </NotificationProvider>
  )
}
