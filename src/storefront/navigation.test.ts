import { describe, expect, it } from "vitest";

import {
  contactLink,
  getStoredCartItemCount,
  instagramLink,
  storefrontMenuRoutes
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
            { variantId: "tee-m", quantity: 2 },
            { variantId: "short-l", quantity: 1 }
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
