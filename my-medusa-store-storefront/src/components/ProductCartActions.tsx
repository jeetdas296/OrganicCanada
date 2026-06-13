"use client";

import { useState, useEffect } from "react";
import { addToCart } from "@lib/data/cart";
import { convertToLocale } from "@lib/util/money"; // 🟢 IMPORT ADDED

export default function ProductCardActions({ product, countryCode }: { product: any, countryCode: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 1. Check if item is already in wishlist when component loads
  useEffect(() => {
    const savedWishlist = JSON.parse(localStorage.getItem("eatsie_wishlist") || "[]");
    setIsWishlisted(savedWishlist.includes(product.id));
  }, [product.id]);

  // 2. Toggle Wishlist Logic
  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); 
    let savedWishlist = JSON.parse(localStorage.getItem("eatsie_wishlist") || "[]");
    
    if (isWishlisted) {
      savedWishlist = savedWishlist.filter((id: string) => id !== product.id);
    } else {
      savedWishlist.push(product.id);
    }
    
    localStorage.setItem("eatsie_wishlist", JSON.stringify(savedWishlist));
    setIsWishlisted(!isWishlisted);
  };

  // 3. Add to Cart Logic
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    const variant = product.variants?.[0];
    if (!variant) return alert("Product is unavailable");

    setIsAdding(true);
    try {
      await addToCart({
        variantId: variant.id,
        quantity: 1,
        countryCode,
      });
      alert("Added to cart!");
    } catch (error) {
      console.error("Failed to add to cart", error);
      alert("Error adding to cart");
    } finally {
      setIsAdding(false);
    }
  };

  // 4. 🛡️ BULLETPROOF PRICE EXTRACTOR (Upgraded for Multi-Currency)
  let price = "Price Unavailable";
  const variant = product?.variants?.[0];

  if (variant) {
    try {
      let amount = 0;
      let currencyCode = "eur"; // Default fallback

      // Scenario A: Medusa V2 (calculated_price is an object)
      if (typeof variant.calculated_price === 'object' && variant.calculated_price !== null) {
        amount = variant.calculated_price.calculated_amount || 0;
        currencyCode = variant.calculated_price.currency_code || currencyCode;
      }
      // Scenario B: Price is hidden inside the prices array (usually in cents)
      else if (variant.prices?.[0]?.amount !== undefined) {
        amount = variant.prices[0].amount;
        currencyCode = variant.prices[0].currency_code || currencyCode;
      }
      // Scenario C: Medusa V1 legacy fallback
      else if (variant.calculated_price !== undefined && variant.calculated_price !== null) {
        amount = Number(variant.calculated_price);
      }

      // 🟢 THE FIX: Let Medusa's helper format the final string with the right symbol!
      price = convertToLocale({ amount, currency_code: currencyCode });
      
    } catch (err) {
      console.error("Failed to parse price for:", product.title, err);
    }
  }

  return (
    <div className="mt-2">
      <h6 className="fw-bold text-success mb-2">{price}</h6>
      
      <div className="d-flex align-items-center justify-content-between gap-2">
        {/* Wishlist Heart Icon */}
        <button 
          onClick={toggleWishlist}
          className={`btn btn-sm ${isWishlisted ? 'btn-danger' : 'btn-outline-danger'}`}
          style={{ width: "36px", height: "36px", borderRadius: "50%" }}
        >
          <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`}></i>
        </button>

        {/* Add to Cart Icon Button */}
        <button 
          onClick={handleAddToCart}
          disabled={isAdding}
          className="btn btn-success btn-sm flex-grow-1 fw-bold"
        >
          {isAdding ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : (
            <><i className="bi bi-cart-plus me-1"></i> Add to Cart</>
          )}
        </button>
      </div>
    </div>
  );
}