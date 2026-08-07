"use client"

import { useFormStatus } from "react-dom"
import { useState, useActionState } from "react"
import { changePasswordAction } from "../actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      className="btn btn-success fw-bold px-4 rounded-pill"
      disabled={pending}
    >
      {pending ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Changing Password...
        </>
      ) : (
        "Change Password"
      )}
    </button>
  )
}

export default function ChangePassword({ countryCode }: { countryCode: string }) {
  const [state, formAction] = useActionState(changePasswordAction, null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [clientError, setClientError] = useState("")

  // Client validation
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError("")
    const formData = new FormData(e.currentTarget)
    const new_password = formData.get("new_password") as string
    const confirm_password = formData.get("confirm_password") as string

    if (new_password !== confirm_password) {
      e.preventDefault()
      setClientError("New password and confirm password do not match.")
      return
    }

    if (new_password.length < 8) {
      e.preventDefault()
      setClientError("New password must be at least 8 characters long.")
      return
    }
  }

  return (
    <div className="bg-white rounded-3 shadow-sm p-4 mb-4 border" id="ChangePassword">
      <h5 className="fw-bold mb-4">
        <i className="icofont-lock me-2 text-success"></i> Change Password
      </h5>

      {(clientError || state?.error) && (
        <div className="alert alert-danger shadow-sm py-2 mb-4">
          <i className="icofont-warning me-2"></i>
          {clientError || state?.error}
        </div>
      )}

      {state?.success && (
        <div className="alert alert-success shadow-sm py-2 mb-4">
          <i className="icofont-check-circled me-2"></i>
          Password changed successfully! Redirecting...
        </div>
      )}

      <form action={formAction} onSubmit={handleSubmit}>
        <input type="hidden" name="countryCode" value={countryCode} />

        <div className="mb-3">
          <label className="form-label text-muted small fw-bold">Current Password</label>
          <div className="input-group">
            <input
              type={showCurrent ? "text" : "password"}
              className="form-control"
              name="current_password"
              placeholder="Enter current password"
              required
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
            >
              <i className={`icofont-eye${showCurrent ? "-blocked" : ""}`}></i>
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label text-muted small fw-bold">New Password</label>
          <div className="input-group">
            <input
              type={showNew ? "text" : "password"}
              className="form-control"
              name="new_password"
              placeholder="Enter new password"
              required
              minLength={8}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setShowNew(!showNew)}
            >
              <i className={`icofont-eye${showNew ? "-blocked" : ""}`}></i>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label text-muted small fw-bold">Confirm New Password</label>
          <div className="input-group">
            <input
              type={showConfirm ? "text" : "password"}
              className="form-control"
              name="confirm_password"
              placeholder="Confirm new password"
              required
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              <i className={`icofont-eye${showConfirm ? "-blocked" : ""}`}></i>
            </button>
          </div>
        </div>

        <div className="text-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
