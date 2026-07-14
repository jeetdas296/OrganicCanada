"use server"

import { getAuthHeaders } from "@lib/data/cookies"

export type DownloadItem = {
  item_title: string
  file_name: string
  file_url: string
}

export async function fetchDigitalDownloads(orderId: string): Promise<DownloadItem[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
    const authHeaders = await getAuthHeaders()

    const res = await fetch(`${backendUrl}/store/orders/${orderId}/downloads`, {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
        ...authHeaders,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return []
    }

    const data = await res.json()
    return data.downloads || []
  } catch {
    return []
  }
}
