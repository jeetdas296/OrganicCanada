"use client"

import React, { useState } from "react"
import { signup } from "@lib/data/customer" // 🟢 Import the native storefront signup!

export default function WholesalePage() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "", 
    taxId: "",
    businessType: "Grocery",
    notes: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_YOUR_KEY"

    try {
      // 1. Prepare the exact data Medusa's native Auth engine expects
      const nativeFormData = new FormData()
      nativeFormData.append("first_name", formData.contactName)
      nativeFormData.append("last_name", "(B2B Applicant)")
      nativeFormData.append("email", formData.email)
      nativeFormData.append("password", formData.password)
      
      // 2. Trigger the native storefront registration
      const signupResponse = await signup(null, nativeFormData)

      // 3. 🛑 STOP IGNORING ERRORS! 
      // If the password is weak or the email is taken, show the real error on the screen!
      if (signupResponse && signupResponse.error) {
        throw new Error(signupResponse.error.message || signupResponse.error)
      }
      if (typeof signupResponse === "string") {
        throw new Error(signupResponse)
      }

      // 4. If signup succeeded, ping our backend to upgrade them to a Wholesale Partner
      const response = await fetch("http://localhost:9000/store/b2b-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        body: JSON.stringify({
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email,
          password: formData.password,
          tax_id: formData.taxId,
          business_type: formData.businessType,
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || "Failed to submit B2B application.")
      }

      setSuccess(true)
    } catch (err: any) {
      console.error("Wholesale application error:", err)
      // 🔴 This will now show the exact password/auth error on your UI!
      setError(err.message || "Something went wrong. Please try again.") 
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            Apply for a B2B Wholesale Account
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Gain access to exclusive pricing, Net-30 purchasing terms, and direct ordering from our network of local farmers.
          </p>
        </div>

        {success ? (
          /* Success State */
          <div className="rounded-md bg-green-50 p-6 text-center border border-green-200">
            <div className="flex justify-center">
              <svg
                className="h-12 w-12 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium text-green-900">
              Application Received!
            </h3>
            <p className="mt-2 text-sm text-green-700">
              Thank you for applying. Our B2B onboarding team is reviewing your business details and will be in touch within 24 to 48 hours to complete your setup.
            </p>
          </div>
        ) : (
          /* Form Section */
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company / Business Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  id="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  name="contactName"
                  id="contactName"
                  required
                  value={formData.contactName}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Business Email *
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password for B2B Account</label>
                <input 
                  type="password" 
                  required 
                  className="w-full mt-1 border border-gray-300 p-2 rounded-md"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
                  Tax ID / Registration Number *
                </label>
                <input
                  type="text"
                  name="taxId"
                  id="taxId"
                  required
                  value={formData.taxId}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                  Business Type *
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes / Link to Website
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Tell us about your business, website link, approximate monthly volume, etc."
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? "Submitting Application..." : "Submit Application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
