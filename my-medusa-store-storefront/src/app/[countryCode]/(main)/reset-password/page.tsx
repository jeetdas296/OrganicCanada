"use client";

// 1. 👈 Import 'use' from React
import { useState, use } from "react"; 
import { useRouter, useSearchParams } from "next/navigation";
import { completePasswordReset } from "@lib/data/customer";
import Link from "next/link";

// 2. 👈 Define params as a Promise
export default function ResetPasswordPage(props: { params: Promise<{ countryCode: string }> }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 3. 👈 Unwrap the promise to safely get the countryCode
  const params = use(props.params);
  const countryCode = params.countryCode;

  // 🔍 Grab the secret token and email from the URL
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      setIsLoading(false);
      return;
    }

    if (!token || !email) {
      setError("Invalid or missing reset token. Please request a new link.");
      setIsLoading(false);
      return;
    }

    try {
      const errorMessage = await completePasswordReset(password, token, email);
      
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setIsSuccess(true);
        // Automatically send them to login after 3 seconds
        setTimeout(() => {
          // 4. 👈 Use the unwrapped variable here!
          router.push(`/${countryCode}/login`);
        }, 3000);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-light py-5 min-vh-100 d-flex align-items-center osahan-main-body">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-8 col-sm-10">
            
            <div className="bg-white rounded-4 shadow-sm p-4 p-md-5 border text-center">
              <div 
                className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" 
                style={{ width: "60px", height: "60px", fontSize: "24px" }}
              >
                <i className="bi bi-shield-lock"></i>
              </div>

              <h3 className="fw-bold mb-2">Create New Password</h3>
              <p className="text-muted small mb-4">
                Enter a new, strong password for your account.
              </p>

              {error && <div className="alert alert-danger small py-2 fw-bold">{error}</div>}
              
              {isSuccess ? (
                <div className="alert alert-success py-3 fw-bold">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Password reset successfully! Redirecting to login...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="text-start" suppressHydrationWarning>
                  
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      required 
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      required 
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-success w-100 py-3 fw-bold mb-3" 
                    disabled={isLoading}
                  >
                    {isLoading ? "SAVING..." : "RESET PASSWORD"}
                  </button>
                  
                  {/* 4. 👈 Use the unwrapped variable here too! */}
                  <Link href={`/${countryCode}/login`} className="btn btn-light w-100 fw-bold border">
                     Back to Login
                  </Link>

                </form>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}