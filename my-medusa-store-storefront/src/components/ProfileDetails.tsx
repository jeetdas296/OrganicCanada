"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// We import Medusa's built-in customer update function!
import { updateCustomer, deleteCustomerAccount } from "@lib/data/customer";
import { useParams } from "next/navigation";

export default function ProfileDetails({ customer }: { customer: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { countryCode } = useParams<{ countryCode: string }>();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    // 🛡️ THE FIX: Bundle the actual form fields into an object.
    // Medusa will read these exact fields and update the database!
    const payload = {
      first_name: formData.get("first_name")?.toString() || "",
      last_name: formData.get("last_name")?.toString() || "",
      phone: formData.get("phone")?.toString() || "",
    };

    try {
      // Pass our explicit payload as the first argument!
      const response: any = await updateCustomer(payload);

      // Catch Medusa's hidden Error Objects
      if (response && typeof response === "object" && response.error) {
        alert(`Medusa Error: ${response.error}`);
        setIsLoading(false);
        return;
      }

      // Catch standard string errors
      if (typeof response === "string") {
        alert(`Medusa Error: ${response}`);
        setIsLoading(false);
        return;
      }

      // 🟢 SUCCESS! Close the form and gently ask Next.js to fetch the fresh data
      setIsEditing(false);
      router.refresh();

    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(error.message || "Failed to update profile.");
      setIsLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    const result = await deleteCustomerAccount(countryCode);
    
    if (result && !result.success) {
      alert("Failed to delete account: " + result.error);
      setIsDeleting(false);
    }
    // On success, signout will redirect the user.
  }

  return (
    <div className="bg-white rounded-3 shadow-sm p-4 border mb-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold m-0">Personal Information</h4>
        {!isEditing && (
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-success fw-bold"
              onClick={() => setIsEditing(true)}
            >
              <i className="icofont-edit me-1"></i> EDIT
            </button>
            <button
              className="btn btn-sm btn-outline-danger fw-bold"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              <i className="icofont-trash me-1"></i> {isDeleting ? "DELETING..." : "DELETE"}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        /* 🟢 THE EDIT FORM */
        <form onSubmit={handleSubmit} className="bg-light p-4 rounded border">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted">First Name</label>
              <input type="text" name="first_name" className="form-control" defaultValue={customer?.first_name || ""} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted">Last Name</label>
              <input type="text" name="last_name" className="form-control" defaultValue={customer?.last_name || ""} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted">Email Address</label>
              {/* Email is usually read-only in Medusa to protect the login identity */}
              <input type="email" className="form-control bg-white text-muted" value={customer?.email || ""} disabled />
              <small className="text-muted" style={{ fontSize: "11px" }}>Email cannot be changed.</small>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted">Phone Number</label>
              <input type="tel" name="phone" className="form-control" defaultValue={customer?.phone || ""} placeholder="Add a phone number" />
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-success fw-bold px-4" disabled={isLoading}>
              {isLoading ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <button
              type="button"
              className="btn btn-light fw-bold px-4 border"
              onClick={() => setIsEditing(false)}
              disabled={isLoading}
            >
              CANCEL
            </button>
          </div>
        </form>
      ) : (
        /* 🟢 THE READ-ONLY VIEW */
        <div className="row g-4">
          <div className="col-sm-6">
            <p className="text-muted small fw-bold mb-1">First Name</p>
            <h6 className="fw-medium">{customer?.first_name || "Not provided"}</h6>
          </div>
          <div className="col-sm-6">
            <p className="text-muted small fw-bold mb-1">Last Name</p>
            <h6 className="fw-medium">{customer?.last_name || "Not provided"}</h6>
          </div>
          <div className="col-sm-6">
            <p className="text-muted small fw-bold mb-1">Email Address</p>
            <h6 className="fw-medium">{customer?.email}</h6>
          </div>
          <div className="col-sm-6">
            <p className="text-muted small fw-bold mb-1">Phone Number</p>
            <h6 className="fw-medium">{customer?.phone || "Not provided"}</h6>
          </div>
        </div>
      )}
    </div>
  );
}