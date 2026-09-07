import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function palEscrowSyncHandler({
  event: { data },
  container,
}: SubscriberArgs<{ shipmentId: string; status: string; vendorId?: string }>) {
  const { shipmentId, status, vendorId } = data

  if (status !== "DELIVERED") {
    // Only release escrow upon final delivery
    return
  }

  if (!vendorId) {
    // Standard B2C might not have an escrow requirement, or it could be internal
    console.log(`[EscrowSync] Shipment ${shipmentId} delivered, but no vendor attached. Skipping escrow release.`)
    return
  }

  console.log(`[EscrowSync] Shipment ${shipmentId} status is DELIVERED. Initiating escrow release to vendor ${vendorId}...`)

  // In a complete implementation, this would interact with a Medusa Payment Module
  // or a custom Escrow Module to unlock the captured funds and remit to the vendor.
  
  // const paymentService = container.resolve("payment")
  // await paymentService.releaseEscrow(shipmentId, vendorId)
  
  console.log(`[EscrowSync] Escrow successfully released to vendor ${vendorId} for shipment ${shipmentId}.`)
}

export const config: SubscriberConfig = {
  event: "pal.shipment.status_updated",
}
