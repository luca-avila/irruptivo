import type { Metadata } from "next";

import {
  PaymentResultRoutePage,
  type PaymentResultRoutePageProps
} from "../payment-result-route";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado del pedido | Irruptivo",
  description: "Estado actual del pago del pedido en Irruptivo.",
  robots: {
    index: false,
    follow: false
  }
};

export default function PaymentStatusPage(props: PaymentResultRoutePageProps) {
  return <PaymentResultRoutePage {...props} />;
}
