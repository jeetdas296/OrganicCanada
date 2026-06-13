"use client";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import StripePayment from "./StripePayment";
import PayPalPayment from "./PayPalPayment"; 
import { setPaymentSessionAction, completeCartAction , processCODCheckout, clearStaleCartCookie} from "./actions"; // 🟢 Import the Server Actions

export default function PaymentSelector({ 
  cart, 
  clientSecret, 
  isPureDigital 
}: { 
  cart: any; 
  clientSecret: string;
  isPureDigital: boolean; 
}) {
  const [selectedMethod, setSelectedMethod] = useState<"stripe" | "paypal" | "manual">("stripe");
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const countryCode = (params.countryCode as string) ;

  const handleMethodSelect = async (method: "stripe" | "paypal" | "manual") => {
    setSelectedMethod(method);
    setIsProcessing(true);
    
    // Medusa v2 native system identifier
    let providerId = "stripe";
    if (method === "paypal") providerId = "paypal";
    if (method === "manual") providerId = "pp_system_default"; 

    try {
      // 1. Create the session
      await setPaymentSessionAction(cart.id, providerId);
      
      // 2. IMPORTANT: Force the UI to re-fetch the cart from the server 
      // so it knows the new session ID exists
      router.refresh(); 
    } catch (err) {
      console.error("Error setting payment session:", err);
    }
    setIsProcessing(false);
  };

  const handleCODCheckout = async () => {
    setIsProcessing(true);
    try {
      const data = await processCODCheckout(cart.id);
      
      if (data.type === "order") {
      await clearStaleCartCookie().catch(() => null);
        // 🟢 THE FIX: Match your starter's exact URL structure
        router.push(`/${countryCode}/order/status?redirect_status=succeeded&order_id=${data.order.id}`);
      } else {
        console.error("Checkout failed:", data);
      }
    } catch (err: any) {
      alert("Checkout failed: " + err.message);
    }
    setIsProcessing(false);
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-4 border-bottom pb-3">
        <button 
          className={`btn ${selectedMethod === "stripe" ? "btn-success" : "btn-outline-secondary"}`}
          onClick={() => handleMethodSelect("stripe")}
          disabled={isProcessing}
        >
          <i className="icofont-credit-card me-2"></i> Stripe Payment
        </button>
        
        <button 
          className={`btn ${selectedMethod === "paypal" ? "btn-warning text-dark" : "btn-outline-secondary"}`}
          onClick={() => handleMethodSelect("paypal")}
          disabled={isProcessing}
        >
          <i className="icofont-paypal me-2"></i> PayPal
        </button>

        {!isPureDigital && (
          <button 
            className={`btn ${selectedMethod === "manual" ? "btn-dark" : "btn-outline-secondary"}`}
            onClick={() => handleMethodSelect("manual")}
            disabled={isProcessing}
          >
            <i className="icofont-money me-2"></i> Cash on Delivery
          </button>
        )}
      </div>

      <div className="mt-4">
        {selectedMethod === "stripe" && (
          <StripePayment clientSecret={clientSecret} cart={cart} />
        )}

        {selectedMethod === "paypal" && (
          <PayPalPayment cart={cart} /> 
        )}

        {selectedMethod === "manual" && !isPureDigital && (
          <div className="text-center p-4 border rounded bg-light">
            <h6 className="fw-bold">Pay with Cash on Delivery</h6>
            <p className="text-muted small">Have exact change ready when the delivery driver arrives.</p>
            <button className="btn btn-dark fw-bold w-100 py-3" onClick={handleCODCheckout} disabled={isProcessing}>
              {isProcessing ? "Processing Order..." : "Confirm & Place Order"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}