import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD } from "../domain/rules";
import {
  buildCheckoutSummary,
  validateCheckoutInput,
  type CheckoutValidationResult
} from "./checkout";

const validCart = {
  itemCount: 2,
  subtotalArs: 58000,
  canCheckout: true,
  hasBlockingIssues: false
};

const validShippingInput = {
  fullName: "Luca Irruptivo",
  email: "luca@example.com",
  phone: "11 5555 5555",
  deliveryMethod: DELIVERY_METHOD.shipping,
  addressLine: "Av. Siempre Viva 742",
  city: "Benavidez",
  province: "Buenos Aires",
  postalCode: "1621",
  notes: "Tocar timbre",
  cart: validCart
};

describe("checkout validation", () => {
  it("requires full name, email, phone, and delivery method", () => {
    const result = validateCheckoutInput({
      fullName: " ",
      email: "",
      phone: "",
      deliveryMethod: "",
      cart: validCart
    });

    const invalidResult = expectInvalidCheckout(result);

    expect(invalidResult.errors).toMatchObject({
      fullName: ["Ingresá tu nombre y apellido."],
      email: ["Ingresá tu email."],
      phone: ["Ingresá un teléfono."],
      deliveryMethod: ["Elegí envío a domicilio o retiro local."]
    });
  });

  it("requires shipping address fields for home delivery", () => {
    const result = validateCheckoutInput({
      ...validShippingInput,
      addressLine: "",
      city: "",
      province: "",
      postalCode: ""
    });

    const invalidResult = expectInvalidCheckout(result);

    expect(invalidResult.errors).toMatchObject({
      addressLine: ["Ingresá la dirección de entrega."],
      city: ["Ingresá la ciudad."],
      province: ["Ingresá la provincia."],
      postalCode: ["Ingresá el código postal."]
    });
  });

  it("does not require shipping address fields for pickup", () => {
    const result = validateCheckoutInput({
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555",
      deliveryMethod: DELIVERY_METHOD.pickup,
      addressLine: "",
      city: "",
      province: "",
      postalCode: "",
      notes: "Paso por la tarde",
      cart: validCart
    });

    expect(result).toMatchObject({
      status: "valid",
      checkout: {
        delivery: {
          method: DELIVERY_METHOD.pickup,
          methodLabel: "Retiro local",
          shippingAddress: null,
          notes: "Paso por la tarde"
        }
      }
    });
  });

  it("blocks checkout when the refreshed cart is invalid", () => {
    const result = validateCheckoutInput({
      ...validShippingInput,
      cart: {
        itemCount: 1,
        subtotalArs: 26000,
        canCheckout: false,
        hasBlockingIssues: true
      }
    });

    const invalidResult = expectInvalidCheckout(result);

    expect(invalidResult.errors).toMatchObject({
      cart: ["El carrito tiene productos para corregir antes de pagar."]
    });
  });

  it("accepts a valid shipping payload with normalized contact and address data", () => {
    const result = validateCheckoutInput({
      ...validShippingInput,
      fullName: "  Luca Irruptivo  ",
      email: "  LUCA@EXAMPLE.COM ",
      phone: "  11 5555 5555 "
    });

    expect(result).toMatchObject({
      status: "valid",
      checkout: {
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
        }
      }
    });
  });
});

function expectInvalidCheckout(
  result: CheckoutValidationResult
): Extract<CheckoutValidationResult, { status: "invalid" }> {
  expect(result.status).toBe("invalid");

  if (result.status !== "invalid") {
    throw new Error("Expected checkout validation to fail.");
  }

  return result;
}

describe("checkout summary", () => {
  it("adds ARS 5.000 to the total for shipping", () => {
    expect(
      buildCheckoutSummary({
        itemCount: 2,
        subtotalArs: 58000,
        deliveryMethod: DELIVERY_METHOD.shipping
      })
    ).toEqual({
      itemCount: 2,
      subtotalArs: 58000,
      deliveryMethod: DELIVERY_METHOD.shipping,
      deliveryMethodLabel: "Envío a domicilio",
      deliveryCostArs: 5000,
      totalArs: 63000
    });
  });

  it("adds ARS 0 to the total for pickup", () => {
    expect(
      buildCheckoutSummary({
        itemCount: 2,
        subtotalArs: 58000,
        deliveryMethod: DELIVERY_METHOD.pickup
      })
    ).toEqual({
      itemCount: 2,
      subtotalArs: 58000,
      deliveryMethod: DELIVERY_METHOD.pickup,
      deliveryMethodLabel: "Retiro local",
      deliveryCostArs: 0,
      totalArs: 58000
    });
  });
});
