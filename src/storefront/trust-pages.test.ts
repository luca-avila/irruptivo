import { describe, expect, it } from "vitest";

import { aboutTrustPage, shippingAndExchangeTrustPage } from "./trust-pages";

describe("storefront trust pages", () => {
  it("defines the public Nosotros route with Spanish customer-facing copy", () => {
    expect(aboutTrustPage.route).toBe("/nosotros");
    expect(aboutTrustPage.metadata.title).toBe("Nosotros | Irruptivo");
    expect(aboutTrustPage.links.map((link) => link.label)).toEqual([
      "Escribir por WhatsApp",
      "Ver Instagram",
      "Leer envíos y cambios"
    ]);
  });

  it("defines the public shipping and exchange route with required policy facts", () => {
    expect(shippingAndExchangeTrustPage.route).toBe("/envios-y-cambios");
    expect(shippingAndExchangeTrustPage.metadata.title).toBe(
      "Envíos y cambios | Irruptivo"
    );

    const copy = getPageCopy(shippingAndExchangeTrustPage);

    expect(copy).toContain("Correo Argentino");
    expect(copy).toContain("ARS 5.000");
    expect(copy).toContain("Benavidez/Zona Norte");
    expect(copy).toContain("gratis");
    expect(copy).toContain("pago verificado");
    expect(copy).toContain("7 días");
    expect(copy).toContain("sin uso");
    expect(copy).toContain("condiciones originales");
    expect(copy).toContain("cliente paga los envíos");
    expect(copy).toContain("equivocado o con defecto");
    expect(copy).toContain("Irruptivo cubre");
    expect(copy).toContain("por ley");
    expect(copy).toContain("dueño los apruebe");
  });

  it("does not introduce exaggerated supplement or performance claims", () => {
    const allTrustCopy = [
      getPageCopy(aboutTrustPage),
      getPageCopy(shippingAndExchangeTrustPage)
    ].join(" ");

    expect(allTrustCopy).not.toMatch(
      /garantiz|cura|quema grasa|aumenta masa|mejora el rendimiento/i
    );
  });
});

function getPageCopy(page: {
  title: string;
  lead: string;
  sections: readonly { title: string; body: readonly string[] }[];
}): string {
  return [
    page.title,
    page.lead,
    ...page.sections.flatMap((section) => [section.title, ...section.body])
  ].join(" ");
}
