"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { submitB2BQuote, clearStaleCartCookie } from "./actions";

const TERMS = ["net_15", "net_30", "net_60", "net_90", "upon_approval"];

export default function B2BQuoteSubmitButton({ cartId }: { cartId: string }) {
  const [selectedTerm, setSelectedTerm] = useState("net_30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const countryCode = (params.countryCode as string) || "us";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitB2BQuote(cartId, selectedTerm);

      if (!response.success) {
        throw new Error(response.error || "Failed to submit quote");
      }

      await clearStaleCartCookie().catch(() => null);

      router.push(
        `/${countryCode}/checkout/b2b-success?quote_id=${response.quote?.id || ""}&payment_term=${selectedTerm}`
      );
    } catch (err: any) {
      setError(err?.message || "Failed to submit quote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-100">
      <div className="mb-3">
        <label className="form-label fw-bold text-muted">Select Payment Term</label>
        <select 
          className="form-select" 
          value={selectedTerm} 
          onChange={(e) => setSelectedTerm(e.target.value)}
        >
          {TERMS.map((term) => (
            <option key={term} value={term}>
              {term.replace("_", " ").toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-danger small py-2 mb-3 shadow-sm border-danger">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="btn btn-success w-100 py-3 fw-bold shadow"
      >
        {isSubmitting ? "SUBMITTING FOR APPROVAL..." : "SUBMIT FOR APPROVAL"}
      </button>

      <p className="text-center text-muted small mt-3 mb-0">
        <i className="icofont-info-circle"></i> No payment will be charged until your quote is approved.
      </p>
    </div>
  );
}