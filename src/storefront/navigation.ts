export const CART_STORAGE_KEY = "irruptivo.cart";

export type StorefrontRoute = {
  label: string;
  href: string;
};

export type ExternalStorefrontLink = {
  label: string;
  href: string;
};

export const storefrontMenuRoutes = [
  { label: "Colección", href: "/coleccion" },
  { label: "Suplementos", href: "/suplementos" },
  { label: "Nosotros", href: "/nosotros" }
] as const satisfies readonly StorefrontRoute[];

export const storefrontTrustRoutes = [
  { label: "Envíos y cambios", href: "/envios-y-cambios" }
] as const satisfies readonly StorefrontRoute[];

export const contactLink = {
  label: "Contacto",
  href: process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://wa.me/5490000000000"
} as const satisfies ExternalStorefrontLink;

export const instagramLink = {
  label: "@irruptivo",
  href: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com/irruptivo"
} as const satisfies ExternalStorefrontLink;

export const searchRoute = {
  label: "Buscar",
  href: "/buscar"
} as const satisfies StorefrontRoute;

export const cartRoute = {
  label: "Carrito",
  href: "/carrito"
} as const satisfies StorefrontRoute;

export function getStoredCartItemCount(rawCart: string | null): number {
  if (!rawCart) {
    return 0;
  }

  try {
    const parsedCart: unknown = JSON.parse(rawCart);
    const items = getCartItems(parsedCart);
    let count = 0;

    for (const item of items) {
      count += getCartItemQuantity(item);
    }

    return count;
  } catch {
    return 0;
  }
}

function getCartItems(parsedCart: unknown): unknown[] {
  if (Array.isArray(parsedCart)) {
    return parsedCart;
  }

  if (
    parsedCart &&
    typeof parsedCart === "object" &&
    "items" in parsedCart &&
    Array.isArray(parsedCart.items)
  ) {
    return parsedCart.items;
  }

  return [];
}

function getCartItemQuantity(item: unknown): number {
  if (!item || typeof item !== "object" || !("quantity" in item)) {
    return 0;
  }

  const quantity = item.quantity;

  return typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0
    ? quantity
    : 0;
}
