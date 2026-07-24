"use client";

import { useState } from "react";
import { addToCart } from "@lib/data/cart";
import { useParams, useRouter } from "next/navigation";

export default function AddToCartAction({ variantId, isPersonalizable, inStock = true }: { variantId: string, isPersonalizable?: boolean, inStock?: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [personalizationText, setPersonalizationText] = useState("");
  
  const params = useParams();
  const router = useRouter();
  const countryCode = params.countryCode as string;

  const handleAddToCart = async () => {
    if (!variantId) return;
    
    setIsAdding(true);
    try {
      const payload: {
        variantId: string
        quantity: number
        countryCode: string
        metadata?: Record<string, unknown>
      } = {
        variantId,
        quantity,
        countryCode,
      }

      if (personalizationText) {
        payload.metadata = { personalization: personalizationText }
      }

      await addToCart(payload);
      
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
    <div className="d-flex flex-column gap-3 mb-4">
      {isPersonalizable && (
        <div className="form-group">
          <label className="fw-bold mb-2">Custom Engraving / Personalization</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Enter your message..." 
            value={personalizationText}
            onChange={(e) => setPersonalizationText(e.target.value)}
          />
        </div>
      )}
      <div className="d-flex gap-3">
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
          className={`btn flex-grow-1 fw-bold py-2 ${!inStock ? 'btn-secondary' : 'btn-success'}`}
          onClick={handleAddToCart}
          disabled={isAdding || !inStock}
        >
          {isAdding ? "ADDING..." : !inStock ? "OUT OF STOCK" : "+ ADD TO CART"}
        </button>
      </div>
    </div>
  );
}