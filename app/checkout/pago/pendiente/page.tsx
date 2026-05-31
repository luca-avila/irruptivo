import type { Metadata } from "next";

import {
  PaymentResultRoutePage,
  type PaymentResultRoutePageProps
} from "../payment-result-route";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmando pago | Irruptivo",
  description: "Confirmación de pago en proceso para el pedido en Irruptivo.",
  robots: {
    index: false,
    follow: false
  }
};

export default function PaymentPendingPage(props: PaymentResultRoutePageProps) {
  return <PaymentResultRoutePage {...props} />;
}
