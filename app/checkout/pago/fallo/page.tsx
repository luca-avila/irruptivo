import type { Metadata } from "next";

import {
  PaymentResultRoutePage,
  type PaymentResultRoutePageProps
} from "../payment-result-route";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pago no completado | Irruptivo",
  description: "Estado del pago no completado del pedido en Irruptivo.",
  robots: {
    index: false,
    follow: false
  }
};

export default function PaymentFailurePage(props: PaymentResultRoutePageProps) {
  return <PaymentResultRoutePage {...props} />;
}
