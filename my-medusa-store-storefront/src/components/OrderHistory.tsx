import Link from "next/link";
import { convertToLocale } from "@lib/util/money"; // 🟢 IMPORT ADDED

export default function OrderHistory({ orders }: { orders: any[] }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-3 shadow-sm p-5 text-center border border-light">
        <div className="mb-3">
          <i className="icofont-box fs-1 text-muted opacity-50"></i>
        </div>
        <h5 className="fw-bold">No orders yet!</h5>
        <p className="text-muted">When you place an order, your receipt will appear here.</p>
        <Link href="/us/listing" className="btn btn-success px-4 fw-bold mt-2">
          START SHOPPING
        </Link>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <h4 className="fw-bold mb-0">Order History</h4>
      
      {orders.map((order) => {
        // 🧮 BULLETPROOF MATH CALCULATION
        const calculatedSubtotal = order.items.reduce((sum: number, item: any) => {
          return sum + (Number(item.unit_price || 0) * Number(item.quantity || 1));
        }, 0);

        const calculatedDiscount = Number(order.discount_total || order.summary?.discount_total || 0);
        const taxes = Number(order.tax_total || 0);
        const actualTotal = Number(order.total || order.summary?.current_order_total || 0);
        
        const calculatedShipping = Number(order.shipping_total || order.shipping_subtotal) || 
                                   Math.max(0, actualTotal - calculatedSubtotal + calculatedDiscount - taxes);

        // 🟢 THE FIX: Grab the order's currency code
        const currencyCode = order.currency_code || "eur";

        return (
          <div key={order.id} className="bg-white rounded-3 shadow-sm border overflow-hidden">
            
            {/* 🧾 RECEIPT HEADER */}
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

            {/* 🍔 ITEMS BOUGHT */}
            <div className="p-3 p-md-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="d-flex align-items-center mb-3 pb-3 border-bottom">
                  <img 
                    src={item.thumbnail} 
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
              ))}

              {/* 🧮 MATH BREAKDOWN / RECEIPT SUMMARY */}
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
            </div>

          </div>
        );
      })}
    </div>
  );
}