// my-medusa-store-storefront/src/app/[countryCode]/(main)/checkout/b2b-success/page.tsx

import Link from "next/link"
import { Suspense } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface B2BSuccessPageProps {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{
    quote_id?: string
    payment_term?: string
    company_id?: string
  }>
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default async function B2BSuccessPage({
  params,
  searchParams,
}: B2BSuccessPageProps) {
  const { countryCode } = await params
  const { quote_id, payment_term, company_id } = await searchParams

  // Format payment term for display
  const formattedPaymentTerm = payment_term
    ? payment_term.replace(/_/g, " ").toUpperCase()
    : "NET 30"

  return (
    <>
      {/* Page Header */}
      <div className="bg-success py-4">
        <div className="container text-center text-white">
          <h2 className="fw-bold mb-0">Quote Submitted</h2>
        </div>
      </div>

      <section className="py-5 bg-light osahan-main-body">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-7 col-md-9">

              {/* ── Success Card ─────────────────────────────────────────── */}
              <div className="bg-white rounded-3 shadow-sm p-5 border text-center mb-4">

                {/* Success Icon */}
                <div
                  className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10"
                  style={{ width: "80px", height: "80px" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="text-success"
                    style={{ color: "#198754" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <h3 className="fw-bold mb-2">
                  Quote Submitted Successfully!
                </h3>

                <p className="text-muted mb-4">
                  Your B2B order has been submitted for approval. Our team will
                  review your quote and notify you via email once a decision has
                  been made.
                </p>

                {/* Quote Reference */}
                {quote_id && (
                  <div
                    className="rounded-3 p-3 mb-4 text-start"
                    style={{ backgroundColor: "#f8f9fa", border: "1px solid #dee2e6" }}
                  >
                    <p className="text-muted small mb-1 fw-semibold">
                      QUOTE REFERENCE
                    </p>
                    <code
                      className="text-dark"
                      style={{ fontSize: "0.85rem", wordBreak: "break-all" }}
                    >
                      {quote_id}
                    </code>
                  </div>
                )}

                {/* Payment Term Badge */}
                <div className="mb-4">
                  <span className="badge bg-primary me-2" style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                    B2B Order
                  </span>
                  <span className="badge bg-secondary" style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                    {formattedPaymentTerm}
                  </span>
                </div>

                {/* No payment notice */}
                <div
                  className="alert alert-info text-start mb-4"
                  role="alert"
                  style={{ fontSize: "0.9rem" }}
                >
                  <i className="icofont-info-circle me-2"></i>
                  <strong>No payment has been charged.</strong> Payment will
                  only be processed after your quote is approved by our team,
                  according to your{" "}
                  <strong>{formattedPaymentTerm}</strong> payment terms.
                </div>
              </div>

              {/* ── What Happens Next ─────────────────────────────────────── */}
              <div className="bg-white rounded-3 shadow-sm p-4 border mb-4">
                <h5 className="fw-bold mb-4">
                  <i className="icofont-list me-2 text-success"></i>
                  What Happens Next?
                </h5>

                <div className="d-flex flex-column gap-3">
                  {/* Step 1 */}
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}
                    >
                      1
                    </div>
                    <div>
                      <p className="fw-semibold mb-0">Quote Under Review</p>
                      <p className="text-muted small mb-0">
                        Our team reviews your order (usually within 1 business
                        day).
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="ms-2 ps-3" style={{ borderLeft: "2px dashed #dee2e6", marginLeft: "15px" }}>
                    &nbsp;
                  </div>

                  {/* Step 2 */}
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}
                    >
                      2
                    </div>
                    <div>
                      <p className="fw-semibold mb-0">Email Notification</p>
                      <p className="text-muted small mb-0">
                        You receive an email with the approval or rejection
                        decision.
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="ms-2 ps-3" style={{ borderLeft: "2px dashed #dee2e6", marginLeft: "15px" }}>
                    &nbsp;
                  </div>

                  {/* Step 3 */}
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}
                    >
                      3
                    </div>
                    <div>
                      <p className="fw-semibold mb-0">Order Processing</p>
                      <p className="text-muted small mb-0">
                        If approved, your order is automatically processed and
                        fulfillment begins.
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="ms-2 ps-3" style={{ borderLeft: "2px dashed #dee2e6", marginLeft: "15px" }}>
                    &nbsp;
                  </div>

                  {/* Step 4 */}
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}
                    >
                      4
                    </div>
                    <div>
                      <p className="fw-semibold mb-0">Payment on Terms</p>
                      <p className="text-muted small mb-0">
                        Payment is due as per your{" "}
                        <strong>{formattedPaymentTerm}</strong> agreement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ────────────────────────────────────────── */}
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <Link
                  href={`/${countryCode}/b2b-quotes/`}
                  className="btn btn-success btn-lg px-5"
                >
                  <i className="icofont-list me-2"></i>
                  View My Quotes
                </Link>
                <Link
                  href={`/${countryCode}/listing`}
                  className="btn btn-outline-success btn-lg px-5"
                >
                  <i className="icofont-shopping-cart me-2"></i>
                  Continue Shopping
                </Link>
              </div>

              {/* Support Note */}
              <p className="text-center text-muted small mt-4">
                Questions about your quote?{" "}
                <Link
                  href={`/${countryCode}/contact`}
                  className="text-success text-decoration-none fw-semibold"
                >
                  Contact our B2B team
                </Link>
              </p>

            </div>
          </div>
        </div>
      </section>
    </>
  )
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata() {
  return {
    title: "Quote Submitted | Organic Canada B2B",
    description:
      "Your B2B quote has been submitted successfully and is pending approval.",
    robots: {
      index: false,
      follow: false,
    },
  }
}