"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
// 1. We changed the import to the correct name: submitPromotionForm
import { updateLineItem, deleteLineItem, submitPromotionForm } from "@lib/data/cart";

export default function CartActions({ cart }: { cart: any }) {
  const [promoCode, setPromoCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  // 1. Function to Apply Promo Code
  const handleApplyPromo = async () => {
    if (!promoCode) return;
    setIsUpdating(true);
    try {
      // Medusa's helper expects the data to be in a "FormData" format
      const formData = new FormData();
      formData.append("code", promoCode);
      
      // Call the correct helper we just imported
      await submitPromotionForm(null, formData);
      
      setPromoCode("");
      router.refresh(); // Refresh the page to show the new total!
    } catch (e) {
      console.error(e);
      alert("Failed to apply promo code. Make sure it is active!");
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. Function to Update Quantity
  const handleUpdateQty = async (lineId: string, newQty: number) => {
    if (newQty < 1) return;
    setIsUpdating(true);
    // Standard Medusa starter uses lineId instead of lineItemId
    await updateLineItem({ lineId, quantity: newQty });
    router.refresh();
    setIsUpdating(false);
  };

  const handleRemoveItem = async (lineId: string) => {
    setIsUpdating(true);
    try {
      // Tell Medusa to delete the line item
      await deleteLineItem(lineId);
      
      // Force Next.js to refresh the server data and update the screen
      router.refresh(); 
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to remove item. Please check the console.");
    } finally {
      setIsUpdating(false); // Turn the buttons back on!
    }
  };

  // 🧮 Calculate the TRUE subtotal based ONLY on the items in the cart
  const trueProductSubtotal = cart.items.reduce((sum: number, item: any) => {
    return sum + (item.unit_price * item.quantity);
  }, 0);

  return (
    <div className="row">
      {/* List of Items */}
      <div className="col-lg-8">
        <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
          {cart.items.map((item: any) => (
            <div key={item.id} className="d-flex align-items-center border-bottom py-3 justify-content-between">
              <div className="d-flex align-items-center">
                <img src={item.thumbnail} alt="" style={{ width: "60px", height: "60px", objectFit: "cover" }} className="rounded border" />
                <div className="ms-3">
                  <h6 className="fw-bold mb-0">{item.title}</h6>
                  <small className="text-muted">${(item.unit_price).toFixed(2)}</small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="input-group input-group-sm" style={{ width: "100px" }}>
                  <button className="btn btn-outline-secondary" onClick={() => handleUpdateQty(item.id, item.quantity - 1)} disabled={isUpdating}>-</button>
                  <input type="text" className="form-control text-center px-0" value={item.quantity} readOnly />
                  <button className="btn btn-outline-secondary" onClick={() => handleUpdateQty(item.id, item.quantity + 1)} disabled={isUpdating}>+</button>
                </div>
                <button className="btn btn-link text-danger p-0" onClick={() => handleRemoveItem(item.id)} disabled={isUpdating}>
                  <i className="icofont-trash fs-5"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo & Summary Side */}
      <div className="col-lg-4">
        <div className="bg-white rounded-3 shadow-sm p-4 mb-3 border border-success border-opacity-50">
          <h6 className="fw-bold mb-3">Promo Code</h6>
          <div className="input-group">
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. GET20" 
              value={promoCode} 
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())} // Auto-uppercase
              disabled={isUpdating}
            />
            <button 
              className="btn btn-success fw-bold px-4" 
              onClick={handleApplyPromo}
              disabled={isUpdating || !promoCode}
            >
              APPLY
            </button>
          </div>
          
          {/* Show the applied promotion if it exists */}
          {cart.promotions && cart.promotions.length > 0 && (
            <div className="alert alert-success mt-3 mb-0 py-2 small fw-bold">
              ✓ Promo '{cart.promotions[0].code}' Applied!
            </div>
          )}
        </div>

        <div className="bg-white rounded-3 shadow-sm p-4">
          <h6 className="fw-bold mb-3">Order Summary</h6>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Subtotal</span>
            <span className="fw-bold">${(trueProductSubtotal).toFixed(2)}</span>
          </div>

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Shipping</span>
            <span className="fw-bold">${(cart.shipping_total || 0).toFixed(2)}</span>
          </div>
          
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Discount</span>
            <span className="fw-bold text-success">-${(cart.discount_total).toFixed(2)}</span>
          </div>

          <div className="d-flex justify-content-between mb-3">
            <span className="text-muted">Taxes</span>
            <span className="fw-bold">${(cart.tax_total).toFixed(2)}</span>
          </div>
          
          <hr />
          
          <div className="d-flex justify-content-between fw-bold h5 mb-4">
            <span className="m-0">Total</span>
            <span className="m-0 text-success">${(cart.total).toFixed(2)}</span>
          </div>
          
          {/* Replace your old button with this Next.js Link! */}
          <Link href={`/dk/checkout`} className="btn btn-success w-100 py-3 fw-bold d-block text-center text-white text-decoration-none">
            PROCEED TO CHECKOUT <i className="icofont-arrow-right ms-2"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}