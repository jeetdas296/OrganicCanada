"use client"

import React, { useState } from "react"
import { Popover, Transition } from "@headlessui/react"
import { useNotifications } from "../notification-provider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const unreadNotifications = notifications.filter((n: any) => !n.read_at)

  return (
    <Popover className="relative h-full flex">
      {({ open }) => (
        <>
          <Popover.Button className="relative flex items-center hover:text-ui-fg-base h-full">
            <div className="relative">
              <i className="bi bi-bell fs-5"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </Popover.Button>

          <Transition
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 top-full mt-2 w-80 rounded-lg bg-white shadow-xl ring-1 ring-gray-900/5 z-50">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold txt-compact-medium">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-ui-fg-interactive text-xs hover:underline">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {unreadNotifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No new notifications
                  </div>
                ) : (
                  unreadNotifications.slice(0, 5).map((notif: any) => (
                    <div key={notif.id} className="p-4 border-b hover:bg-gray-50 bg-blue-50/50">
                      <div className="text-sm font-medium">{notif.title}</div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.message}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 text-center border-t bg-gray-50 rounded-b-lg">
                <LocalizedClientLink href="/notifications" className="text-sm text-ui-fg-interactive hover:underline">
                  View all notifications
                </LocalizedClientLink>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
