/**
 * Extracts the price from a Medusa v2 product variant.
 * Uses the standard `convertToLocale` helper for proper formatting.
 */
export function getVariantPrice(variant: any): {
  amount: number
  currencyCode: string
  formatted: string
} {
  let amount = 0
  let currencyCode = "eur" // Default fallback

  if (!variant) {
    return { amount: 0, currencyCode, formatted: "EUR 0.00" }
  }

  try {
    // Scenario A: Medusa V2 (calculated_price is an object)
    if (
      typeof variant.calculated_price === "object" &&
      variant.calculated_price !== null
    ) {
      amount = variant.calculated_price.calculated_amount || 0
      currencyCode = variant.calculated_price.currency_code || currencyCode
    }
    // Scenario B: Price is in the prices array (usually in cents)
    else if (variant.prices?.[0]?.amount !== undefined) {
      amount = variant.prices[0].amount
      currencyCode = variant.prices[0].currency_code || currencyCode
    }
    // Scenario C: Medusa V1 legacy fallback
    else if (
      variant.calculated_price !== undefined &&
      variant.calculated_price !== null
    ) {
      amount = Number(variant.calculated_price)
    }
  } catch (err) {
    console.error("Failed to parse price:", err)
  }

  // Format the price using locale-appropriate formatting
  const formatted = convertToLocale({ amount, currency_code: currencyCode })

  return { amount, currencyCode, formatted }
}

/**
 * Medusa's built-in currency formatter
 * Converts amount (in cents) to a localized currency string
 */
export function convertToLocale({
  amount,
  currency_code,
  locale = "en-DK",
  minimumFractionDigits = 2,
}: {
  amount: number
  currency_code: string
  locale?: string
  minimumFractionDigits?: number
}) {
  return currency_code && !isNaN(amount)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
      }).format(amount)
    : "Price unavailable"
}