import { retrieveCart } from "@lib/data/cart";
import CartActions from "./CartActions";

export default async function CartPage() {
  const cart = await retrieveCart();

  if (!cart || cart.items.length === 0) {
    return <div className="container py-5 text-center"><h1>Your cart is empty</h1></div>;
  }

  return (
    <div className="bg-light py-5">
      <div className="container">
        <h2 className="fw-bold mb-4">Review Your Cart</h2>
        <CartActions cart={cart} />
      </div>
    </div>
  );
}