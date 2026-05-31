import type { Metadata } from "next";

import {
  PaymentResultRoutePage,
  type PaymentResultRoutePageProps
} from "../payment-result-route";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado del pago | Irruptivo",
  description: "Resultado de pago del pedido en Irruptivo.",
  robots: {
    index: false,
    follow: false
  }
};

export default function PaymentSuccessPage(props: PaymentResultRoutePageProps) {
  return <PaymentResultRoutePage {...props} />;
}
