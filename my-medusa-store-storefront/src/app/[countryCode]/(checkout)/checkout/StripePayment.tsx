"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { unlockStripe, clearStaleCartCookie, submitB2BQuote, sniperCompleteOrder } from "./actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

const isB2B = (customer: any) =>
  customer?.metadata?.b2b_status === "approved";

const isQuoteRequired = (cart: any) => {
  const cartMetadata = cart?.metadata || {};
  const is_b2b = cartMetadata.is_b2b === true || cartMetadata.is_b2b === "true";
  const payment_term = typeof cartMetadata.payment_term === "string" ? cartMetadata.payment_term : "";
  const approvalRequiredTerms = ["net_15", "net_30", "net_60", "net_90", "upon_approval"];
  return is_b2b && approvalRequiredTerms.includes(payment_term.toLowerCase());
};

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
    } else if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture")) {
      console.log("✅ 4. Payment Authorized! Executing Server-Side Sniper & Completion...");

      try {
        const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
        
        // Smart detect mixed/digital cart items for sniper mode
        const hasDigitalItems = cart.items?.some((item: any) => 
          item.variant?.manage_inventory === false || 
          item.product?.type?.value === "Digital Product"
        );

        // Run the checkout completion securely via our server action
        const result = await sniperCompleteOrder(cart.id, pubKey, hasDigitalItems);

        if (result.success) {
          await clearStaleCartCookie().catch(() => null);

          if (result.type === "b2b_quote") {
            console.log("📋 5. B2B Quote Submitted Successfully!");
            const countryCode = window.location.pathname.split("/")[1] || "us";
            window.location.href = `/${countryCode}/checkout/b2b-success`;
          } else if (result.type === "order") {
            console.log("🎉 5. Medusa Order Created Successfully:", result.orderId);
            const successUrl = window.location.pathname.replace("/checkout", "/order/status") + `?redirect_status=succeeded&order_id=${result.orderId}`;
            window.location.href = successUrl;
          }
        } else {
          console.error("🚨 Server Side Order Completion Failed:", result.error);
          setErrorMessage(result.error || "Failed to finalize order on server.");
          setIsProcessing(false);
        }
      } catch (err: any) {
        console.error("Critical Backend Error:", err);
        setErrorMessage(err.message || "Connection lost while finalizing your order. Do not refresh.");
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

const B2BQuoteBlock = ({ cart }: { cart: any }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRequestQuote = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await submitB2BQuote(cart.id);

      if (!response.success) {
        throw new Error(response.error || "Failed to submit your quote request.");
      }

      await clearStaleCartCookie().catch(() => null);

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
          Your order will be submitted as a <strong>Draft Order Quote</strong>{" "}
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
          "REQUEST B2B QUOTE"
        )}
      </button>

      <p className="text-center text-muted small mt-3 mb-0">
        <i className="icofont-lock"></i> Our team will review your order and
        send your invoice details shortly.
      </p>
    </div>
  );
};

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

  // B2B branch: short-circuit Stripe entirely if customer or cart explicitly requires a quote
  if (isB2B(customer) || isQuoteRequired(cart)) {
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
              window.location.reload();
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
      <CheckoutForm cart={cart} />
    </Elements>
  );
}