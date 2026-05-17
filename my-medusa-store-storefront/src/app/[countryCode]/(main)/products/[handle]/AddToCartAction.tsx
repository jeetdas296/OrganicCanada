"use client";

import { useState } from "react";
import { addToCart } from "@lib/data/cart";
import { useParams, useRouter } from "next/navigation";

export default function AddToCartAction({ variantId }: { variantId: string }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  
  const params = useParams();
  const router = useRouter();
  const countryCode = params.countryCode as string;

  const handleAddToCart = async () => {
    if (!variantId) return;
    
    setIsAdding(true);
    try {
      await addToCart({
        variantId,
        quantity,
        countryCode,
      });
      
      // Send them straight to the cart once added!
      router.push(`/${countryCode}/cart`);
    } catch (error) {
      console.error(error);
      alert("Uh oh! Failed to add item to cart.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="d-flex gap-3 mb-4">
      <div className="input-group" style={{ width: "130px" }}>
        <button 
          className="btn btn-outline-secondary" 
          type="button" 
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
        >
          -
        </button>
        <input 
          type="text" 
          className="form-control text-center fw-bold px-0" 
          readOnly 
          value={quantity} 
        />
        <button 
          className="btn btn-outline-secondary" 
          type="button" 
          onClick={() => setQuantity(quantity + 1)}
        >
          +
        </button>
      </div>
      
      <button 
        className="btn btn-success flex-grow-1 fw-bold py-2"
        onClick={handleAddToCart}
        disabled={isAdding}
      >
        {isAdding ? "ADDING..." : "+ ADD TO CART"}
      </button>
    </div>
  );
}