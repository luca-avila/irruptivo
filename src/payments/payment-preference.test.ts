import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { type PendingOrder } from "../orders/order-creation";
import {
  createPaymentPreferenceForOrder,
  type MercadoPagoPreferenceRequest,
  type PaymentPreferenceProvider
} from "./payment-preference";

const now = "2026-05-30T12:00:00.000Z";

describe("Mercado Pago payment preference", () => {
  it("maps a pending order to a Mercado Pago payload using snapshotted items and the order total", async () => {
    const requests: MercadoPagoPreferenceRequest[] = [];
    const provider: PaymentPreferenceProvider = async (request) => {
      requests.push(request);

      return {
        preferenceId: "pref-123",
        initPoint: "https://www.mercadopago.com.ar/init/pref-123",
        sandboxInitPoint: "https://sandbox.mercadopago.com.ar/init/pref-123"
      };
    };

    const result = await createPaymentPreferenceForOrder(getPendingOrder(), {
      config: {
        accessToken: "TEST-123",
        appUrl: "https://irruptivo.test"
      },
      provider,
      now
    });

    expect(result).toMatchObject({
      status: "created",
      preference: {
        provider: "mercado_pago",
        preferenceId: "pref-123",
        checkoutUrl: "https://sandbox.mercadopago.com.ar/init/pref-123",
        initPoint: "https://www.mercadopago.com.ar/init/pref-123",
        sandboxInitPoint: "https://sandbox.mercadopago.com.ar/init/pref-123",
        externalReference: "order-001",
        createdAt: now
      }
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].items).toEqual([
      {
        id: "tee-black-s",
        title: "Training Tee Negra - Negro / S",
        description: "SKU TEE-BLK-S",
        quantity: 2,
        currency_id: "ARS",
        unit_price: 26000
      },
      {
        id: "creatina-300g",
        title: "Creatina Monohidrato 300 g - 300 g",
        description: "SKU CREATINA-300G",
        quantity: 1,
        currency_id: "ARS",
        unit_price: 29900
      },
      {
        id: "delivery-shipping",
        title: "Entrega - Envío a domicilio",
        description: "Costo de entrega del pedido IRR-000001",
        quantity: 1,
        currency_id: "ARS",
        unit_price: 5000
      }
    ]);
    expect(getPreferenceItemsTotal(requests[0])).toBe(86900);
  });

  it("includes order metadata, external reference, and return URLs without mutating order status", async () => {
    const order = getPendingOrder();
    let request: MercadoPagoPreferenceRequest | null = null;
    const provider: PaymentPreferenceProvider = async (nextRequest) => {
      request = nextRequest;

      return {
        preferenceId: "pref-456",
        initPoint: "https://www.mercadopago.com.ar/init/pref-456",
        sandboxInitPoint: null
      };
    };

    await createPaymentPreferenceForOrder(order, {
      config: {
        accessToken: "APP_USR-123",
        appUrl: "https://irruptivo.test"
      },
      provider,
      now
    });

    expect(request).toMatchObject({
      external_reference: "order-001",
      metadata: {
        internal_order_id: "order-001",
        order_number: "IRR-000001"
      },
      back_urls: {
        success: "https://irruptivo.test/checkout/pago/exito?order=order-001",
        failure: "https://irruptivo.test/checkout/pago/fallo?order=order-001",
        pending: "https://irruptivo.test/checkout/pago/pendiente?order=order-001"
      },
      auto_return: "approved"
    });
    expect(order.status).toBe(ORDER_STATUS.pendingPayment);
  });
});

function getPreferenceItemsTotal(request: MercadoPagoPreferenceRequest): number {
  return request.items.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0
  );
}

function getPendingOrder(): PendingOrder {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    status: ORDER_STATUS.pendingPayment,
    createdAt: now,
    guestAccessToken: "guest-access-token",
    contact: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555"
    },
    delivery: {
      method: DELIVERY_METHOD.shipping,
      methodLabel: "Envío a domicilio",
      shippingAddress: {
        addressLine: "Av. Siempre Viva 742",
        city: "Benavidez",
        province: "Buenos Aires",
        postalCode: "1621"
      },
      notes: "Tocar timbre"
    },
    items: [
      {
        productId: "training-tee",
        productName: "Training Tee Negra",
        productSlug: "training-tee-negra",
        productArea: "clothing",
        variantId: "tee-black-s",
        variantName: "Negro / S",
        sku: "TEE-BLK-S",
        options: {
          color: "Negro",
          size: "S"
        },
        optionSummary: "Negro / S",
        quantity: 2,
        unitPriceArs: 26000,
        lineTotalArs: 52000
      },
      {
        productId: "creatina",
        productName: "Creatina Monohidrato 300 g",
        productSlug: "creatina-monohidrato-300g",
        productArea: "supplement",
        variantId: "creatina-300g",
        variantName: "300 g",
        sku: "CREATINA-300G",
        options: {
          weight: "300 g"
        },
        optionSummary: "300 g",
        quantity: 1,
        unitPriceArs: 29900,
        lineTotalArs: 29900
      }
    ],
    subtotalArs: 81900,
    deliveryCostArs: 5000,
    totalArs: 86900,
    paymentPreference: null
  };
}
