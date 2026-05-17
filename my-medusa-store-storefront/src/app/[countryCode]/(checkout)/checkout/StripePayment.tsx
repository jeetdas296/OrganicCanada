"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { unlockStripe, finalizeMedusaOrder, clearStaleCartCookie } from "./actions";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

// 🟢 1. We must add `{ cart }` right here so the form knows it exists!
const CheckoutForm = ({ cart }: { cart: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    console.log("🚦 1. Button Clicked! Starting checkout...");

    // 👇 WE DELETED THE FAKE ADDRESS CHECK FROM HERE! 👇

    setIsProcessing(true);
    setErrorMessage("");

    console.log("⏳ 2. Contacting Stripe...");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required", 
    });

    console.log("💬 3. Stripe Responded!", { error, paymentIntent });

    if (error) {
      setErrorMessage(error.message || "Payment declined.");
      setIsProcessing(false);
    } 
    else if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture")) {
      console.log("✅ 4. Payment Authorized! Telling Medusa to finalize the order...");
      
      try {
        const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
        const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

        const completeRes = await fetch(`${backendUrl}/store/carts/${cart.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": pubKey
          }
        });

        const completeData = await completeRes.json();

        if (completeRes.ok && completeData.type === "order") {
          console.log("🎉 5. Medusa Order Created Successfully:", completeData.order.id);

// 🟢 THE FIX: Ask the server to securely delete the cart cookie!
await clearStaleCartCookie();
          
          const successUrl = window.location.pathname.replace("/checkout", "/order/status") + "?redirect_status=succeeded";
          window.location.href = successUrl;
        } else {
          console.error("Medusa Order Creation Failed:", completeData);
          setErrorMessage("Payment succeeded, but Medusa could not generate the order. Please contact support.");
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Critical Backend Error:", err);
        setErrorMessage("Connection lost while finalizing your order. Do not refresh.");
        setIsProcessing(false);
      }
      
    } else {
      console.log("⚠️ 5. Unhandled Stripe Status:", paymentIntent?.status);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-100">
      <PaymentElement className="mb-4" onReady={() => console.log("Stripe UI Loaded Successfully")} />
      
      {errorMessage && (
        <div className="alert alert-danger small py-2 mb-3 shadow-sm border-danger">
          <i className="icofont-warning me-2"></i>{errorMessage}
        </div>
      )}

      <button disabled={isProcessing || !stripe || !elements} className="btn btn-success w-100 py-3 fw-bold shadow">
        {isProcessing ? "PROCESSING ORDER..." : "PAY & PLACE ORDER"}
      </button>
    </form>
  );
};

// 🟢 2. We must add `{ cart }` here too, so the parent component can accept it from CheckoutPage!
export default function StripePayment({ clientSecret, cart }: { clientSecret: string, cart: any }) {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const router = useRouter(); 

  if (!clientSecret) {
    return (
      <div className="alert alert-warning mb-0 text-center py-4 border-warning border-opacity-50 shadow-sm">
        <i className="icofont-lock fs-1 d-block mb-2 text-warning"></i>
        <h6 className="fw-bold">Payment Gateway Locked</h6>
        <p className="small mb-4 text-muted">Medusa requires a valid shipping address to calculate final taxes before unlocking Stripe.</p>
        <button 
          onClick={async () => {
            setIsUnlocking(true);
            const response = await unlockStripe();
            
            if (!response.success) {
              alert("Medusa Error: " + response.error);
              setIsUnlocking(false);
            } else {
              router.refresh(); 
            }
          }} 
          className="btn btn-warning fw-bold px-4 shadow-sm"
          disabled={isUnlocking}
        >
          {isUnlocking ? "UNLOCKING SECURE CHECKOUT..." : "AUTO-FILL ADDRESS & UNLOCK STRIPE"}
        </button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      {/* 🟢 3. Finally, we pass the cart down into the CheckoutForm! */}
      <CheckoutForm cart={cart} />
    </Elements>
  );
}