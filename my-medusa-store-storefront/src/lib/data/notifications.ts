"use server"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function getNotifications(isRead?: boolean, limit = 50, offset = 0) {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return { notifications: [], count: 0, unread_count: 0 }

  try {
    const url = new URL(`${backendUrl}/store/notifications`)
    url.searchParams.append("limit", limit.toString())
    url.searchParams.append("offset", offset.toString())
    if (isRead !== undefined) {
      url.searchParams.append("is_read", isRead.toString())
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
        ...authHeaders,
      },
      next: { tags: ["notifications"], revalidate: 0 }
    })

    if (!response.ok) return { notifications: [], count: 0, unread_count: 0 }
    return await response.json()
  } catch (error) {
    return { notifications: [], count: 0, unread_count: 0 }
  }
}

export async function markNotificationRead(id: string) {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return false

  try {
    const response = await fetch(`${backendUrl}/store/notifications/${id}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
        ...authHeaders,
      }
    })
    
    if (response.ok) {
      revalidateTag("notifications")
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function markAllNotificationsRead() {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return false

  try {
    const response = await fetch(`${backendUrl}/store/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
        ...authHeaders,
      }
    })
    
    if (response.ok) {
      revalidateTag("notifications")
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function clearAllNotifications() {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return false

  try {
    const response = await fetch(`${backendUrl}/store/notifications`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
        ...authHeaders,
      }
    })
    
    if (response.ok) {
      revalidateTag("notifications")
      return true
    }
    return false
  } catch {
    return false
  }
}
