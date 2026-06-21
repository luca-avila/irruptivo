import { z } from "zod";

import {
  normalizeNullableText,
  normalizeOptionalText
} from "../shared/string-utils";

import {
  DELIVERY_METHODS,
  assertNonNegativeInteger,
  calculateOrderTotal,
  getDeliveryCost,
  getDeliveryMethodLabel,
  type DeliveryMethod,
  type DeliveryMethodLabel
} from "../domain/rules";

export type CheckoutField =
  | "fullName"
  | "email"
  | "phone"
  | "deliveryMethod"
  | "addressLine"
  | "city"
  | "province"
  | "postalCode"
  | "cart";

export type CheckoutValidationErrors = Partial<
  Record<CheckoutField, string[]>
>;

export type CheckoutCartInput = {
  itemCount: number;
  subtotalArs: number;
  canCheckout: boolean;
};

export type CheckoutInput = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  deliveryMethod?: string | null;
  addressLine?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  cart: CheckoutCartInput;
};

export type CheckoutContact = {
  fullName: string;
  email: string;
  phone: string;
};

export type CheckoutShippingAddress = {
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
};

export type CheckoutDelivery = {
  method: DeliveryMethod;
  methodLabel: DeliveryMethodLabel;
  shippingAddress: CheckoutShippingAddress | null;
  notes: string | null;
};

export type ValidatedCheckout = {
  contact: CheckoutContact;
  delivery: CheckoutDelivery;
  summary: CheckoutSummary;
};

export type CheckoutValidationResult =
  | {
      status: "valid";
      checkout: ValidatedCheckout;
      summary: CheckoutSummary;
    }
  | {
      status: "invalid";
      errors: CheckoutValidationErrors;
      summary: CheckoutSummary | null;
    };

export type CheckoutSummaryInput = {
  itemCount: number;
  subtotalArs: number;
  deliveryMethod: DeliveryMethod;
};

export type CheckoutSummary = CheckoutSummaryInput & {
  deliveryMethodLabel: DeliveryMethodLabel;
  deliveryCostArs: number;
  totalArs: number;
};

const rawCheckoutInputSchema = z.object({
  fullName: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  deliveryMethod: z.string().nullish(),
  addressLine: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postalCode: z.string().nullish(),
  notes: z.string().nullish(),
  cart: z.object({
    itemCount: z.number(),
    subtotalArs: z.number(),
    canCheckout: z.boolean()
  })
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCheckoutInput(
  input: CheckoutInput
): CheckoutValidationResult {
  const parsedInput = rawCheckoutInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      status: "invalid",
      errors: {
        cart: ["No pudimos validar el carrito. Volvé al carrito y revisá los productos."]
      },
      summary: null
    };
  }

  const checkoutInput = parsedInput.data;
  const errors: CheckoutValidationErrors = {};
  const fullName = normalizeNullableText(checkoutInput.fullName);
  const email = normalizeEmail(checkoutInput.email);
  const phone = normalizeNullableText(checkoutInput.phone);
  const deliveryMethod = normalizeDeliveryMethod(checkoutInput.deliveryMethod);
  const addressLine = normalizeNullableText(checkoutInput.addressLine);
  const city = normalizeNullableText(checkoutInput.city);
  const province = normalizeNullableText(checkoutInput.province);
  const postalCode = normalizeNullableText(checkoutInput.postalCode);
  const notes = normalizeOptionalText(checkoutInput.notes);

  if (!fullName) {
    addError(errors, "fullName", "Ingresá tu nombre y apellido.");
  }

  if (!email) {
    addError(errors, "email", "Ingresá tu email.");
  } else if (!EMAIL_PATTERN.test(email)) {
    addError(errors, "email", "Ingresá un email válido.");
  }

  if (!phone) {
    addError(errors, "phone", "Ingresá un teléfono.");
  }

  if (!deliveryMethod) {
    addError(errors, "deliveryMethod", "Elegí envío a domicilio o retiro local.");
  }

  if (deliveryMethod === "shipping") {
    if (!addressLine) {
      addError(errors, "addressLine", "Ingresá la dirección de entrega.");
    }

    if (!city) {
      addError(errors, "city", "Ingresá la ciudad.");
    }

    if (!province) {
      addError(errors, "province", "Ingresá la provincia.");
    }

    if (!postalCode) {
      addError(errors, "postalCode", "Ingresá el código postal.");
    }
  }

  const cartError = getCartError(checkoutInput.cart);

  if (cartError) {
    addError(errors, "cart", cartError);
  }

  const summary = deliveryMethod && canBuildSummary(checkoutInput.cart)
    ? buildCheckoutSummary({
        itemCount: checkoutInput.cart.itemCount,
        subtotalArs: checkoutInput.cart.subtotalArs,
        deliveryMethod
      })
    : null;

  if (hasErrors(errors)) {
    return {
      status: "invalid",
      errors,
      summary
    };
  }

  if (!deliveryMethod || !summary) {
    throw new Error("Checkout validation reached an impossible invalid state.");
  }

  return {
    status: "valid",
    checkout: {
      contact: {
        fullName,
        email,
        phone
      },
      delivery: {
        method: deliveryMethod,
        methodLabel: getDeliveryMethodLabel(deliveryMethod),
        shippingAddress:
          deliveryMethod === "shipping"
            ? {
                addressLine,
                city,
                province,
                postalCode
              }
            : null,
        notes
      },
      summary
    },
    summary
  };
}

export function buildCheckoutSummary({
  itemCount,
  subtotalArs,
  deliveryMethod
}: CheckoutSummaryInput): CheckoutSummary {
  assertNonNegativeInteger(itemCount, "itemCount");
  assertNonNegativeInteger(subtotalArs, "subtotalArs");

  const deliveryCostArs = getDeliveryCost(deliveryMethod);

  return {
    itemCount,
    subtotalArs,
    deliveryMethod,
    deliveryMethodLabel: getDeliveryMethodLabel(deliveryMethod),
    deliveryCostArs,
    totalArs: calculateOrderTotal({
      subtotalArs,
      deliveryMethod
    })
  };
}

function normalizeEmail(value: string | null | undefined): string {
  return normalizeNullableText(value).toLocaleLowerCase("es-AR");
}

function normalizeDeliveryMethod(
  value: string | null | undefined
): DeliveryMethod | null {
  const normalizedValue = normalizeNullableText(value);

  return isDeliveryMethod(normalizedValue) ? normalizedValue : null;
}

function isDeliveryMethod(value: string): value is DeliveryMethod {
  return (DELIVERY_METHODS as readonly string[]).includes(value);
}

function getCartError(cart: CheckoutCartInput): string | null {
  if (!Number.isInteger(cart.itemCount) || cart.itemCount < 1) {
    return "Tu carrito está vacío. Agregá productos para continuar.";
  }

  if (!Number.isInteger(cart.subtotalArs) || cart.subtotalArs < 0) {
    return "No pudimos validar el carrito. Volvé al carrito y revisá los productos.";
  }

  if (!cart.canCheckout) {
    return "El carrito tiene productos para corregir antes de pagar.";
  }

  return null;
}

function canBuildSummary(cart: CheckoutCartInput): boolean {
  return (
    cart.canCheckout &&
    Number.isInteger(cart.itemCount) &&
    cart.itemCount > 0 &&
    Number.isInteger(cart.subtotalArs) &&
    cart.subtotalArs >= 0
  );
}

function addError(
  errors: CheckoutValidationErrors,
  field: CheckoutField,
  message: string
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function hasErrors(errors: CheckoutValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
