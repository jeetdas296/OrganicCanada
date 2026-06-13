import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer"; 
import CheckoutAddressForm from "./CheckoutAddressForm";
import Link from "next/link";
import { redirect } from "next/navigation";
import PaymentSelector from "./PaymentSelector";
import { convertToLocale } from "@lib/util/money";

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

  // 🟢 THE FIX: Define isPureDigitalCart at the top level so the JSX can see it!
  const isPureDigitalCart = !cart.items?.some((item: any) => 
    item.variant?.manage_inventory === true && 
    item.product?.type?.value !== "Digital Product"
  );

  // 🚚 THE SMART SHIPPING AUTO-SELECTOR (UNIFIED PROFILE METHOD)
  console.log("🛠️ DEBUG: Fetching shipping options for cart:", cart.id);
  
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": pubKey };
  
  const optionsRes = await fetch(`http://localhost:9000/store/shipping-options?cart_id=${cart.id}`, { 
    headers, cache: "no-store" 
  });
  
  const optionsData = await optionsRes.json();
  const options = optionsData.shipping_options || [];
  const isReadyForPayment = !!cart.shipping_methods?.length;

  if (options.length > 0) {
    let correctOptionId = options[0].id;

    if (!isPureDigitalCart) {
      // Physical Cart: Look for Pickup first, otherwise Paid Shipping
      const pickupOption = options.find((opt: any) => opt.name?.toLowerCase().includes("pickup"));
      const physicalOption = options.find((opt: any) => opt.amount >= 0 && !opt.name?.toLowerCase().includes("digital"));
      
      if (pickupOption) correctOptionId = pickupOption.id;
      else if (physicalOption) correctOptionId = physicalOption.id;
      
    } else {
      // Pure Digital Cart: Force the Free Shipping option
      const digitalOption = options.find((opt: any) => opt.amount === 0 || opt.name?.toLowerCase().includes("digital"));
      if (digitalOption) correctOptionId = digitalOption.id;
      console.log("📱 Purely digital cart detected. Forcing Free Digital option.");
    }

    // 2. CHECK IF CART IS STUCK ON THE WRONG METHOD
    const currentMethodId = cart.shipping_methods?.[0]?.shipping_option_id;

    if (currentMethodId !== correctOptionId) {
      console.log("🔄 Cart has wrong or missing shipping method. Overwriting to:", correctOptionId);
      
      // Forcefully overwrite the shipping method
      await fetch(`http://localhost:9000/store/carts/${cart.id}/shipping-methods`, {
        method: "POST", headers, body: JSON.stringify({ option_id: correctOptionId }), cache: "no-store"
      });
      
      // Refresh the cart data so the new $0 total reflects immediately
      cart = await retrieveCart();
    } else {
      console.log("✅ Cart already has the correct shipping method attached.");
    }
  }

  let clientSecret = "";
  
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
              <CheckoutAddressForm savedAddresses={savedAddresses} customer={customer} cart={cart} />

              {/* 3. Payment Method Box */}
              {isReadyForPayment ? (
                <div className="bg-white rounded-3 shadow-sm p-4 border">
                  <h5 className="fw-bold mb-4">Payment Details</h5>
                  <PaymentSelector 
                    cart={cart} 
                    clientSecret={clientSecret} 
                    isPureDigital={isPureDigitalCart} 
                  />
                </div>
              ) : (
                <div className="bg-white rounded-3 shadow-sm p-4 border text-center">
                  <h5 className="text-muted">
                    <i className="icofont-lock"></i> Please save your delivery address to see payment options
                  </h5>
                </div>
              )}

            </div>
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
                        {/* 🟢 THE FIX: Using Medusa's built-in converter */}
                        {convertToLocale({ amount: item.total, currency_code: cart.currency_code })}
                      </div>
                    </div>
                  ))}
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="fw-bold">
                    {convertToLocale({ amount: trueProductSubtotal, currency_code: cart.currency_code })}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Shipping</span>
                  <span className="fw-bold">
                    {convertToLocale({ amount: cart.shipping_total || 0, currency_code: cart.currency_code })}
                  </span>
                </div>
                
                {cart.discount_total > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Discount</span>
                    <span className="fw-bold text-success">
                      -{convertToLocale({ amount: cart.discount_total, currency_code: cart.currency_code })}
                    </span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Taxes</span>
                  <span className="fw-bold">
                    {convertToLocale({ amount: cart.tax_total || 0, currency_code: cart.currency_code })}
                  </span>
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-4">
                  <h4 className="m-0 fw-bold">Total</h4>
                  <h4 className="m-0 fw-bold text-success">
                    {convertToLocale({ amount: cart.total || 0, currency_code: cart.currency_code })}
                  </h4>
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