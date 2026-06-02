import { StorefrontPaymentResultPage } from "../../../src/storefront/components/payment-result-page";
import { expirePendingPaymentOrders } from "../../../src/orders/order-expiration";
import { findOrderForPaymentReturn } from "../../../src/orders/order-store";
import { reconcileMercadoPagoPaymentById } from "../../../src/payments/payment-reconciliation";
import { getPaymentResultView } from "../../../src/payments/payment-result";

export const dynamic = "force-dynamic";

export type PaymentResultRoutePageProps = {
  searchParams?: Promise<{
    order?: string | string[];
    token?: string | string[];
    payment_id?: string | string[];
    collection_id?: string | string[];
  }>;
};

export async function PaymentResultRoutePage({
  searchParams
}: PaymentResultRoutePageProps) {
  const params = await searchParams;

  await expirePendingPaymentOrders();

  // Best-effort: confirm the order as soon as the buyer returns, using only the
  // payment id from Mercado Pago's redirect. The status, order ownership, and
  // amount are verified server-side against the Mercado Pago API, so the
  // redirect params cannot fake a confirmation. The webhook stays as the async
  // backstop, and the order-level paid guard keeps both paths idempotent.
  await reconcilePaymentReturn(
    firstParam(params?.payment_id) ?? firstParam(params?.collection_id)
  );

  const order = await findOrderForPaymentReturn({
    orderId: firstParam(params?.order),
    guestAccessToken: firstParam(params?.token)
  });
  const view = order ? getPaymentResultView(order) : null;

  return <StorefrontPaymentResultPage view={view} />;
}

async function reconcilePaymentReturn(
  paymentId: string | undefined
): Promise<void> {
  if (!paymentId) {
    return;
  }

  try {
    await reconcileMercadoPagoPaymentById(paymentId, {
      config: {
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
        apiBaseUrl: process.env.MERCADO_PAGO_API_BASE_URL
      }
    });
  } catch {
    // If reconciliation fails (e.g. the MP API is unreachable), fall back to
    // showing the order's current status instead of erroring the page.
  }
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
