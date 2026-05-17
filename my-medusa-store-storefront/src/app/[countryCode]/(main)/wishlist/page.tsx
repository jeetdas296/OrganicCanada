"use client";

import { useEffect, useState, use } from "react"; 
import Link from "next/link";
import ProductCardActions from "components/ProductCartActions";

export default function WishlistPage(props: { params: Promise<{ countryCode: string }> }) {
  
  const params = use(props.params);
  const countryCode = params.countryCode;

  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem("eatsie_wishlist") || "[]");
    
    if (savedIds.length === 0) {
      setIsLoading(false);
      return;
    }
const fetchWishlist = async () => {
      try {
        const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
        const headers = {
          "Content-Type": "application/json",
          "x-publishable-api-key": pubKey
        };

        const queryParams = new URLSearchParams();
        savedIds.forEach((id: string) => queryParams.append('id', id));

        try {
          const regionRes = await fetch(`http://localhost:9000/store/regions`, { headers });
          const regionData = await regionRes.json();
          const currentRegion = regionData.regions?.find((r: any) => 
            r.countries?.some((c: any) => c.iso_2 === countryCode.toLowerCase())
          );
          
          if (currentRegion) {
            // 🛑 THE FIX: ONLY append the region_id! 
            // Sending both region and currency code causes Medusa to crash.
            queryParams.append('region_id', currentRegion.id);
          }
        } catch (regionErr) {
          console.error("Failed to fetch region for pricing context", regionErr);
        }

        const fetchUrl = `http://localhost:9000/store/products?${queryParams.toString()}`;
        const res = await fetch(fetchUrl, { headers });
        const data = await res.json();
        
        // 🚨 THE DEBUGGER: If Medusa secretly returns an error, catch it and show us!
        if (data.type || data.message) {
          alert(`Medusa API Error: ${data.message || "Unknown Error"}`);
          console.error("Medusa Full Error:", data);
        }
        
        setWishlistProducts(data.products || []);
      } catch (error) {
        console.error("Failed to load wishlist", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  return (
    <section className="py-5 bg-light osahan-main-body min-vh-100">
      <div className="container">
        <h3 className="fw-bold mb-4"><i className="bi bi-heart-fill text-danger me-2"></i>My Wishlist</h3>
        
        {isLoading ? (
          <div className="text-center py-5"><span className="spinner-border text-success"></span></div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-5 bg-white rounded shadow-sm border">
            <h5 className="text-muted mb-3">Your wishlist is empty!</h5>
            <Link href={`/${countryCode}/listing`} className="btn btn-success fw-bold">Browse Products</Link>
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4">
            {wishlistProducts.map((product) => (
              <div className="col" key={product.id}>
                <div className="card shadow-sm border-0 h-100 position-relative">
                  <Link href={`/${countryCode}/products/${product.handle}`}>
                    <img src={product.thumbnail || '/img/1.png'} className="card-img-top p-3" alt={product.title} style={{ objectFit: 'contain', height: '180px' }} />
                  </Link>
                  <div className="card-body pt-0 d-flex flex-column">
                    <Link href={`/${countryCode}/products/${product.handle}`} className="text-decoration-none text-dark">
                      <h6 className="card-title fw-bold mb-1 text-truncate">{product.title}</h6>
                    </Link>
                    <p className="card-text small text-muted mb-auto">Medusa Product</p>
                    
                    <ProductCardActions product={product} countryCode={countryCode} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}