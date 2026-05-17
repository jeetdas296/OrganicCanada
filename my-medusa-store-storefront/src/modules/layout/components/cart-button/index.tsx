import { retrieveCart } from "@lib/data/cart"
import CartDropdown from "@modules/layout/components/cart-dropdown"

export default async function CartButton() {
  const cart = await retrieveCart()
  
  // We just fetch the cart from the server and hand it straight to Medusa's native dropdown component!
  return <CartDropdown cart={cart} />
}