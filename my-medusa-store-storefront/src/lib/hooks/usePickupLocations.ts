"use client"

import { useState, useEffect, useCallback } from "react"

interface PickupLocation {
  id: string
  name: string
  address: string
  hours: string
  phone?: string
}

interface UsePickupLocationsReturn {
  locations: PickupLocation[]
  selectedLocation: PickupLocation | null
  loading: boolean
  error: string | null
  selectLocation: (location: PickupLocation) => void
  clearSelection: () => void
  createPickupFulfillment: (
    orderId: string,
    items: Array<{ item_id: string; quantity: number }>,
    pickupDate?: string
  ) => Promise<boolean>
}

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 
  process.env.MEDUSA_BACKEND_URL ||  // ← Add fallback
  "http://localhost:9000"

export function usePickupLocations(regionId?: string): UsePickupLocationsReturn {
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<PickupLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = regionId ? `?region_id=${regionId}` : ""
        const res = await fetch(
          `${MEDUSA_BACKEND_URL}/store/pickup/locations${params}`,
          { credentials: "include" }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setLocations(data.pickup_locations || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [regionId])

  const selectLocation = useCallback((location: PickupLocation) => {
    setSelectedLocation(location)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedLocation(null)
  }, [])

  const createPickupFulfillment = useCallback(
    async (
      orderId: string,
      items: Array<{ item_id: string; quantity: number }>,
      pickupDate?: string
    ): Promise<boolean> => {
      if (!selectedLocation) {
        setError("No pickup location selected")
        return false
      }
      try {
        const res = await fetch(`${MEDUSA_BACKEND_URL}/store/pickup/fulfill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order_id: orderId,
            location_id: selectedLocation.id,
            items,
            pickup_date: pickupDate,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to create pickup fulfillment")
        }
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [selectedLocation]
  )

  return {
    locations,
    selectedLocation,
    loading,
    error,
    selectLocation,
    clearSelection,
    createPickupFulfillment,
  }
}