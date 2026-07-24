import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import CheckoutAddressForm from "./CheckoutAddressForm";
import { redirect } from "next/navigation";
import PaymentSelector from "./PaymentSelector";
import { convertToLocale } from "@lib/util/money";
import B2BQuoteSubmitButton from "./B2BQuoteSubmitButton";
import { ensureB2BMetadataOnCart } from "./actions";

export const dynamic = "force-dynamic";

export default async function CheckoutPage(props: {
  params: Promise<{ countryCode: string }>;
}) {
  const params = await props.params;
  let cart = await retrieveCart();

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  const rawCustomerData = await retrieveCustomer().catch(() => null);
  const customer = rawCustomerData?.customer || rawCustomerData;

  if (!customer || !customer.id) {
    redirect(`/${params.countryCode}/login`);
  }

  // ── Cart Guard ──────────────────────────────────────────────────────────────
  if (!cart || cart.items?.length === 0) {
    redirect(`/${params.countryCode}/listing`);
  }

  const savedAddresses = customer?.addresses || [];

  // ── Detect Cart Type ────────────────────────────────────────────────────────
  const isPureDigitalCart = !cart.items?.some(
    (item: any) =>
      item.variant?.manage_inventory === true &&
      item.product?.type?.value !== "Digital Product"
  );

  // ── Detect B2B Cart & Ensure Metadata ───────────────────────────────────────
  await ensureB2BMetadataOnCart(cart.id);
  cart = (await retrieveCart()) || cart;

  const cartMetadata = (cart.metadata as Record<string, unknown>) || {};
  const isB2BCart =
    cartMetadata.is_b2b === true || cartMetadata.is_b2b === "true";
  const isB2BApproved = customer?.metadata?.b2b_status === "approved";

  const isB2BQuoteRequired = isB2BApproved || isB2BCart;

  // Dynamically read stored payment term from cart metadata
  const b2bPaymentTerm =
    (typeof cartMetadata.payment_term === "string"
      ? cartMetadata.payment_term
      : null) || "net_30";

  // ── Shipping Auto-Selector ──────────────────────────────────────────────────
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const headers = {
    "Content-Type": "application/json",
    "x-publishable-api-key": pubKey,
  };

  console.log("🛠️ DEBUG: Fetching shipping options for cart:", cart.id);

  const optionsRes = await fetch(
    `${backendUrl}/store/shipping-options?cart_id=${cart.id}`,
    { headers, cache: "no-store" }
  );

  const optionsData = await optionsRes.json();
  const options = optionsData.shipping_options || [];
  const isReadyForPayment = !!cart.shipping_methods?.length;

  if (options.length > 0) {
    let correctOptionId = options[0].id;

    if (!isPureDigitalCart) {
      const pickupOption = options.find((opt: any) =>
        opt.name?.toLowerCase().includes("pickup")
      );
      const physicalOption = options.find(
        (opt: any) =>
          opt.amount >= 0 &&
          !opt.name?.toLowerCase().includes("digital")
      );

      if (pickupOption) correctOptionId = pickupOption.id;
      else if (physicalOption) correctOptionId = physicalOption.id;
    } else {
      const digitalOption = options.find(
        (opt: any) =>
          opt.amount === 0 ||
          opt.name?.toLowerCase().includes("digital")
      );
      if (digitalOption) correctOptionId = digitalOption.id;
      console.log("📱 Purely digital cart. Forcing free digital shipping.");
    }

    const currentMethodId =
      cart.shipping_methods?.[0]?.shipping_option_id;

    if (currentMethodId !== correctOptionId) {
      console.log(
        "🔄 Wrong or missing shipping method. Overwriting to:",
        correctOptionId
      );

      await fetch(
        `${backendUrl}/store/carts/${cart.id}/shipping-methods`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ option_id: correctOptionId }),
          cache: "no-store",
        }
      );

      cart = await retrieveCart();
    } else {
      console.log("✅ Cart already has the correct shipping method.");
    }
  }

  // ── Stripe Client Secret ────────────────────────────────────────────────────
  let clientSecret = "";

  if (cart?.payment_collection?.payment_sessions) {
    const session = cart.payment_collection.payment_sessions.find(
      (s: any) =>
        s.provider_id === "pp_stripe_stripe" ||
        s.provider_id === "stripe"
    );
    clientSecret = session?.data?.client_secret || "";
  }

  // ── Price Calculation ───────────────────────────────────────────────────────
  const trueProductSubtotal = cart.items.reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity,
    0
  );

  return (
    <>
      <div className="bg-success py-4">
        <div className="container text-center text-white">
          <h2 className="fw-bold mb-0">Checkout</h2>
        </div>
      </div>

      <section className="py-5 bg-light osahan-main-body">
        <div className="container">
          <div className="row">
            {/* ── LEFT COLUMN ────────────────────────────────────────────── */}
            <div className="col-lg-8 mb-4">
              {/* Delivery Address */}
              <CheckoutAddressForm
                savedAddresses={savedAddresses}
                customer={customer}
                cart={cart}
              />

              {/* Payment Method */}
              {isReadyForPayment ? (
                <div className="bg-white rounded-3 shadow-sm p-4 border">
                  <h5 className="fw-bold mb-4">
                    {isB2BQuoteRequired ? "Submit for Approval" : "Payment Details"}
                  </h5>

                  {isB2BQuoteRequired ? (
                    <div className="text-center py-3">
                      <div className="mb-3 text-info fs-1">📋</div>
                      <h6 className="fw-bold">Ready to Submit for Approval</h6>
                      <p className="text-muted small mb-4">
                        Your order will be reviewed by our team. You will receive an email notification once a decision is made.
                      </p>

                      <B2BQuoteSubmitButton cartId={cart.id} />
                    </div>
                  ) : (
                    <PaymentSelector
                      cart={cart}
                      clientSecret={clientSecret}
                      isPureDigital={isPureDigitalCart}
                      isB2BQuote={false}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3 shadow-sm p-4 border text-center">
                  <h5 className="text-muted">
                    <i className="icofont-lock"></i> Please save your delivery address to see payment options
                  </h5>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: Order Summary ─────────────────────────── */}
            <div className="col-lg-4">
              <div
                className="bg-white rounded-3 shadow-sm p-4 border sticky-top"
                style={{ top: "20px" }}
              >
                <h5 className="fw-bold mb-4">Order Summary</h5>

                {/* B2B badge in summary */}
                {isB2BCart && (
                  <div className="mb-3">
                    <span className="badge bg-primary me-2 text-white px-2 py-1 rounded">B2B Order</span>
                    {b2bPaymentTerm && (
                      <span className="badge bg-secondary text-white px-2 py-1 rounded">
                        {b2bPaymentTerm.replace(/_/g, " ").toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                {/* Item List */}
                <div
                  className="mb-4"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  {cart.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="d-flex align-items-center mb-3"
                    >
                      <img
                        src={item.thumbnail || "/img/1.png"}
                        alt={item.title}
                        className="rounded border"
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                        }}
                      />
                      <div className="ms-3 flex-grow-1">
                        <h6
                          className="fw-bold mb-0 text-truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          {item.title}
                        </h6>
                        <small className="text-muted">
                          Qty: {item.quantity}
                        </small>
                      </div>
                      <div className="fw-bold text-end">
                        {convertToLocale({
                          amount: item.total,
                          currency_code: cart.currency_code,
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <hr />

                {/* Price Breakdown */}
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
                      -
                      {convertToLocale({
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
                      amount: cart.tax_total || 0,
                      currency_code: cart.currency_code,
                    })}
                  </span>
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-4">
                  <h4 className="m-0 fw-bold">Total</h4>
                  <h4 className="m-0 fw-bold text-success">
                    {convertToLocale({
                      amount: cart.total || 0,
                      currency_code: cart.currency_code,
                    })}
                  </h4>
                </div>

                {/* B2B Note */}
                {isB2BQuoteRequired ? (
                  <p className="text-center text-info small mt-3 mb-0">
                    <i className="icofont-info-circle"></i> No payment charged until quote is approved
                  </p>
                ) : (
                  <p className="text-center text-muted small mt-3 mb-0">
                    <i className="icofont-lock"></i> Secure checkout powered by Eatsie
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}