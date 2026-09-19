"use client"

import { Heading, Text, Badge, Button } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import { CheckCircleSolid, CircleDottedLine, CircleSolid } from "@medusajs/icons"
import { useEffect, useState } from "react"

export default function OrderTracking({ orderId }: { orderId: string }) {
  const [trackingData, setTrackingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTracking = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/store/orders/${orderId}/tracking`)
      if (!res.ok) {
        throw new Error("Unable to load tracking information right now. Please try again later.")
      }
      const data = await res.json()
      setTrackingData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTracking()
  }, [orderId])

  if (loading) {
    return (
      <div>
        <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
          Shipment Tracking
        </Heading>
        <Text className="text-ui-fg-subtle animate-pulse">Loading shipment tracking...</Text>
        <Divider className="mt-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
          Shipment Tracking
        </Heading>
        <Text className="text-ui-fg-error">{error}</Text>
        <Divider className="mt-8" />
      </div>
    )
  }

  if (!trackingData || !trackingData.shipments || trackingData.shipments.length === 0) {
    return null // Only render if there are PAL shipments
  }

  return (
    <div>
      <div className="flex justify-between items-center my-6">
        <Heading level="h2" className="text-3xl-regular">
          Shipment Tracking
        </Heading>
        <Button variant="secondary" size="small" onClick={fetchTracking}>
          Refresh tracking
        </Button>
      </div>

      <div className="flex flex-col gap-y-8">
        {trackingData.shipments.map((shipment: any, index: number) => {
          const isUnbooked = !shipment.carrier?.name && shipment.currentStatus !== "BOOKED" && shipment.currentStatus !== "SHIPPED"
          const hasTrackingEvents = shipment.tracking?.events?.length > 0

          return (
            <div key={shipment.shipmentId} className="border p-6 rounded-lg bg-ui-bg-subtle flex flex-col gap-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <Heading level="h3" className="text-xl-semi mb-1">
                    Shipment {trackingData.shipments.length > 1 ? index + 1 : ""}
                  </Heading>
                  {shipment.scenario && (
                    <Badge color="blue" className="mb-2">
                      {shipment.scenario.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                {shipment.currentStatus && (
                  <Badge size="large">{shipment.currentStatus}</Badge>
                )}
              </div>

              {!isUnbooked && shipment.carrier?.name ? (
                <div className="bg-ui-bg-base border rounded-md p-4">
                  <Text className="text-sm text-ui-fg-subtle font-medium">Carrier</Text>
                  <Text className="text-base font-semibold capitalize mb-2">{shipment.carrier.name.replace(/_/g, " ")}</Text>
                  
                  {shipment.carrier.trackingNumber ? (
                    <>
                      <Text className="text-sm text-ui-fg-subtle font-medium mt-2">Tracking Number</Text>
                      <div className="flex items-center gap-2 mt-1">
                        <Text className="text-base font-mono">{shipment.carrier.trackingNumber}</Text>
                        <Button 
                          variant="secondary" 
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(shipment.carrier.trackingNumber)
                            alert("Tracking number copied!")
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Text className="text-sm text-ui-fg-subtle italic">Tracking number pending</Text>
                  )}
                </div>
              ) : (
                <div className="bg-ui-bg-base border rounded-md p-4">
                  <Heading level="h3" className="text-base font-medium mb-1">Preparing your shipment</Heading>
                  <Text className="text-sm text-ui-fg-subtle">
                    Your order has been received and is being prepared for shipment.
                  </Text>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6 mt-2">
                {/* PAL Operational Timeline */}
                <div className="flex-1">
                  <Heading level="h3" className="text-base font-semibold mb-4">Shipment Progress</Heading>
                  
                  {shipment.timeline && shipment.timeline.length > 0 ? (
                    <div className="flex flex-col">
                      {shipment.timeline.map((step: any, stepIdx: number) => {
                        const isLast = stepIdx === shipment.timeline.length - 1
                        const isCompleted = step.status === "COMPLETED"
                        const isInProgress = step.status === "IN_PROGRESS"
                        
                        return (
                          <div key={step.key} className="relative flex gap-x-4">
                            {!isLast && (
                              <div className={`absolute top-6 bottom-0 left-2.5 w-px -translate-x-1/2 ${isCompleted ? 'bg-green-500' : 'bg-ui-border-base'}`} />
                            )}
                            <div className="mt-1 relative z-10 flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircleSolid className="text-green-500 w-5 h-5 bg-ui-bg-subtle" />
                              ) : isInProgress ? (
                                <CircleSolid className="text-blue-500 w-5 h-5 bg-ui-bg-subtle" />
                              ) : (
                                <CircleDottedLine className="text-ui-fg-muted w-5 h-5 bg-ui-bg-subtle" />
                              )}
                            </div>
                            <div className="pb-6">
                              <Text className={`text-base font-medium ${isCompleted || isInProgress ? 'text-ui-fg-base' : 'text-ui-fg-muted'}`}>
                                {step.label}
                              </Text>
                              {(isCompleted || isInProgress) && step.updatedAt && (
                                <Text className="text-sm text-ui-fg-subtle">
                                  {new Date(step.updatedAt).toLocaleDateString()} · {new Date(step.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <Text className="text-sm text-ui-fg-subtle">Progress timeline is not available.</Text>
                  )}
                </div>

                {/* Carrier Tracking Events */}
                {!isUnbooked && shipment.carrier?.name && (
                  <div className="flex-1 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6">
                    <Heading level="h3" className="text-base font-semibold mb-4">Carrier Tracking</Heading>
                    
                    {hasTrackingEvents ? (
                      <div className="flex flex-col">
                        {shipment.tracking.events.map((evt: any, evtIdx: number) => {
                          const isLast = evtIdx === shipment.tracking.events.length - 1
                          const isFirst = evtIdx === 0
                          
                          return (
                            <div key={evtIdx} className="relative flex gap-x-4">
                              {!isLast && (
                                <div className="absolute top-6 bottom-0 left-2.5 w-px -translate-x-1/2 bg-ui-border-base" />
                              )}
                              <div className="mt-1.5 relative z-10 flex-shrink-0">
                                {isFirst ? (
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-1.5 ring-4 ring-ui-bg-subtle" />
                                ) : (
                                  <div className="w-2.5 h-2.5 rounded-full bg-ui-fg-muted ml-1.5 ring-4 ring-ui-bg-subtle" />
                                )}
                              </div>
                              <div className="pb-6">
                                <Text className={`text-sm font-semibold ${isFirst ? 'text-ui-fg-base' : 'text-ui-fg-subtle'}`}>
                                  {evt.status.replace(/_/g, " ")}
                                </Text>
                                {evt.description && (
                                  <Text className={`text-sm ${isFirst ? 'text-ui-fg-base' : 'text-ui-fg-subtle'}`}>
                                    {evt.description}
                                  </Text>
                                )}
                                {evt.location && (
                                  <Text className="text-xs text-ui-fg-subtle mt-0.5 font-medium">
                                    {evt.location}
                                  </Text>
                                )}
                                <Text className="text-xs text-ui-fg-subtle mt-0.5">
                                  {new Date(evt.timestamp).toLocaleDateString()} · {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <Text className="text-sm text-ui-fg-subtle italic">
                        Tracking updates will appear here once the carrier provides them.
                      </Text>
                    )}
                  </div>
                )}
              </div>

            </div>
          )
        })}
      </div>
      
      <Divider className="mt-8" />
    </div>
  )
}
