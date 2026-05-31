import type { Metadata } from "next";

import { StorefrontGuestOrderStatusPage } from "../../src/storefront/components/guest-order-status-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado del pedido | Irruptivo",
  description: "Consulta privada del estado de un pedido invitado.",
  robots: {
    index: false,
    follow: false
  }
};

export default function MissingGuestOrderStatusTokenRoute() {
  return <StorefrontGuestOrderStatusPage order={null} />;
}
