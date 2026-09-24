"use client"

import React, { useEffect, useState } from "react"
import { getNotifications, markAllNotificationsRead, markNotificationRead, clearAllNotifications } from "@lib/data/notifications"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function NotificationsList() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = async () => {
    setIsLoading(true)
    const data = await getNotifications(undefined, 50, 0)
    setNotifications(data.notifications || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    const success = await markAllNotificationsRead()
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    }
  }

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all notifications?")) {
      const success = await clearAllNotifications()
      if (success) {
        setNotifications([])
      }
    }
  }

  const handleMarkRead = async (id: string, readAt: boolean) => {
    if (readAt) return
    const success = await markNotificationRead(id)
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    }
  }

  const getDestination = (entity_type: string, entity_id: string) => {
    switch (entity_type) {
      case "order":
      case "shipment":
        return `/account/orders/details/${entity_id}`
      case "quote":
        return `/b2b-quotes`
      default:
        return `/account`
    }
  }

  if (isLoading) {
    return (
      <div className="p-5 text-center text-muted">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 mb-0 fw-medium">Loading notifications...</p>
      </div>
    )
  }

  return (
    <div className="w-100">
      <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
        <h4 className="fw-bold mb-0">Notifications</h4>
        <div className="d-flex align-items-center gap-3">
          {notifications.some(n => !n.read_at) && (
            <button onClick={handleMarkAllRead} className="btn btn-sm btn-outline-success fw-bold">
              <i className="icofont-check-circled me-1"></i> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="btn btn-sm btn-outline-danger fw-bold">
              <i className="icofont-trash me-1"></i> Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-5 text-center bg-light rounded-3 text-muted border border-light">
          <div className="mb-3">
            <i className="icofont-notification fs-1 opacity-50"></i>
          </div>
          <h5 className="fw-bold">You have no notifications.</h5>
          <p className="mb-0">When we have updates for you, they will appear here.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 border rounded-3 d-flex align-items-start justify-content-between shadow-sm transition-all ${!notif.read_at ? 'bg-success bg-opacity-10 border-success' : 'bg-white'}`}
              onClick={() => handleMarkRead(notif.id, notif.read_at)}
              style={{ cursor: !notif.read_at ? 'pointer' : 'default' }}
            >
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-2">
                  {!notif.read_at && <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: '10px', height: '10px' }}></span>}
                  <h6 className="fw-bold text-dark mb-0">{notif.title}</h6>
                </div>
                <p className="text-muted small mb-3">{notif.message}</p>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted small">
                    <i className="icofont-clock-time me-1"></i>
                    {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString()}
                  </span>
                  {/* <LocalizedClientLink
                    href={getDestination(notif.entity_type, notif.entity_id)}
                    className="btn btn-link text-success fw-bold p-0 text-decoration-none"
                  >
                    View Details <i className="icofont-rounded-right"></i>
                  </LocalizedClientLink> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
