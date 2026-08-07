"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, removeAuthToken, removeCartId, getCacheTag } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export async function changePasswordAction(
  currentState: any,
  formData: FormData
) {
  const current_password = formData.get("current_password") as string
  const new_password = formData.get("new_password") as string
  const confirm_password = formData.get("confirm_password") as string
  const countryCode = formData.get("countryCode") as string

  try {
    const headers = await getAuthHeaders()

    const response = await sdk.client.fetch<any>(`/store/account/change-password`, {
      method: "POST",
      headers,
      body: {
        current_password,
        new_password,
        confirm_password,
      },
    })

    if (response.success) {
      // Manually logout so we can redirect with a custom message
      await sdk.auth.logout().catch(() => {})
      await removeAuthToken()
      
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      
      await removeCartId()
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      redirect(`/${countryCode}/login?message=Your+password+has+been+changed+successfully.+Please+sign+in+using+your+new+password.`)
    } else {
      return { success: false, error: response.message || "An error occurred." }
    }
  } catch (error: any) {
    console.error("Change password error:", error.message || error)
    
    // If it's a NEXT_REDIRECT, we must throw it so Next.js handles the redirect properly
    if (error.message === "NEXT_REDIRECT") {
      throw error
    }

    const message = error?.message || error?.response?.data?.message || "Failed to change password."
    return { success: false, error: message }
  }
}
