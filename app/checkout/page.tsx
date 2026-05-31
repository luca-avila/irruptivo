import type { Metadata } from "next";

import { StorefrontCheckoutPage } from "../../src/storefront/components/checkout-page";

export const metadata: Metadata = {
  title: "Compra | Irruptivo",
  description: "Compra invitada con datos de contacto, entrega y resumen del pedido."
};

export default function CheckoutPage() {
  return <StorefrontCheckoutPage />;
}
