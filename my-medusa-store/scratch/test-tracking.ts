import { ShiprocketStatusMapper } from "../src/modules/fulfillment-pal/providers/organic-canada/adapters/shiprocket/mapper"
import { TrackingProcessor } from "../src/modules/fulfillment-pal/core/tracking-processor"

async function runTests() {
  console.log("Running Shiprocket Phase C Tracking & Webhook Tests...")
  let passed = 0
  let failed = 0

  // 1. Test ShiprocketStatusMapper normalization
  console.log("\n--- Testing ShiprocketStatusMapper ---")
  const mockWebhookPayload = {
    awb: "AWB123",
    current_status: "Out For Delivery",
    shipment_track_activities: [
      {
        date: "2023-01-01 10:00:00",
        activity: "Picked Up",
        location: "Delhi"
      },
      {
        date: "2023-01-02 14:30:00",
        activity: "Out For Delivery",
        location: "Mumbai"
      }
    ]
  }

  const result = ShiprocketStatusMapper.normalizeTrackingResponse("AWB123", mockWebhookPayload)
  
  if (result.trackingNumber === "AWB123" && result.currentStatus === "OUT_FOR_DELIVERY") {
    console.log("✅ Mapper normalization basic fields")
    passed++
  } else {
    console.error("❌ Mapper normalization basic fields FAILED", result)
    failed++
  }

  if (result.events.length === 2 && result.events[0].status === "PICKED_UP") {
    console.log("✅ Mapper event mapping")
    passed++
  } else {
    console.error("❌ Mapper event mapping FAILED")
    failed++
  }

  // 2. Test TrackingProcessor Idempotency
  console.log("\n--- Testing TrackingProcessor Idempotency & State transitions ---")
  
  let currentShipmentStatus = "BOOKED"
  const createdEvents: any[] = []
  const historyRecords: any[] = []
  
  const mockPalService = {
    retrievePalShipment: async () => ({ id: "shp_123", status: currentShipmentStatus }),
    listPalTrackingEvents: async ({ provider_event_id }: any) => {
      return createdEvents.filter(e => e.provider_event_id === provider_event_id)
    },
    createPalTrackingEvents: async (data: any) => {
      createdEvents.push(data)
    },
    updatePalShipments: async (data: any) => {
      if (data.status) currentShipmentStatus = data.status
    },
    createPalShipmentStatusHistories: async (data: any) => {
      historyRecords.push(data)
    }
  }

  // First tracking update
  await TrackingProcessor.processTrackingResult(mockPalService, "shp_123", result)
  
  if (currentShipmentStatus === "OUT_FOR_DELIVERY" && createdEvents.length === 2 && historyRecords.length === 1) {
    console.log("✅ Processor updated state and recorded history correctly")
    passed++
  } else {
    console.error("❌ Processor state update FAILED", { currentShipmentStatus, createdEvents, historyRecords })
    failed++
  }

  // Duplicate tracking update (Idempotency)
  await TrackingProcessor.processTrackingResult(mockPalService, "shp_123", result)
  
  if (createdEvents.length === 2 && historyRecords.length === 1) {
    console.log("✅ Processor handled duplicate events correctly (Idempotency)")
    passed++
  } else {
    console.error("❌ Processor idempotency FAILED", { createdEvents, historyRecords })
    failed++
  }

  // Out of order tracking update (e.g., getting an old IN_TRANSIT event after OUT_FOR_DELIVERY)
  const stalePayload = {
    awb: "AWB123",
    current_status: "In Transit",
    shipment_track_activities: [
      {
        date: "2023-01-01 12:00:00", // New old event
        activity: "In Transit",
        location: "Surat"
      }
    ]
  }
  const staleResult = ShiprocketStatusMapper.normalizeTrackingResponse("AWB123", stalePayload)
  
  await TrackingProcessor.processTrackingResult(mockPalService, "shp_123", staleResult)

  // It should record the tracking event, but NOT update shipment status or history
  if (currentShipmentStatus === "OUT_FOR_DELIVERY" && createdEvents.length === 3 && historyRecords.length === 1) {
    console.log("✅ Processor handled out-of-order event correctly")
    passed++
  } else {
    console.error("❌ Processor out-of-order FAILED", { currentShipmentStatus, createdEvents, historyRecords })
    failed++
  }

  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

runTests().catch(console.error)
