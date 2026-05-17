import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer"; 
import CheckoutAddressForm from "./CheckoutAddressForm";
import Link from "next/link";
import { redirect } from "next/navigation";
import StripePayment from "./StripePayment";

export const dynamic = "force-dynamic";

export default async function CheckoutPage(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  let cart = await retrieveCart();

  // 2. 👈 FETCH THE LOGGED-IN USER & THEIR ADDRESSES
  const customer = await retrieveCustomer().catch(() => null);
  const savedAddresses = customer?.addresses || [];

  if (!cart || cart.items?.length === 0) {
    redirect(`/${params.countryCode}/listing`);
  }

  // 🚚 THE INVISIBLE SHIPPING AUTO-SELECTOR
  if (!cart.shipping_methods || cart.shipping_methods.length === 0) {
    const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
    const headers = { "Content-Type": "application/json", "x-publishable-api-key": pubKey };
    
    const optionsRes = await fetch(`http://localhost:9000/store/shipping-options?cart_id=${cart.id}`, { headers });
    const optionsData = await optionsRes.json();
    
    if (optionsData.shipping_options && optionsData.shipping_options.length > 0) {
      await fetch(`http://localhost:9000/store/carts/${cart.id}/shipping-methods`, {
        method: "POST",
        headers,
        body: JSON.stringify({ option_id: optionsData.shipping_options[0].id })
      });
      cart = await retrieveCart();
    }
  }

  let clientSecret = "";
  const optionsRes = await fetch(`http://localhost:9000/store/shipping-options?cart_id=${cart.id}`);
  const optionsData = await optionsRes.json();
  const shippingOptions = optionsData.shipping_options || [];

  const currentMethodId = cart.shipping_methods?.[0]?.shipping_option_id || "";
  
  if (cart?.payment_collection?.payment_sessions) {
    const session = cart.payment_collection.payment_sessions.find(
      (s: any) => s.provider_id === "pp_stripe_stripe" || s.provider_id === "stripe"
    );
    clientSecret = session?.data?.client_secret || "";
  }

  const trueProductSubtotal = cart.items.reduce((sum: number, item: any) => {
    return sum + (item.unit_price * item.quantity);
  }, 0);

  return (
    <>
      <div className="bg-success py-4">
        <div className="container text-center text-white">
          <h2 className="fw-bold mb-0">Checkout</h2>
        </div>
      </div>

      <section className="py-5 bg-light osahan-main-body">
        <div className="container">
          <div className="row">
            
            {/* LEFT COLUMN */}
            <div className="col-lg-8 mb-4">
              
              {/* 1. Interactive Delivery Address Box */}
              {/* 🟢 THE FIX: Add the cart prop here! */}
<CheckoutAddressForm savedAddresses={savedAddresses} customer={customer} cart={cart} />

              {/* 3. Payment Method Box */}
              <div className="bg-white rounded-3 shadow-sm p-4 border opacity-75">
                <h5 className="fw-bold mb-4"><i className="icofont-credit-card text-success me-2"></i>Payment Details</h5>
                {/* 🟢 THE FIX: We must pass the cart variable down into the Stripe component! */}
<StripePayment clientSecret={clientSecret} cart={cart} />
              </div>

            </div>

            {/* RIGHT COLUMN: Order Summary */}
            <div className="col-lg-4">
              <div className="bg-white rounded-3 shadow-sm p-4 border sticky-top" style={{ top: "20px" }}>
                <h5 className="fw-bold mb-4">Order Summary</h5>
                
                <div className="mb-4" style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {cart.items?.map((item: any) => (
                    <div key={item.id} className="d-flex align-items-center mb-3">
                      <img src={item.thumbnail || '/img/1.png'} alt={item.title} className="rounded border" style={{ width: "50px", height: "50px", objectFit: "cover" }} />
                      <div className="ms-3 flex-grow-1">
                        <h6 className="fw-bold mb-0 text-truncate" style={{ maxWidth: "150px" }}>{item.title}</h6>
                        <small className="text-muted">Qty: {item.quantity}</small>
                      </div>
                      <div className="fw-bold text-end">
                        ${(item.total).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="fw-bold">${(trueProductSubtotal).toFixed(2)}</span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Shipping</span>
                  <span className="fw-bold">${(cart.shipping_total || 0).toFixed(2)}</span>
                </div>
                
                {cart.discount_total > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Discount</span>
                    <span className="fw-bold text-success">-${(cart.discount_total).toFixed(2)}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Taxes</span>
                  <span className="fw-bold">${(cart.tax_total || 0).toFixed(2)}</span>
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-4">
                  <h4 className="m-0 fw-bold">Total</h4>
                  <h4 className="m-0 fw-bold text-success">${(cart.total || 0).toFixed(2)}</h4>
                </div>
                <p className="text-center text-muted small mt-3 m-0">
                  <i className="icofont-lock"></i> Secure checkout powered by Eatsie
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}