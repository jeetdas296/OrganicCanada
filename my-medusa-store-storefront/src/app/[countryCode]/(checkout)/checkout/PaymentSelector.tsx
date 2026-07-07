"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import StripePayment from "./StripePayment";
import PayPalPayment from "./PayPalPayment"; 
import { setPaymentSessionAction, processCODCheckout, clearStaleCartCookie } from "./actions";

interface PaymentSelectorProps {
  cart: any;
  clientSecret: string;
  isPureDigital: boolean;
  isB2BQuote: boolean;
  customer?: any;
}

export default function PaymentSelector({ 
  cart, 
  clientSecret, 
  isPureDigital,
  isB2BQuote,
  customer
}: PaymentSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<"stripe" | "paypal" | "manual">("stripe");
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const countryCode = params.countryCode as string;

  const handleMethodSelect = async (method: "stripe" | "paypal" | "manual") => {
    setSelectedMethod(method);
    setIsProcessing(true);
    
    // Medusa v2 native system identifier matching backend
    let providerId = "stripe";
    if (method === "paypal") providerId = "paypal";
    if (method === "manual") providerId = "pp_system_default"; 

    try {
      // 1. Create the payment session natively on the collection
      await setPaymentSessionAction(cart.id, providerId);
      
      // 2. Refresh Next.js server-side cache so metadata aligns
      router.refresh(); 
    } catch (err) {
      console.error("Error setting payment session:", err);
    }
    setIsProcessing(false);
  };

  const handleCODCheckout = async () => {
    setIsProcessing(true);
    try {
      // Use our server action to bypass client network issues
      const data = await processCODCheckout(cart.id);
      
      if (data.type === "order") {
        await clearStaleCartCookie().catch(() => null);
        router.push(`/${countryCode}/order/status?redirect_status=succeeded&order_id=${data.order.id}`);
      } else if (data.type === "b2b_quote") {
        await clearStaleCartCookie().catch(() => null);
        router.push(`/${countryCode}/checkout/b2b-success`);
      } else {
        console.error("Checkout failed:", data);
      }
    } catch (err: any) {
      console.error("COD Checkout failed:", err);
    }
    setIsProcessing(false);
  };

  return (
    <div>
      {/* Hide payment selector buttons if this cart strictly requires a B2B Draft Quote approval */}
      {!isB2BQuote && (
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
      )}

      {}
      <div className="mt-4">
        {selectedMethod === "stripe" && (
          <StripePayment 
            clientSecret={clientSecret} 
            cart={cart} 
            customer={customer} 
          />
        )}

        {selectedMethod === "paypal" && !isB2BQuote && (
          <PayPalPayment cart={cart} /> 
        )}

        {selectedMethod === "manual" && !isPureDigital && !isB2BQuote && (
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