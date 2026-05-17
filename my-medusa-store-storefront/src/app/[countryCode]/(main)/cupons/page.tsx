import Medusa from "@medusajs/js-sdk";
import Link from "next/link";
import CopyButton from "./CopyButton";

// 1. Initialize SDK
const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000", 
  debug: false, // Turned off so your terminal stays clean!
  apiKey: process.env.MEDUSA_ADMIN_TOKEN, 
});

export default async function CouponsPage() {
  let promotions: any[] = [];
  let campaigns: any[] = [];
  let debugMessage = "";

  try {
    // 2. Fetch BOTH Promotions and Campaigns at the exact same time!
    const [promotionsResponse, campaignsResponse] = await Promise.all([
      sdk.admin.promotion.list(),
      sdk.admin.campaign.list()
    ]);
    
    promotions = promotionsResponse.promotions || [];
    campaigns = campaignsResponse.campaigns || [];
    
    debugMessage = `Success! Fetched ${promotions.length} promotions and ${campaigns.length} campaigns.`;
  } catch (error: any) {
    debugMessage = `Error: ${error.message}`;
  }

  // Helper function to find a campaign's description based on its ID
  const getCampaignDescription = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.description : "Use this code at checkout to claim your discount!";
  };

  const getCampaignName = (campaignId: string, fallbackCode: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.name : fallbackCode;
  };

  return (
    <>

      {/* 1. Top Offer Banner (Your Eatsie UI) */}
      <div className="offer-section bg-success">
        <div className="container">
          <div className="py-5 d-flex align-items-center">
            <div className="text-md-start text-center">
              <h2 className="text-white display-5 mb-2 fw-bold">Offers for you</h2>
              <p className="lead text-white-50 m-0">Explore top deals and offers exclusively for you!</p>
            </div>
            <div className="ms-auto d-none d-md-block">
              <img alt="Offers" src="/img/offers.png" className="img-fluid offers_img" style={{ height: "200px" }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Coupon Grid */}
      <div className="container">
        <div className="col-lg-12 py-5 mx-auto">
          <div className="row row-cols-1 row-cols-md-3 row-cols-lg-3 g-4">
            
            {promotions.length > 0 ? (
              promotions.map((promo: any) => {
                // Match the promotion to its campaign text!
                const title = getCampaignName(promo.campaign_id, promo.code);
                const description = getCampaignDescription(promo.campaign_id);

                return (
                  <div className="col" key={promo.id}>
                    <div className="bg-white shadow-sm rounded-3 p-4 border border-success h-100 d-flex flex-column">
                      
                      {/* Code Header */}
                      <div className="gap-3 d-flex align-items-center mb-2">
                        <span className="icofont-sale-discount h1 mb-0 text-success"></span>
                        <span className="fw-bold text-success h6 m-0">{promo.code}</span>
                      </div>
                      
                      {/* Marketing Text */}
                      <p className="mb-2 fw-bold text-dark">{title}</p>
                      <p className="mb-4 text-muted small flex-grow-1">{description}</p>
                      
                      {/* Action Buttons */}
                      <div className="d-flex align-items-center justify-content-between mt-auto">
                        <Link href="/listing" className="text-success text-decoration-none fw-bold">
                          + SHOP NOW
                        </Link>
                          <CopyButton code={promo.code} />
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-12 text-center py-5">
                <h5 className="text-muted">No active offers right now. Check back later!</h5>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}