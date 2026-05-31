import { StorefrontPaymentResultPage } from "../../../src/storefront/components/payment-result-page";
import { findOrderForPaymentReturn } from "../../../src/orders/order-store";
import { getPaymentResultView } from "../../../src/payments/payment-result";

export type PaymentResultRoutePageProps = {
  searchParams?: Promise<{
    order?: string | string[];
    token?: string | string[];
  }>;
};

export async function PaymentResultRoutePage({
  searchParams
}: PaymentResultRoutePageProps) {
  const params = await searchParams;
  const order = findOrderForPaymentReturn({
    orderId: firstParam(params?.order),
    guestAccessToken: firstParam(params?.token)
  });
  const view = order ? getPaymentResultView(order) : null;

  return <StorefrontPaymentResultPage view={view} />;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
