import { describe, expect, it } from "vitest";

import {
  contactLink,
  getStoredCartItemCount,
  instagramLink,
  storefrontMenuRoutes,
  storefrontTrustRoutes
} from "./navigation";

describe("storefront navigation shell", () => {
  it("exposes only MVP public menu routes", () => {
    expect(storefrontMenuRoutes).toEqual([
      { label: "Colección", href: "/coleccion" },
      { label: "Suplementos", href: "/suplementos" },
      { label: "Nosotros", href: "/nosotros" }
    ]);

    const labels = storefrontMenuRoutes.map((route) => route.label.toLowerCase());

    expect(labels).not.toContain("login");
    expect(labels).not.toContain("registrarse");
    expect(labels).not.toContain("mi cuenta");
  });

  it("exposes trust routes for public navigation", () => {
    expect(storefrontTrustRoutes).toEqual([
      { label: "Envíos y cambios", href: "/envios-y-cambios" }
    ]);
  });

  it("keeps contact and instagram as external public links", () => {
    expect(contactLink).toMatchObject({
      label: "Contacto"
    });
    expect(contactLink.href).toMatch(/^https:\/\//);

    expect(instagramLink).toMatchObject({
      label: "@irruptivo"
    });
    expect(instagramLink.href).toMatch(/^https:\/\//);
  });

  it("counts local cart quantities from the expected cart shape", () => {
    expect(
      getStoredCartItemCount(
        JSON.stringify({
          items: [
            {
              productId: "training-tee",
              variantId: "tee-m",
              sku: "TEE-M",
              quantity: 2,
              priceSnapshotArs: 26000,
              priceSnapshotAt: "2026-05-30T12:00:00.000Z"
            },
            {
              productId: "essential-short",
              variantId: "short-l",
              sku: "SHORT-L",
              quantity: 1,
              priceSnapshotArs: 32000,
              priceSnapshotAt: "2026-05-30T12:00:00.000Z"
            }
          ]
        })
      )
    ).toBe(3);
  });

  it("tolerates absent, malformed, or partial cart state", () => {
    expect(getStoredCartItemCount(null)).toBe(0);
    expect(getStoredCartItemCount("not-json")).toBe(0);
    expect(getStoredCartItemCount(JSON.stringify({ items: [{}] }))).toBe(0);
  });
});
