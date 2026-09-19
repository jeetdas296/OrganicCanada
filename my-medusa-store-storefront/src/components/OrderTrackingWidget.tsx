"use client"

import { useEffect, useState } from "react"
import { retrieveOrderTracking } from "@lib/data/orders"

export default function OrderTrackingWidget({ orderId }: { orderId: string }) {
  const [trackingData, setTrackingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTracking = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await retrieveOrderTracking(orderId)
      if (!data) {
        throw new Error("Unable to load tracking information.")
      }
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
      <div className="mt-4 pt-3 border-top">
        <div className="d-flex align-items-center text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          <small>Loading shipment tracking...</small>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 pt-3 border-top text-danger">
        <small><i className="icofont-warning me-1"></i> {error}</small>
      </div>
    )
  }

  if (!trackingData || !trackingData.shipments || trackingData.shipments.length === 0) {
    return (
      <div className="mt-4 pt-4 border-top">
        <h6 className="fw-bold mb-3"><i className="icofont-truck-loaded me-2 text-success"></i> Shipment Tracking</h6>
        <div className="bg-light rounded border p-4 text-center">
          <div className="mb-2">
            <i className="icofont-box fs-2 text-muted opacity-50"></i>
          </div>
          <h6 className="fw-bold text-dark mb-1">Preparing your shipment</h6>
          <p className="small text-muted m-0">
            We've received your order and are currently processing it. Tracking information will appear here once your shipment is booked.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-top">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6 className="fw-bold m-0"><i className="icofont-truck-loaded me-2 text-success"></i> Shipment Tracking</h6>
        <button className="btn btn-sm btn-outline-secondary" onClick={fetchTracking}>
          <i className="icofont-refresh"></i> Refresh
        </button>
      </div>

      <div className="d-flex flex-column gap-4">
        {trackingData.shipments.map((shipment: any, index: number) => {
          const isUnbooked = !shipment.carrier?.name && shipment.currentStatus !== "BOOKED" && shipment.currentStatus !== "SHIPPED"
          const hasTrackingEvents = shipment.tracking?.events?.length > 0

          return (
            <div key={shipment.shipmentId} className="bg-light rounded border p-3">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="fw-bold mb-1">
                    Shipment {trackingData.shipments.length > 1 ? index + 1 : ""}
                  </h6>
                  {shipment.scenario && (
                    <span className="badge bg-primary">
                      {shipment.scenario.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {shipment.currentStatus && (
                  <span className="badge bg-success">{shipment.currentStatus}</span>
                )}
              </div>

              {!isUnbooked && shipment.carrier?.name ? (
                <div className="bg-white border rounded p-3 mb-3">
                  <small className="text-muted d-block fw-bold mb-1">Carrier</small>
                  <div className="fw-bold text-capitalize mb-3">{shipment.carrier.name.replace(/_/g, " ")}</div>
                  
                  <small className="text-muted d-block fw-bold mb-1">Tracking Number</small>
                  {shipment.carrier.trackingNumber ? (
                    <div className="d-flex align-items-center gap-2">
                      <span className="font-monospace fw-bold">{shipment.carrier.trackingNumber}</span>
                      <button 
                        className="btn btn-sm btn-light border py-0 px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(shipment.carrier.trackingNumber)
                          alert("Tracking number copied!")
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted fst-italic small">Pending...</span>
                  )}
                </div>
              ) : (
                <div className="bg-white border rounded p-3 mb-3">
                  <h6 className="fw-bold mb-1 text-primary">Preparing your shipment</h6>
                  <p className="small text-muted m-0">
                    Your order has been received and is being prepared for shipment.
                  </p>
                </div>
              )}

              <div className="row g-4 mt-1">
                {/* PAL Operational Timeline */}
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 small text-muted text-uppercase">Shipment Progress</h6>
                  
                  {shipment.timeline && shipment.timeline.length > 0 ? (
                    <div className="position-relative ps-3 border-start border-2 border-light">
                      {shipment.timeline.map((step: any, stepIdx: number) => {
                        const isCompleted = step.status === "COMPLETED"
                        const isInProgress = step.status === "IN_PROGRESS"
                        
                        return (
                          <div key={step.key} className="position-relative mb-4">
                            <div 
                              className={`position-absolute rounded-circle ${isCompleted ? 'bg-success' : isInProgress ? 'bg-primary' : 'bg-secondary'}`}
                              style={{ 
                                width: '12px', 
                                height: '12px', 
                                left: '-23px', 
                                top: '4px',
                                border: '2px solid white'
                              }} 
                            />
                            <div>
                              <div className={`fw-bold small ${isCompleted || isInProgress ? 'text-dark' : 'text-muted'}`}>
                                {step.label}
                              </div>
                              {(isCompleted || isInProgress) && step.updatedAt && (
                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                  {new Date(step.updatedAt).toLocaleDateString()} · {new Date(step.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </small>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="small text-muted">Progress timeline is not available.</p>
                  )}
                </div>

                {/* Carrier Tracking Events */}
                {!isUnbooked && shipment.carrier?.name && (
                  <div className="col-md-6 border-md-start">
                    <h6 className="fw-bold mb-3 small text-muted text-uppercase">Carrier Tracking</h6>
                    
                    {hasTrackingEvents ? (
                      <div className="position-relative ps-3 border-start border-2 border-light">
                        {shipment.tracking.events.map((evt: any, evtIdx: number) => {
                          const isFirst = evtIdx === 0
                          
                          return (
                            <div key={evtIdx} className="position-relative mb-4">
                              <div 
                                className={`position-absolute rounded-circle ${isFirst ? 'bg-primary' : 'bg-secondary'}`}
                                style={{ 
                                  width: '10px', 
                                  height: '10px', 
                                  left: '-22px', 
                                  top: '5px',
                                  border: '2px solid white'
                                }} 
                              />
                              <div>
                                <div className={`fw-bold small text-capitalize ${isFirst ? 'text-dark' : 'text-muted'}`}>
                                  {evt.status.replace(/_/g, " ")}
                                </div>
                                {evt.description && (
                                  <div className={`small ${isFirst ? 'text-dark' : 'text-muted'}`}>
                                    {evt.description}
                                  </div>
                                )}
                                {evt.location && (
                                  <div className="text-muted fw-medium mt-1" style={{ fontSize: '0.75rem' }}>
                                    <i className="icofont-location-pin"></i> {evt.location}
                                  </div>
                                )}
                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                  {new Date(evt.timestamp).toLocaleDateString()} · {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </small>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded border">
                        <small className="text-muted fst-italic">
                          Tracking updates will appear here once the carrier provides them.
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
