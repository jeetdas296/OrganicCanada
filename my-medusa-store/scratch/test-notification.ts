import { initialize } from "@medusajs/modules-sdk"
import { CUSTOMER_NOTIFICATION_MODULE } from "../src/modules/customer-notification"
import { MedusaApp } from "@medusajs/modules-sdk"
import { loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

async function run() {
  console.log("Starting test...")
  const { modules } = await MedusaApp({
    modulesConfig: {
      [CUSTOMER_NOTIFICATION_MODULE]: {
        resolve: "./src/modules/customer-notification",
      },
    },
    sharedResourcesConfig: {
      database: {
        clientUrl: process.env.DATABASE_URL,
      },
    },
  })
  
  const notificationService = modules[CUSTOMER_NOTIFICATION_MODULE]
  
  console.log("Service loaded:", !!notificationService)
  
  const customerId = "cus_test123"
  const idempotencyKey = `${customerId}:test_event:2`
  
  console.log("Creating notification...")
  const notif = await notificationService.createCustomerNotifications({
    customer_id: customerId,
    title: "Test",
    message: "Test message",
    entity_type: "order",
    entity_id: "order_123",
    idempotency_key: idempotencyKey,
  })
  console.log("Created:", notif.id)
  
  console.log("Testing duplicate...")
  try {
    await notificationService.createCustomerNotifications({
      customer_id: customerId,
      title: "Test 2",
      message: "Test message 2",
      entity_type: "order",
      entity_id: "order_123",
      idempotency_key: idempotencyKey,
    })
    console.log("FAILED: Duplicate was allowed.")
  } catch (err: any) {
    if (err.code === "23505" || err.message.includes("unique constraint")) {
      console.log("SUCCESS: Duplicate caught by unique constraint.")
    } else {
      console.log("ERROR on duplicate:", err.message)
    }
  }
  
  console.log("Testing soft delete...")
  await notificationService.deleteCustomerNotifications(notif.id)
  
  const remaining = await notificationService.listCustomerNotifications({ id: notif.id })
  console.log("Remaining after delete:", remaining.length === 0 ? "SUCCESS (Soft deleted / hidden)" : "FAILED (Still visible)")
  
  // Try duplicate again after delete
  console.log("Testing duplicate after delete...")
  try {
    await notificationService.createCustomerNotifications({
      customer_id: customerId,
      title: "Test 3",
      message: "Test message 3",
      entity_type: "order",
      entity_id: "order_123",
      idempotency_key: idempotencyKey,
    })
    console.log("FAILED: Duplicate was allowed after soft delete.")
  } catch (err: any) {
    if (err.code === "23505" || err.message.includes("unique constraint")) {
      console.log("SUCCESS: Duplicate caught by unique constraint even after soft delete.")
    } else {
      console.log("ERROR on duplicate after delete:", err.message)
    }
  }
  
  process.exit(0)
}

run().catch(console.error)
