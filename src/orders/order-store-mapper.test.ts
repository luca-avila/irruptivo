import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { mapOrderRecordToOrder, type OrderRecordWithItems } from "./order-store";

describe("order database row mapper", () => {
  it("maps shipping orders, payment preferences, item snapshots, and typed statuses", () => {
    const order = mapOrderRecordToOrder(
      getOrderRecord({
        status: ORDER_STATUS.paid,
        paymentPreference: {
          id: "payment-preference-001",
          orderId: "order-001",
          preferenceId: "pref-123",
          checkoutUrl: "https://checkout.test/pref-123",
          createdAt: new Date("2026-05-30T12:05:00.000Z")
        }
      })
    );

    expect(order).toMatchObject({
      id: "order-001",
      status: ORDER_STATUS.paid,
      delivery: {
        method: DELIVERY_METHOD.shipping,
        shippingAddress: {
          addressLine: "Av. Siempre Viva 742",
          city: "Benavidez",
          province: "Buenos Aires",
          postalCode: "1621"
        }
      },
      items: [
        {
          productId: "training-tee",
          productArea: "clothing",
          variantId: "tee-black-s",
          options: {
            color: "Negro",
            size: "S"
          },
          optionSummary: "Negro / S",
          quantity: 2,
          unitPriceArs: 26000,
          lineTotalArs: 52000
        }
      ],
      paymentPreference: {
        preferenceId: "pref-123",
        checkoutUrl: "https://checkout.test/pref-123",
        createdAt: "2026-05-30T12:05:00.000Z"
      }
    });
  });

  it("maps pickup orders with null shipping address and null payment preference", () => {
    const order = mapOrderRecordToOrder(
      getOrderRecord({
        deliveryMethod: DELIVERY_METHOD.pickup,
        deliveryMethodLabel: "Retiro local",
        shipAddressLine: null,
        shipCity: null,
        shipProvince: null,
        shipPostalCode: null
      })
    );

    expect(order).toMatchObject({
      status: ORDER_STATUS.pendingPayment,
      delivery: {
        method: DELIVERY_METHOD.pickup,
        methodLabel: "Retiro local",
        shippingAddress: null
      },
      paymentPreference: null
    });
  });
});

function getOrderRecord(
  overrides: Partial<OrderRecordWithItems> = {}
): OrderRecordWithItems {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    guestAccessToken: "guest-token",
    idempotencyKey: "checkout-submit-001",
    status: ORDER_STATUS.pendingPayment,
    createdAt: new Date("2026-05-30T12:00:00.000Z"),
    contactFullName: "Luca Irruptivo",
    contactEmail: "luca@example.com",
    contactPhone: "11 5555 5555",
    deliveryMethod: DELIVERY_METHOD.shipping,
    deliveryMethodLabel: "Envío a domicilio",
    deliveryNotes: "Tocar timbre",
    shipAddressLine: "Av. Siempre Viva 742",
    shipCity: "Benavidez",
    shipProvince: "Buenos Aires",
    shipPostalCode: "1621",
    adminNotes: null,
    subtotalArs: 52000,
    deliveryCostArs: 5000,
    totalArs: 57000,
    paymentPreference: null,
    items: [
      {
        id: "order-item-001",
        orderId: "order-001",
        productId: "training-tee",
        productName: "Training Tee Negra",
        productSlug: "training-tee-negra",
        productArea: "clothing",
        variantId: "tee-black-s",
        variantName: "Negro / S",
        sku: "TEE-BLK-S",
        optionColor: "Negro",
        optionSize: "S",
        optionFlavor: null,
        optionWeight: null,
        optionPresentation: null,
        optionSummary: "Negro / S",
        quantity: 2,
        unitPriceArs: 26000,
        lineTotalArs: 52000
      }
    ],
    ...overrides
  } as OrderRecordWithItems;
}
