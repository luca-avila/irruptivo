import type { Metadata } from "next";

import {
  PaymentResultRoutePage,
  type PaymentResultRoutePageProps
} from "../payment-result-route";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserva vencida | Irruptivo",
  description: "Reserva de pago vencida para el pedido en Irruptivo.",
  robots: {
    index: false,
    follow: false
  }
};

export default function PaymentExpiredPage(props: PaymentResultRoutePageProps) {
  return <PaymentResultRoutePage {...props} />;
}
