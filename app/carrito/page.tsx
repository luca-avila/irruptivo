import type { Metadata } from "next";

import { StorefrontCartPage } from "../../src/storefront/components/cart-page";

export const metadata: Metadata = {
  title: "Carrito | Irruptivo",
  description: "Revisión de productos, cantidades y subtotal del carrito."
};

export default function CartPage() {
  return <StorefrontCartPage />;
}
