"use client";
import { useRouter, useParams } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";
import { completeCartAction, clearStaleCartCookie } from "./actions"; // 🟢 Import the Server Action

export default function PayPalPayment({ cart }: { cart: any }) {
  
  const router = useRouter();
  const params = useParams();
  const countryCode = (params.countryCode as string) ;
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

const paypalAmount = ((cart?.total || 0) ).toFixed(2);
  const handleApprove = async (data: any, actions: any) => {
    setIsProcessing(true);
    try {
      await actions.order.capture();

      const resData = await completeCartAction(cart.id);

      if (resData.type === "order") {
        
      await clearStaleCartCookie().catch(() => null);
        // 🟢 THE FIX: Match your starter's exact URL structure
        router.push(`/${countryCode}/order/status?redirect_status=succeeded&order_id=${resData.order.id}`);
      } else {
        setErrorMessage("Payment successful, but order failed to finalize in Medusa.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An error occurred during final checkout.");
    }
    setIsProcessing(false);
  };

  return (
    <PayPalScriptProvider 
      options={{ 
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "", 
        currency: cart.region?.currency_code?.toUpperCase() || "USD",
      }}
    >
      <div className="w-100 p-4 border rounded bg-light">
        <h6 className="fw-bold text-center mb-4">Complete your payment securely</h6>
        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
        
        {isProcessing ? (
          <div className="text-center p-3">
             <div className="spinner-border text-success mb-2" role="status"></div>
             <p className="fw-bold">Finalizing your order...</p>
          </div>
        ) : (
          <PayPalButtons 
            style={{ layout: "vertical", shape: "rect" }}
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [{
                  amount: { value: paypalAmount },
                  description: `Order from ${cart.id}`,
                }],
              });
            }}
            onApprove={handleApprove}
            onError={() => setErrorMessage("PayPal encountered an error. Please try again.")}
          />
        )}
      </div>
    </PayPalScriptProvider>
  );
}