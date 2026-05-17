"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// Import Medusa's built-in address functions!
import { addCustomerAddress, updateCustomerAddress, deleteCustomerAddress } from "@lib/data/customer";

export default function AddressBook({ customer, countryCode }: { customer: any, countryCode: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const addresses = customer?.addresses || [];

  // 📝 Handle Add or Edit Submission
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    // 🛡️ THE PERFECT STATE OBJECT
    // Medusa's starter kit expects the first argument to hold these specific keys!
    const currentState = {
      addressId: editingAddress?.id || undefined, // 👈 This fixes the "reading 'addressId'" crash!
      isDefaultBilling: false,                    // 👈 This fixes the "reading 'isDefaultBilling'" crash!
      isDefaultShipping: false,
    };

    try {
      let response;
      
      if (editingAddress) {
        // Pass our custom state object first, then the formData!
        response = await updateCustomerAddress(currentState, formData);
      } else {
        response = await addCustomerAddress(currentState, formData);
      }
      
      if (typeof response === "string") {
        alert(`Medusa Error: ${response}`);
        setIsLoading(false);
        return; 
      }
      
      // Success!
      setShowForm(false);
      setEditingAddress(null);
      router.refresh();
    } catch (error: any) {
      console.error("Critical error saving address:", error);
      alert(error.message || "Failed to save address.");
    } finally {
      setIsLoading(false);
    }
  }
  // 🗑️ Handle Delete
  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this address?")) {
      setIsLoading(true);
      try {
        await deleteCustomerAddress(id);
        router.refresh();
      } catch (error) {
        console.error("Error deleting address:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="bg-white rounded-3 shadow-sm p-4 border mb-4" id="addresses">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold m-0">Delivery Addresses</h4>
        {!showForm && (
          <button 
            className="btn btn-sm btn-outline-success fw-bold"
            onClick={() => { setShowForm(true); setEditingAddress(null); }}
          >
            <i className="icofont-plus me-1"></i> ADD NEW
          </button>
        )}
      </div>

      {/* 🟢 VIEW 1: THE FORM (Add / Edit) */}
      {showForm ? (
        <div className="bg-light p-4 rounded border">
          <h6 className="fw-bold mb-3">{editingAddress ? "Edit Address" : "Add New Address"}</h6>
          <form onSubmit={handleSubmit}>
            {/* Medusa needs the country code, so we hide it in the form! */}
            <input type="hidden" name="country_code" value={countryCode} />
            <input type="hidden" name="address_id" value={editingAddress?.id || ""} />
            
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">First Name</label>
                <input type="text" name="first_name" className="form-control" defaultValue={editingAddress?.first_name || customer.first_name} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">Last Name</label>
                <input type="text" name="last_name" className="form-control" defaultValue={editingAddress?.last_name || customer.last_name} required />
              </div>
              <div className="col-12">
                <label className="form-label small fw-bold text-muted">Street Address</label>
                <input type="text" name="address_1" className="form-control" defaultValue={editingAddress?.address_1} placeholder="123 Main St" required />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">City</label>
                <input type="text" name="city" className="form-control" defaultValue={editingAddress?.city} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">Postal Code</label>
                <input type="text" name="postal_code" className="form-control" defaultValue={editingAddress?.postal_code} required />
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-success fw-bold px-4" disabled={isLoading}>
                {isLoading ? "SAVING..." : "SAVE ADDRESS"}
              </button>
              <button 
                type="button" 
                className="btn btn-light fw-bold px-4 border" 
                onClick={() => { setShowForm(false); setEditingAddress(null); }}
                disabled={isLoading}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 🟢 VIEW 2: THE ADDRESS LIST */
        <div className="row g-3">
          {addresses.length === 0 ? (
            <div className="col-12 text-center py-4">
              <p className="text-muted m-0">You don't have any saved addresses yet.</p>
            </div>
          ) : (
            addresses.map((address: any) => (
              <div key={address.id} className="col-md-6">
                <div className="border rounded p-3 h-100 position-relative">
                  <h6 className="fw-bold">{address.first_name} {address.last_name}</h6>
                  <p className="text-muted small mb-3">
                    {address.address_1}<br />
                    {address.city}, {address.postal_code}
                  </p>
                  
                  <div className="d-flex gap-3">
                    <button 
                      className="btn btn-link text-primary p-0 fw-bold text-decoration-none small"
                      onClick={() => { setEditingAddress(address); setShowForm(true); }}
                      disabled={isLoading}
                    >
                      EDIT
                    </button>
                    <button 
                      className="btn btn-link text-danger p-0 fw-bold text-decoration-none small"
                      onClick={() => handleDelete(address.id)}
                      disabled={isLoading}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}