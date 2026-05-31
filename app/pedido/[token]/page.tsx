import type { Metadata } from "next";

import { expirePendingPaymentOrders } from "../../../src/orders/order-expiration";
import { getGuestOrderStatusByToken } from "../../../src/orders/guest-order-status";
import { StorefrontGuestOrderStatusPage } from "../../../src/storefront/components/guest-order-status-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado del pedido | Irruptivo",
  description: "Consulta privada del estado de un pedido invitado.",
  robots: {
    index: false,
    follow: false
  }
};

type GuestOrderStatusRouteProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function GuestOrderStatusRoute({
  params
}: GuestOrderStatusRouteProps) {
  const { token } = await params;

  expirePendingPaymentOrders();

  const order = getGuestOrderStatusByToken(token);

  return <StorefrontGuestOrderStatusPage order={order} />;
}
