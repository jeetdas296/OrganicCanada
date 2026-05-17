"use client";

import { useState } from "react";
import { applyPromotions } from "@lib/data/cart"; 

interface PromoProps {
  title: string;
  description: string;
  code: string;
  expiry: string;
  type: "percentage" | "fixed" | "free_shipping";
}

export default function PromoCard({ promo }: { promo: PromoProps }) {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);

    try {
      // 🔌 Call your Medusa Starter server action
      const response = await applyPromotions([promo.code]);

      // If Medusa returns a string, it means the `medusaError` catcher found an issue
      // (e.g., "Promo code is invalid" or "Promo code expired")
      if (!response.success) {
      alert(response.error); // This pops up the native browser alert box
      setIsApplying(false);
      return; 
    }
    // If successful, show a success alert or redirect to cart
    alert("Promo applied successfully!");
    setIsApplying(false);
      // 🟢 SUCCESS! If it didn't return a string or throw an error, it worked!
      setIsApplied(true);

    } catch (error: any) {
      // 🛑 This catches the `throw new Error("No existing cart found")` from your cart.ts
      console.error("Failed to apply promo:", error);
      alert(error.message || "Failed to apply promo. Please ensure you have items in your cart.");
    } finally {
      setIsApplying(false);
    }
  };

  // Set icon based on the promo type
  const getIcon = () => {
    if (promo.type === "percentage") return "bi-percent";
    if (promo.type === "free_shipping") return "bi-truck";
    return "bi-currency-dollar";
  };

  return (
    <div className={`card shadow-sm border ${isApplied ? 'border-success' : 'border-0'} h-100 mb-3 transition-all`}>
      <div className="card-body d-flex flex-column align-items-center text-center p-4">
        
        <div 
          className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mb-3" 
          style={{ width: "60px", height: "60px", fontSize: "24px" }}
        >
          <i className={`bi ${getIcon()}`}></i>
        </div>
        
        <h5 className="fw-bold mb-1">{promo.title}</h5>
        <p className="text-muted small mb-3">{promo.description}</p>
        
        <div className={`border border-dashed rounded px-3 py-2 mb-3 w-100 ${isApplied ? 'bg-success bg-opacity-10' : 'bg-light'}`}>
          <h4 className="fw-bold text-success text-tracking-widest m-0" style={{ letterSpacing: "2px" }}>
            {promo.code}
          </h4>
        </div>

        <p className="text-danger small fw-bold mb-auto">
          <i className="bi bi-clock me-1"></i> Expires: {promo.expiry}
        </p>

        {/* 🚀 AUTO-APPLY BUTTON */}
        <button 
          onClick={handleApply} 
          disabled={isApplying || isApplied}
          className={`btn mt-3 w-100 fw-bold ${
            isApplied ? 'btn-success text-white' : 'btn-outline-success'
          }`}
        >
          {isApplying ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : isApplied ? (
            <><i className="bi bi-check2-circle me-1"></i> Applied to Cart!</>
          ) : (
            "Apply to Cart"
          )}
        </button>
      </div>
    </div>
  );
}