"use client";

import Link from "next/link";

export default function B2BSuccessPage(props: {
  params: Promise<{ countryCode: string }>;
}) {
  return (
    <section className="py-5 bg-light osahan-main-body">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-7 col-md-9">
            <div className="bg-white rounded-3 shadow-sm p-5 border text-center">
              <div className="d-flex justify-content-center mb-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10"
                  style={{ width: "96px", height: "96px" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="56"
                    height="56"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="text-success"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="fw-bold mb-3">Quote Requested Successfully!</h2>
              <p className="text-muted mb-4">
                Our team will review your order and send your Net-30 invoice
                shortly. You will receive a confirmation email with the draft
                order details.
              </p>

              <div className="alert alert-success border-success border-opacity-50 text-start small mb-4">
                <i className="icofont-info-circle me-2"></i>
                <strong>What happens next?</strong> A wholesale account
                manager will review your request, confirm product availability,
                and email your Net-30 invoice for approval before fulfillment.
              </div>

              <Link
                href="/"
                className="btn btn-success fw-bold px-5 py-3 shadow-sm"
              >
                <i className="icofont-arrow-left me-2"></i>
                Return to Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
