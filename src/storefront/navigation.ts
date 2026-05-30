import { getCartCount, hydrateCart } from "../cart/cart";

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
  return getCartCount(hydrateCart(rawCart));
}
