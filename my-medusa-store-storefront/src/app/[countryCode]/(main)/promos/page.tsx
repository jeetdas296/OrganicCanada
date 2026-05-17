export const dynamic = "force-dynamic";

import Link from "next/link";
import { retrieveCustomer } from "@lib/data/customer";
import { redirect } from "next/navigation";
import PromoCard from "components/PromoCard";
import Medusa from "@medusajs/js-sdk";

// 1. 🚀 Initialize Medusa Admin SDK securely on the server!
const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  debug: false,
  apiKey: process.env.MEDUSA_ADMIN_TOKEN, // 🔒 Safe here because this is a Server Component!
});

export default async function PromosPage(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  const countryCode = params.countryCode;

  // 2. Secure the page! Only logged-in users get promos.
  const rawCustomerData = await retrieveCustomer().catch(() => null);
  let customer = rawCustomerData?.customer || rawCustomerData;

  if (customer && !customer.id) {
    customer = null;
  }

  if (!customer) {
    redirect(`/${countryCode}/login`);
  }

  // 3. 🎟️ Fetch BOTH Promotions and Campaigns at the exact same time!
  let promotions: any[] = [];
  let campaigns: any[] = [];

  try {
    const [promotionsResponse, campaignsResponse] = await Promise.all([
      sdk.admin.promotion.list(),
      sdk.admin.campaign.list()
    ]);
    
    promotions = promotionsResponse.promotions || [];
    campaigns = campaignsResponse.campaigns || [];
  } catch (error) {
    console.error("❌ Failed to fetch Medusa promotions:", error);
  }

  // Helper function to grab the campaign associated with a promo
  const getCampaign = (campaignId: string) => campaigns.find(c => c.id === campaignId);

  // 4. Transform Medusa Data into our PromoCard format
  const activePromos = promotions.map((promo: any) => {
    const campaign = getCampaign(promo.campaign_id);
    
    // Check if Medusa says it's a fixed amount, otherwise default to percentage
    const promoType = promo.application_method?.type === "fixed" ? "fixed" : "percentage";
    
    // Check if the campaign has an expiration date, otherwise it's valid anytime
    const expiryDate = campaign?.ends_at 
      ? new Date(campaign.ends_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
      : "Valid anytime";

    return {
      id: promo.id,
      title: campaign?.name || "Store Discount",
      description: campaign?.description || "Use this code at checkout to claim your discount!",
      code: promo.code,
      expiry: expiryDate,
      type: promoType,
    };
  });

  return (
    <>
      {/* Top Banner */}
      <div className="bg-success py-5">
        <div className="container text-center text-white">
          <h1 className="fw-bold mb-2">My Promos</h1>
          <p className="lead m-0 text-white-50">Exclusive discounts just for you</p>
        </div>
      </div>

      <section className="py-5 bg-light osahan-main-body min-vh-100">
        <div className="container">
          
          {/* Back Button */}
          <div className="mb-4">
            <Link href={`/${countryCode}/profile`} className="btn btn-outline-success fw-bold px-4">
              <i className="bi bi-arrow-left me-2"></i> Back to Profile
            </Link>
          </div>
          
          {/* Main Content Area */}
          <div className="bg-white rounded-3 shadow-sm p-4 border">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 className="fw-bold m-0">Available Rewards</h4>
              <span className="badge bg-danger rounded-pill px-3 py-2">
                {activePromos.length} Offers Available
              </span>
            </div>
            
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {activePromos.length > 0 ? (
                activePromos.map((promo) => (
                  <div className="col" key={promo.id}>
                    <PromoCard promo={promo} />
                  </div>
                ))
              ) : (
                <div className="col-12 text-center py-5 w-100">
                  <h5 className="text-muted">No active offers right now. Check back later!</h5>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </section>
    </>
  );
}