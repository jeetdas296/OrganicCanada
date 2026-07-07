"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLineItem, deleteLineItem, submitPromotionForm } from "@lib/data/cart";
import { convertToLocale } from "@lib/util/money";

export default function CartActions({ cart }: { cart: any }) {
  const [promoCode, setPromoCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>(() => {
    // ✅ Initialize inputValues with current quantities from cart
    const initial: { [key: string]: string } = {};
    cart.items.forEach((item: any) => {
      initial[item.id] = String(item.quantity);
    });
    return initial;
  });
  const router = useRouter();

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("code", promoCode);
      await submitPromotionForm(null, formData);
      setPromoCode("");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to apply promo code. Make sure it is active!");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateQty = async (lineId: string, newQty: number) => {
    if (newQty < 1) return;
    setIsUpdating(true);
    // ✅ Sync inputValues immediately so UI shows correct value
    setInputValues((prev) => ({ ...prev, [lineId]: String(newQty) }));
    await updateLineItem({ lineId, quantity: newQty });
    router.refresh();
    setIsUpdating(false);
  };

  const handleRemoveItem = async (lineId: string) => {
    setIsUpdating(true);
    try {
      await deleteLineItem(lineId);
      router.refresh();
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to remove item. Please check the console.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ Handle typing - only allow digits
  const handleQtyInputChange = (itemId: string, value: string) => {
    if (/^\d*$/.test(value)) {
      setInputValues((prev) => ({ ...prev, [itemId]: value }));
    }
  };

  // ✅ On blur - validate and update
  const handleQtyBlur = (item: any) => {
    const rawValue = inputValues[item.id] ?? "";
    const parsed = parseInt(rawValue);

    if (!isNaN(parsed) && parsed > 0) {
      if (parsed !== item.quantity) {
        handleUpdateQty(item.id, parsed);
      }
    } else {
      // Reset to original quantity if invalid
      setInputValues((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
    }
  };

  // ✅ On Enter key - validate and update
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, item: any) => {
    // Block invalid keys
    if (["e", "E", "+", "-", "."].includes(e.key)) {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter") {
      const rawValue = inputValues[item.id] ?? "";
      const parsed = parseInt(rawValue);

      if (!isNaN(parsed) && parsed > 0) {
        if (parsed !== item.quantity) {
          handleUpdateQty(item.id, parsed);
        }
      } else {
        setInputValues((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
      }

      (e.target as HTMLInputElement).blur();
    }
  };

  const trueProductSubtotal = cart.items.reduce((sum: number, item: any) => {
    return sum + item.unit_price * item.quantity;
  }, 0);

  return (
    <div className="row">
      <div className="col-lg-8">
        <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
          {cart.items.map((item: any) => (
            <div
              key={item.id}
              className="d-flex align-items-center border-bottom py-3 justify-content-between"
            >
              <div className="d-flex align-items-center">
                <img
                  src={item.thumbnail}
                  alt=""
                  style={{ width: "60px", height: "60px", objectFit: "cover" }}
                  className="rounded border"
                />
                <div className="ms-3">
                  <h6 className="fw-bold mb-0">{item.title}</h6>
                  <small className="text-muted">
                    {convertToLocale({
                      amount: item.unit_price,
                      currency_code: cart.currency_code,
                    })}
                  </small>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="input-group input-group-sm" style={{ width: "110px" }}>
                  {/* ➖ Minus Button */}
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                    disabled={isUpdating || item.quantity <= 1}
                  >
                    -
                  </button>

                  {/* ✅ Editable Quantity Input - type="text" to avoid spinner */}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-control text-center px-0"
                    value={inputValues[item.id] ?? String(item.quantity)}
                    disabled={isUpdating}
                    onChange={(e) => handleQtyInputChange(item.id, e.target.value)}
                    onBlur={() => handleQtyBlur(item)}
                    onKeyDown={(e) => handleQtyKeyDown(e, item)}
                  />

                  {/* ➕ Plus Button */}
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                    disabled={isUpdating}
                  >
                    +
                  </button>
                </div>

                {/* 🗑️ Delete Button */}
                <button
                  className="btn btn-link text-danger p-0"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isUpdating}
                >
                  <i className="icofont-trash fs-5"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-lg-4">
        <div className="bg-white rounded-3 shadow-sm p-4 mb-3 border border-success border-opacity-50">
          <h6 className="fw-bold mb-3">Promo Code</h6>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="e.g. GET20"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
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
            <span className="fw-bold">
              {convertToLocale({
                amount: trueProductSubtotal,
                currency_code: cart.currency_code,
              })}
            </span>
          </div>

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Shipping</span>
            <span className="fw-bold">
              {convertToLocale({
                amount: cart.shipping_total || 0,
                currency_code: cart.currency_code,
              })}
            </span>
          </div>

          {cart.discount_total > 0 && (
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Discount</span>
              <span className="fw-bold text-success">
                -{convertToLocale({
                  amount: cart.discount_total,
                  currency_code: cart.currency_code,
                })}
              </span>
            </div>
          )}

          <div className="d-flex justify-content-between mb-3">
            <span className="text-muted">Taxes</span>
            <span className="fw-bold">
              {convertToLocale({
                amount: cart.tax_total,
                currency_code: cart.currency_code,
              })}
            </span>
          </div>

          <hr />

          <div className="d-flex justify-content-between fw-bold h5 mb-4">
            <span className="m-0">Total</span>
            <span className="m-0 text-success">
              {convertToLocale({
                amount: cart.total,
                currency_code: cart.currency_code,
              })}
            </span>
          </div>

          <Link
            href={`/${cart.region?.countries?.[0]?.iso_2 || "dk"}/checkout`}
            className="btn btn-success w-100 py-3 fw-bold d-block text-center text-white text-decoration-none"
          >
            PROCEED TO CHECKOUT <i className="icofont-arrow-right ms-2"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}