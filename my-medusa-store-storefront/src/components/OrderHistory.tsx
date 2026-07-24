import Link from "next/link";
import { convertToLocale } from "@lib/util/money";
import DigitalDownloadsWidget from "@modules/order/components/digital-downloads";
import LocalizedClientLink from "@modules/common/components/localized-client-link";

export default function OrderHistory({
  orders,
  currentPage = 1,
  totalPages = 1
}: {
  orders: any[];
  currentPage?: number;
  totalPages?: number;
}) {
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-3 shadow-sm p-5 text-center border border-light">
        <div className="mb-3">
          <i className="icofont-box fs-1 text-muted opacity-50"></i>
        </div>
        <h5 className="fw-bold">No orders yet!</h5>
        <p className="text-muted">When you place an order, your receipt will appear here.</p>
        <LocalizedClientLink href="/listing" className="btn btn-success px-4 fw-bold mt-2">
          START SHOPPING
        </LocalizedClientLink>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">

      {/* RENDER THE ORDERS */}
      {orders.map((order) => {
        const calculatedSubtotal = order.items.reduce((sum: number, item: any) => {
          return sum + (Number(item.unit_price || 0) * Number(item.quantity || 1));
        }, 0);

        const calculatedDiscount = Number(order.discount_total || order.summary?.discount_total || 0);
        const taxes = Number(order.tax_total || 0);
        const actualTotal = Number(order.total || order.summary?.current_order_total || 0);

        const calculatedShipping = Number(order.shipping_total || order.shipping_subtotal) ||
          Math.max(0, actualTotal - calculatedSubtotal + calculatedDiscount - taxes);

        const currencyCode = order.currency_code || "eur";

        return (
          <div key={order.id} className="bg-white rounded-3 shadow-sm border overflow-hidden">
            <div className="bg-light p-3 p-md-4 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h6 className="fw-bold mb-1">Order #{order.display_id}</h6>
                <small className="text-muted">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </small>
              </div>
              <div className="text-md-end">
                <h6 className="fw-bold text-success mb-1">
                  {convertToLocale({ amount: actualTotal, currency_code: currencyCode })}
                </h6>
                <span className="badge bg-secondary text-uppercase fw-normal" style={{ letterSpacing: "0.5px" }}>
                  {order.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="p-3 p-md-4">
              {order.items.map((item: any) => {
                const isDigital = item.variant?.product?.type?.value === "Digital Product" ||
                  item.product?.type?.value === "Digital Product" ||
                  item.metadata?.is_digital;

                return (
                  <div key={item.id} className="d-flex align-items-center mb-3 pb-3 border-bottom">
                    <img
                      src={item.thumbnail || '/img/1.png'}
                      alt={item.title}
                      style={{ width: "65px", height: "65px", objectFit: "cover" }}
                      className="rounded border"
                    />
                    <div className="ms-3 flex-grow-1">
                      <h6 className="fw-bold mb-0">{item.title}</h6>
                      <small className="text-muted">Qty: {item.quantity}</small>
                    </div>
                    <div className="fw-bold text-dark">
                      {convertToLocale({
                        amount: Number(item.unit_price || 0) * Number(item.quantity || 1),
                        currency_code: currencyCode
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="d-flex justify-content-end mt-4">
                <div style={{ width: "100%", maxWidth: "300px" }}>
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">Subtotal</span>
                    <span className="fw-medium">{convertToLocale({ amount: calculatedSubtotal, currency_code: currencyCode })}</span>
                  </div>
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">Shipping</span>
                    <span className="fw-medium">{convertToLocale({ amount: calculatedShipping, currency_code: currencyCode })}</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Discount</span>
                      <span className="fw-bold text-success">
                        -{convertToLocale({ amount: calculatedDiscount, currency_code: currencyCode })}
                      </span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">Taxes</span>
                    <span className="fw-medium">{convertToLocale({ amount: taxes, currency_code: currencyCode })}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between fw-bold h6 mb-0 pt-1">
                    <span>Total</span>
                    <span className="text-success">{convertToLocale({ amount: actualTotal, currency_code: currencyCode })}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <DigitalDownloadsWidget orderId={order.id} />
              </div>
            </div>
          </div>
        );
      })}

      {/* 🟢 PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <nav aria-label="Order history page navigation" className="mt-4">
          <ul className="pagination justify-content-center">

            {/* Previous Button */}
            <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
              <Link
                className="page-link text-success fw-bold"
                href={`?page=${currentPage - 1}`}
                aria-disabled={currentPage <= 1}
              >
                Previous
              </Link>
            </li>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <li
                key={pageNumber}
                className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
              >
                <Link
                  className={`page-link ${currentPage === pageNumber ? 'bg-success border-success text-white' : 'text-dark'}`}
                  href={`?page=${pageNumber}`}
                >
                  {pageNumber}
                </Link>
              </li>
            ))}

            {/* Next Button */}
            <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
              <Link
                className="page-link text-success fw-bold"
                href={`?page=${currentPage + 1}`}
                aria-disabled={currentPage >= totalPages}
              >
                Next
              </Link>
            </li>

          </ul>
        </nav>
      )}

    </div>
  );
}