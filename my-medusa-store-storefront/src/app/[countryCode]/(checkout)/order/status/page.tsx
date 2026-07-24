import Link from "next/link";
// 🟢 1. Import your Widget! (Adjust this path to exactly where your widget is saved)
import DigitalDownloadsWidget from "../../../../../modules/order/components/digital-downloads";
// Next.js safely reads the URL parameters that Stripe attaches after payment
export default async function OrderStatusPage(props: {
    params: Promise<{ countryCode: string }>,
    searchParams: Promise<{ redirect_status?: string, order_id?: string }>
}) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const countryCode = params.countryCode;

    // This is the status Stripe sends back (succeeded, failed, requires_action)
    const status = searchParams.redirect_status;

    // 🟢 2. We need the order ID from the URL to pass to the widget!
    const orderId = searchParams.order_id;
    // Default UI (Processing)
    let uiConfig = {
        title: "Processing Payment...",
        icon: "icofont-spinner icofont-spin text-warning",
        color: "warning",
        message: "Please wait while we confirm your payment with the bank.",
        buttonText: "Refresh Status",
        buttonLink: "#"
    };
    // 🟢 SUCCESS UI
    if (status === "succeeded") {
        uiConfig = {
            title: "Order Placed Successfully!",
            icon: "icofont-check-circled text-success",
            color: "success",
            message: "Thank you for your order. Your payment was approved!",
            buttonText: "Return to Menu",
            buttonLink: `/${countryCode}`
        };
    }
    // 🔴 FAILED UI
    else if (status === "failed") {
        uiConfig = {
            title: "Payment Failed",
            icon: "icofont-close-circled text-danger",
            color: "danger",
            message: "Your card was declined or the payment failed. No charges were made.",
            buttonText: "Try Another Card",
            buttonLink: "back"
        };
    }
    // 🟠 FRAUD / REQUIRES ACTION UI
    else if (status === "requires_action" || status === "requires_payment_method") {
        uiConfig = {
            title: "Payment Flagged",
            icon: "icofont-warning text-danger",
            color: "danger",
            message: "This payment was flagged or requires further 3D Secure authentication.",
            buttonText: "Contact Support",
            buttonLink: `/${countryCode}`
        };
    }
    return (
        <div className="bg-light min-vh-100 d-flex align-items-center justify-content-center py-5">
            <div className="container text-center">
                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-7"> {/* Made slightly wider to fit the widget nicely */}
                        <div className="bg-white p-5 rounded-4 shadow-sm border">

                            {/* Dynamic Icon */}
                            <i className={`${uiConfig.icon} display-1 mb-3 d-block`}></i>

                            {/* Dynamic Title & Message */}
                            <h2 className="fw-bold mb-3">{uiConfig.title}</h2>
                            <p className="text-muted mb-4">{uiConfig.message}</p>

                            {/* 🟢 3. THE WIDGET: Only show it if payment succeeded AND we have an order ID */}
                            {status === "succeeded" && orderId && (
                                <div className="mb-5 text-start">
                                    <DigitalDownloadsWidget orderId={orderId} />
                                </div>
                            )}
                            {/* Dynamic Button */}
                            {uiConfig.buttonLink === "back" ? (
                                <Link href={`/${countryCode}/checkout`} className={`btn btn-${uiConfig.color} w-100 py-3 fw-bold rounded-3`}>
                                    {uiConfig.buttonText}
                                </Link>
                            ) : (
                                <Link href={uiConfig.buttonLink} className={`btn btn-${uiConfig.color} w-100 py-3 fw-bold rounded-3`}>
                                    {uiConfig.buttonText}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}