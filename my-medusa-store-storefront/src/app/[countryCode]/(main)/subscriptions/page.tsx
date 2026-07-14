"use client";

import { useEffect, useState } from "react"
import Link from "next/link"
import { retrieveCustomer, getCustomerSubscriptions, cancelSubscription } from "@lib/data/customer"
import { useParams } from "next/navigation"

export default function MySubscriptionsPage() {
  const params = useParams()
  const countryCode = params.countryCode as string

  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // Load subscriptions helper
  async function loadData() {
    try {
      const customerData = await retrieveCustomer().catch(() => null)
      const customer = customerData?.customer || customerData

      if (customer?.id) {
        const subData = await getCustomerSubscriptions(customer.id)
        setSubscriptions(subData)
      }
    } catch (err) {
      console.error("Failed to load client subscription data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm("Are you sure you want to cancel your weekly box delivery?")) return

    setCancelingId(subId)

    try {
      const result = await cancelSubscription(subId)

      if (result.ok) {
        alert("Your subscription has been canceled.")
        await loadData()
      } else {
        alert("Failed to cancel subscription. Please try again.")
      }
    } catch (err) {
      console.error("Cancellation error:", err)
      alert("Network error trying to cancel subscription.")
    } finally {
      setCancelingId(null)
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="mb-4">
        <Link href={`/${countryCode}/profile`} className="btn btn-outline-success fw-bold px-4">
          <i className="bi bi-arrow-left me-2"></i> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-3 shadow-sm p-4 border">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h4 className="fw-bold m-0">My Farm Subscriptions</h4>
          <span className="badge bg-success rounded-pill px-3 py-2">
            {subscriptions.length} Offers Registered
          </span>
        </div>

        {subscriptions.length > 0 ? (
          <div className="row row-cols-1 row-cols-md-2 g-4">
            {subscriptions.map((sub: any) => {
              const formattedDate = new Date(sub.next_billing_date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })

              return (
                <div className="col" key={sub.id}>
                  <div className="card h-100 border rounded-3 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="badge bg-light text-success border border-success px-3 py-1 text-uppercase fw-bold">
                          {sub.interval} delivery
                        </span>
                        {/* Status dynamically updates color if canceled */}
                        <span className={`badge ${sub.status === 'active' ? 'bg-success' : 'bg-danger'} px-3 py-1 text-uppercase`}>
                          {sub.status}
                        </span>
                      </div>
                        {/* 🟢 THE FIX: Fallback to variant name if metadata isn't finished loading */}
                        <h5 className="fw-bold mb-1 text-dark">
                        {sub.variant?.product?.title || "Subscription Item"}
                        </h5>
                      <p className="text-muted small mb-3">Subscription ID: {sub.id.substring(0, 12)}...</p>
                      
                      <hr className="my-3" />

                      <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded">
                        <div>
                          <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '10px' }}>
                            {sub.status === 'canceled' ? 'Final Delivery' : 'Next Delivery'}
                          </small>
                          <span className="fw-bold text-success">{formattedDate}</span>
                        </div>
                        <i className="bi bi-calendar2-check text-success fs-3"></i>
                      </div>
                    </div>
                    
                    <div className="card-footer bg-white border-0 p-4 pt-0">
                      {sub.status === 'active' ? (
                        <button 
                          className="btn btn-outline-danger w-100 btn-sm fw-bold rounded-pill" 
                          onClick={() => handleCancelSubscription(sub.id)}
                          disabled={cancelingId === sub.id}
                        >
                          {cancelingId === sub.id ? "Processing..." : "Cancel Subscription"}
                        </button>
                      ) : (
                        <button className="btn btn-secondary w-100 btn-sm fw-bold rounded-pill" disabled>
                          Subscription Canceled
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="bi bi-box-seam text-muted display-1 d-block mb-3"></i>
            <h5 className="text-muted">You don't have any recurring farm boxes yet.</h5>
            <Link href={`/${countryCode}/`} className="btn btn-success mt-3 fw-bold rounded-pill px-4">
              Explore Subscription Boxes
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}