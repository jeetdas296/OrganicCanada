"use client"

import { useState } from "react"

export default function SellWithUsPage() {
  // 1. Add password to your state
  const [formData, setFormData] = useState({ farm_name: "", email: "", password: "" })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      // 🟢 NEW: Step A - Register their password with Medusa's native secure Auth system!
      const authResponse = await fetch("http://localhost:9000/auth/user/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        }),
      })

      if (!authResponse.ok) throw new Error("Could not create secure login.")

      // 🟢 Step B - Now fire our custom workflow to build the farm!
      const response = await fetch("http://localhost:9000/store/vendor-register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_YOUR_KEY_HERE"
        },
        // We no longer need to send the password to our custom backend, Medusa already safely stored it!
        body: JSON.stringify({ email: formData.email, farm_name: formData.farm_name }),
      })

      if (!response.ok) throw new Error("Registration failed")
      
      setStatus("success")
    } catch (err) {
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-green-50 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-green-800 mb-4">Application Received! 🌾</h2>
        <p className="text-green-700">
          Thank you for applying to sell with us. Our team will review your application and send you an email with your Admin Dashboard login details shortly!
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border border-gray-200 rounded-lg shadow-sm">
      <h1 className="text-3xl font-bold mb-2">Become a Vendor</h1>
      <p className="text-gray-600 mb-8">Join our multi-tenant marketplace and start selling your farm-fresh goods directly to B2B and B2C buyers.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Farm / Business Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            placeholder="e.g., Sunnybrook Farm"
            value={formData.farm_name}
            onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email Address</label>
          <input
            type="email"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            placeholder="bob@sunnybrook.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
          <input
            type="password"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {status === "loading" ? "Submitting..." : "Apply to Sell"}
        </button>

        {status === "error" && (
          <p className="text-red-600 text-sm mt-2 text-center">Something went wrong. Please try again.</p>
        )}
      </form>
    </div>
  )
}