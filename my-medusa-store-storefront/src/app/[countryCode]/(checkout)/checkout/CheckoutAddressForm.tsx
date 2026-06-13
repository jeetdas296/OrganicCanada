"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { unlockStripe } from "./actions"; // 👈 Ensure this path points to your actions file
import { sdk } from "@lib/config"; // 👈 Ensure this points to your Medusa JS SDK instance!

export default function CheckoutAddressForm({ 
  savedAddresses, 
  customer, 
  cart 
}: { 
  savedAddresses: any[], 
  customer: any, 
  cart: any 
}) {
  const router = useRouter();
  const params = useParams();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const urlCountryCode = (params.countryCode as string)?.toLowerCase() || "us";

  // 1. State to hold the current values of the form
  const [form, setForm] = useState({
    first_name: customer?.first_name || cart?.shipping_address?.first_name || "",
    last_name: customer?.last_name || cart?.shipping_address?.last_name || "",
    address_1: cart?.shipping_address?.address_1 || "",
    city: cart?.shipping_address?.city || "",
    province: cart?.shipping_address?.province || "",
    postal_code: cart?.shipping_address?.postal_code || "",
    phone: customer?.phone || cart?.shipping_address?.phone || "",
    // Medusa strictly requires a country code to save an address and calculate shipping!
    country_code: cart?.region?.countries?.[0]?.iso_2 || urlCountryCode
  });

  // 2. Auto-fill from dropdown
  const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const address = savedAddresses.find((a) => a.id === selectedId);
    setIsSaved(false);

    if (address) {
      setForm({
        first_name: address.first_name || customer?.first_name || "",
        last_name: address.last_name || customer?.last_name || "",
        address_1: address.address_1 || "",
        city: address.city || "",
        province: address.province || "",
        postal_code: address.postal_code || "",
        phone: address.phone || customer?.phone || "",
        country_code:
  cart?.region?.countries?.[0]?.iso_2 ||
  form.country_code
      });
    } else {
      setForm({ ...form, address_1: "", city: "", province: "", postal_code: "" });
    }
    console.log("Selected Address:", address)
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setIsSaved(false);
  };

  // 🟢 3. THE MASTER SUBMIT FUNCTION (Saves Address -> Attaches Shipping -> Unlocks Stripe)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

      // STEP A: Save the shipping address to the Medusa cart
      const response = await fetch(`${backendUrl}/store/carts/${cart.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
        body: JSON.stringify({ shipping_address: form })
      });

      if (response.ok) {
        setIsSaved(true);
        // STEP B: Generate a fresh Stripe session
        await unlockStripe().catch(console.error);
        
        // STEP C: Refresh the page so page.tsx wakes up, sees the address, and attaches the shipping!
        router.refresh(); 
      }
    } catch (err) {
      console.error("Failed to save address:", err);
    } finally {
      setIsSaving(false);
    }
    console.log("Cart Region:", cart.region?.name)
console.log("Allowed Countries:", cart.region?.countries)
console.log("Submitting Country:", form.country_code)
  };

  return (
    <div className="bg-white rounded-3 shadow-sm p-4 mb-4 border">
      <h5 className="fw-bold mb-4"><i className="icofont-location-pin text-success me-2"></i>Delivery Address</h5>
      
      {/* DROPDOWN */}
      {savedAddresses.length > 0 && (
        <div className="mb-4 bg-light p-3 rounded border border-success border-opacity-50">
          <label className="form-label text-success small fw-bold">
            <i className="icofont-star me-1"></i> Quick Fill from Address Book
          </label>
          <select className="form-select shadow-sm border-success" onChange={handleAddressSelect}>
            <option value="">-- Choose a saved address --</option>
            {savedAddresses.map((addr: any) => (
              <option key={addr.id} value={addr.id}>
                {addr.first_name} {addr.last_name} - {addr.address_1}, {addr.city} {addr.postal_code}
              </option>
            ))}
          </select>
          <div className="text-center text-muted small mt-3 fw-bold">- OR ENTER A NEW ONE -</div>
        </div>
      )}

      {/* 🟢 THE INTERACTIVE FORM WITH ONSUBMIT */}
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label text-muted small fw-bold">First Name</label>
            <input name="first_name" type="text" className="form-control" value={form.first_name} onChange={handleChange} required placeholder="John" />
          </div>
          <div className="col-md-6">
            <label className="form-label text-muted small fw-bold">Last Name</label>
            <input name="last_name" type="text" className="form-control" value={form.last_name} onChange={handleChange} required placeholder="Doe" />
          </div>
          <div className="col-12">
            <label className="form-label text-muted small fw-bold">Street Address</label>
            <input name="address_1" type="text" className="form-control" value={form.address_1} onChange={handleChange} required placeholder="123 Grocery Lane" />
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted small fw-bold">City</label>
            <input name="city" type="text" className="form-control" value={form.city} onChange={handleChange} required placeholder="Foodville" />
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted small fw-bold">State/Province</label>
            <input name="province" type="text" className="form-control" value={form.province} onChange={handleChange} placeholder="NY" />
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted small fw-bold">ZIP Code</label>
            <input name="postal_code" type="text" className="form-control" value={form.postal_code} onChange={handleChange} required placeholder="10001" />
          </div>
          <div className="col-12">
            <label className="form-label text-muted small fw-bold">Phone Number</label>
            <input name="phone" type="tel" className="form-control" value={form.phone} onChange={handleChange} placeholder="(555) 123-4567" />
          </div>
        </div>

        {/* 🟢 THE SAVE BUTTON */}
        <div className="mt-4">
          <button 
            type="submit" 
            className={`btn w-100 py-3 fw-bold ${isSaved ? 'btn-success' : 'btn-dark'}`}
            disabled={isSaving}
          >
            {isSaving ? "Saving & Calculating Shipping..." : isSaved ? "✓ Address Saved" : "Save Address & Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}