"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { unlockStripe, clearStaleCartCookie, submitB2BQuote, sniperCompleteOrder } from "./actions";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

const isB2B = (customer: any) =>
  customer?.metadata?.b2b_status === "approved";

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
      console.log("✅ 4. Payment Authorized! Executing Server-Side Sniper & Completion...");

      try {
        const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
        const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

        // 🟢 Standard, clean order completion!
        const completeRes = await fetch(`${backendUrl}/store/carts/${cart.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": pubKey
          }
        });

        const responseText = await completeRes.text();
        let completeData: any = {};
        try { completeData = JSON.parse(responseText); } catch (e) {}

        let finalOrderId = null;

        if (completeRes.ok && completeData?.type === "order") {
          finalOrderId = completeData.order.id;
        } else if (completeRes.ok) {
          // Catch Stripe Webhook race condition
          const orderLookup = await fetch(`${backendUrl}/store/orders?cart_id=${cart.id}`, {
             headers: { "x-publishable-api-key": pubKey }
          }).then(res => res.json());
          if (orderLookup.orders && orderLookup.orders.length > 0) finalOrderId = orderLookup.orders[0].id;
        }

        if (finalOrderId) {
          console.log("🎉 5. Medusa Order Created Successfully:", finalOrderId);
          await clearStaleCartCookie();
          const successUrl = window.location.pathname.replace("/checkout", "/order/status") + `?redirect_status=succeeded&order_id=${finalOrderId}`;
          window.location.href = successUrl;
        } else {
          console.error("🚨 Order Creation Failed:", responseText);
          setErrorMessage("Payment succeeded, but we are finalizing your order. Please check your email for the receipt.");
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

// 🟢 B2B Wholesale block: replaces Stripe form entirely for approved buyers.
const B2BQuoteBlock = ({ cart }: { cart: any }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRequestQuote = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 🟢 We now use the Server Action to completely bypass browser CORS blocks!
      const response = await submitB2BQuote(cart.id);

      if (!response.success) {
        throw new Error(response.error || "Failed to submit your Net-30 quote request.");
      }

      // Clear the cart cookie just like a normal order does.
      await clearStaleCartCookie().catch(() => null);

      // Redirect to the dedicated B2B success page.
      const countryCode = window.location.pathname.split("/")[1] || "us";
      window.location.href = `/${countryCode}/checkout/b2b-success`;
      
    } catch (err: any) {
      console.error("B2B quote submission error:", err);
      setErrorMessage(
        err?.message || "Something went wrong submitting your quote. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-100">
      <div className="alert alert-success border-success border-opacity-50 shadow-sm py-4 mb-4 text-center">
        <i className="icofont-building-alt fs-1 d-block mb-2 text-success"></i>
        <h5 className="fw-bold mb-2">Wholesale Account Active</h5>
        <p className="mb-0 text-muted small">
          Your order will be submitted as a <strong>Net-30 Draft Order</strong>{" "}
          for review. No payment is required at this time.
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-danger small py-2 mb-3 shadow-sm border-danger">
          <i className="icofont-warning me-2"></i>
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleRequestQuote}
        disabled={isSubmitting}
        className="btn btn-success w-100 py-3 fw-bold shadow d-flex align-items-center justify-content-center gap-2"
        data-testid="b2b-request-quote-button"
      >
        {isSubmitting ? (
          <>
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
            SUBMITTING QUOTE REQUEST...
          </>
        ) : (
          "REQUEST NET-30 QUOTE"
        )}
      </button>

      <p className="text-center text-muted small mt-3 mb-0">
        <i className="icofont-lock"></i> Our team will review your order and
        send your Net-30 invoice shortly.
      </p>
    </div>
  );
};

// 🟢 2. We must add `{ cart }` here too, so the parent component can accept it from CheckoutPage!
export default function StripePayment({
  clientSecret,
  cart,
  customer,
}: {
  clientSecret: string;
  cart: any;
  customer: any;
}) {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const router = useRouter();

  // 🟢 B2B branch: short-circuit Stripe entirely for approved wholesale buyers.
  if (isB2B(customer)) {
    return <B2BQuoteBlock cart={cart} />;
  }

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
