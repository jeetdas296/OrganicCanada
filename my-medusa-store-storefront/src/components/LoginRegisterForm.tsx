"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, signup, requestPasswordReset } from "@lib/data/customer";

export default function LoginRegisterForm({ countryCode }: { countryCode: string }) {
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 🟢 1. Create states for email management and rememberMe status
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const router = useRouter();

  // 🟢 2. Check localStorage on component load to pre-fill the email address safely
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    // Explicitly enforce our reactive email state value into the outgoing form payload data
    formData.set("email", email);

    try {
      if (view === "forgot") {
        const errorMsg = await requestPasswordReset(email);
        
        if (errorMsg) {
          setError(errorMsg);
        } else {
          setSuccessMsg("If an account exists with that email, a reset link has been sent.");
          setTimeout(() => setView("login"), 5000); 
        }
      } else if (view === "login") {
        // 🟢 3. Handle rememberMe validation on successful submission pathing
        if (rememberMe) {
          localStorage.setItem("remembered_email", email);
        } else {
          localStorage.removeItem("remembered_email");
        }

        const response = await login(null, formData);
        
        if (typeof response === "string") {
          setError(response);
        } else if (response && response.error) {
          setError(response.error.message || response.error);
        } else {
          router.push(`/${countryCode}/profile`);
          router.refresh();
        }
      } else {
        // Handle Registration
        const response = await signup(null, formData);
        
        if (typeof response === "string") {
          setError(response);
        } else if (response && response.error) {
           setError(response.error.message || response.error);
        } else {
          window.location.href = `/${countryCode}/profile`;
        }
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-4 shadow-sm p-4 p-md-5 border">
      
      {/* TABS */}
      {view !== "forgot" && (
        <ul className="nav nav-pills nav-justified mb-4" role="tablist">
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link fw-bold ${view === "login" ? "active bg-success" : "text-dark"}`} 
              onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }}
              type="button"
            >
              Log In
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link fw-bold ${view === "register" ? "active bg-success" : "text-dark"}`} 
              onClick={() => { setView("register"); setError(""); setSuccessMsg(""); }}
              type="button"
            >
              Register
            </button>
          </li>
        </ul>
      )}

      {/* ALERTS */}
      {error && <div className="alert alert-danger small py-2 fw-bold text-center">{error}</div>}
      {successMsg && <div className="alert alert-success small py-2 fw-bold text-center">{successMsg}</div>}

      {/* FORGOT PASSWORD VIEW */}
      {view === "forgot" && (
        <div className="text-center mb-4">
          <h4 className="fw-bold mb-2">Reset Password</h4>
          <p className="text-muted small">Enter your email address and we'll send you a link to reset your password.</p>
        </div>
      )}

      {/* MASTER FORM */}
      <form onSubmit={handleSubmit}>
        
        {/* Name fields show on Register */}
        {view === "register" && (
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label small fw-bold text-muted">First Name</label>
              <input type="text" name="first_name" className="form-control" required />
            </div>
            <div className="col-6">
              <label className="form-label small fw-bold text-muted">Last Name</label>
              <input type="text" name="last_name" className="form-control" required />
            </div>
          </div>
        )}

        {/* Email Field - Changed to a controlled element linked to the email state */}
        <div className="mb-3">
          <label className="form-label small fw-bold text-muted">Email Address</label>
          <input 
            type="email" 
            name="email" 
            className="form-control" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        {/* Password field hidden on Forgot Password */}
        {view !== "forgot" && (
          <div className="mb-4">
            <label className="form-label small fw-bold text-muted m-0">Password</label>
            <input type="password" name="password" className="form-control" required />
            
            <div className="d-flex justify-content-between align-items-center mt-2">
              {/* Remember Me Checkbox Element */}
              <div className="d-flex align-items-center gap-2">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="form-check-input m-0"
                  style={{ cursor: "pointer" }}
                />
                <label 
                  htmlFor="rememberMe" 
                  className="form-label small fw-bold text-muted m-0"
                  style={{ fontSize: ".9rem", paddingLeft: "2.5px", cursor: "pointer" }}
                >
                  Remember Me
                </label>
              </div>

              {view === "login" && (
                <button 
                  type="button" 
                  className="btn btn-link p-0 text-success text-decoration-none small fw-bold"
                  onClick={() => { setView("forgot"); setError(""); }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Submit Button */}
        <button 
          type="submit" 
          className="btn btn-success w-100 py-3 fw-bold mb-3" 
          disabled={isLoading || !!successMsg}
        >
          {isLoading 
            ? "PLEASE WAIT..." 
            : view === "login" 
              ? "LOG IN" 
              : view === "register" 
                ? "CREATE ACCOUNT" 
                : "SEND RESET LINK"}
        </button>

        {/* Back to Login Button */}
        {view === "forgot" && (
           <button 
             type="button" 
             className="btn btn-light w-100 fw-bold border"
             onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }}
           >
             <i className="bi bi-arrow-left me-2"></i> Back to Login
           </button>
        )}
      </form>
    </div>
  );
}