"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { getNotifications, markAllNotificationsRead } from "@lib/data/notifications"
import { toast } from "@medusajs/ui"
import { useRouter } from "next/navigation"

type NotificationContextType = {
  notifications: any[]
  unreadCount: number
  refetch: () => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider")
  return context
}

export const NotificationProvider = ({
  children,
  initialData,
  customerId
}: {
  children: React.ReactNode
  initialData: { notifications: any[]; unread_count: number }
  customerId?: string
}) => {
  const [notifications, setNotifications] = useState(initialData.notifications)
  const [unreadCount, setUnreadCount] = useState(initialData.unread_count)
  const knownNotificationIds = useRef(new Set(initialData.notifications.map((n: any) => n.id)))
  const isFetchingRef = useRef(false)
  const router = useRouter()

  const fetchNotifications = async () => {
    if (!customerId || isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const data = await getNotifications(undefined, 50, 0)
      
      data.notifications.forEach((n: any) => {
        if (!knownNotificationIds.current.has(n.id)) {
          knownNotificationIds.current.add(n.id)
          
          if (!n.read_at) {
            toast.info(n.title, {
              description: n.message,
              duration: 4000,
            })
          }
        }
      })

      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
    } finally {
      isFetchingRef.current = false
    }
  }

  const markAllRead = async () => {
    const success = await markAllNotificationsRead()
    if (success) {
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    }
  }

  useEffect(() => {
    if (!customerId) return
    const interval = setInterval(fetchNotifications, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [customerId])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refetch: fetchNotifications, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}
