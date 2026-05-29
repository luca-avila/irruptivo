import { contactLink, instagramLink } from "./navigation";

type TrustPageLink = {
  label: string;
  href: string;
  external?: boolean;
};

type TrustPageSection = {
  title: string;
  body: readonly string[];
};

export type TrustPageContent = {
  route: string;
  metadata: {
    title: string;
    description: string;
  };
  eyebrow: string;
  title: string;
  lead: string;
  links: readonly TrustPageLink[];
  sections: readonly TrustPageSection[];
};

export const aboutTrustPage = {
  route: "/nosotros",
  metadata: {
    title: "Nosotros | Irruptivo",
    description:
      "Conocé Irruptivo, una tienda argentina de indumentaria deportiva y selección complementaria de suplementos."
  },
  eyebrow: "Nosotros",
  title: "Una tienda argentina enfocada en ropa deportiva y compra simple.",
  lead:
    "Irruptivo nace como una marca directa: productos claros, atención cercana y una experiencia de compra ordenada para dejar de depender solo de mensajes sueltos.",
  links: [
    { label: "Escribir por WhatsApp", href: contactLink.href, external: true },
    { label: "Ver Instagram", href: instagramLink.href, external: true },
    { label: "Leer envíos y cambios", href: "/envios-y-cambios" }
  ],
  sections: [
    {
      title: "Qué vendemos",
      body: [
        "La colección de indumentaria deportiva es el centro de la tienda. Los suplementos aparecen como una selección complementaria de productos de terceros, sin promesas exageradas ni afirmaciones propias de rendimiento."
      ]
    },
    {
      title: "Cómo atendemos",
      body: [
        "Usamos WhatsApp e Instagram como canales directos para consultas antes o después de comprar. Las compras del sitio se pagan por Mercado Pago y se preparan después de la confirmación del pago."
      ]
    },
    {
      title: "Cómo construimos confianza",
      body: [
        "Mostramos precios, disponibilidad, formas de entrega y condiciones de cambio antes de avanzar. Si necesitás confirmar talle, disponibilidad o retiro local, podés escribir antes de comprar."
      ]
    }
  ]
} as const satisfies TrustPageContent;

export const shippingAndExchangeTrustPage = {
  route: "/envios-y-cambios",
  metadata: {
    title: "Envíos y cambios | Irruptivo",
    description:
      "Información de envíos por Correo Argentino, retiro en Benavidez/Zona Norte, cambios y soporte de Irruptivo."
  },
  eyebrow: "Envíos y cambios",
  title: "Información clara antes de comprar.",
  lead:
    "Estas condiciones resumen el funcionamiento actual de la tienda: envío nacional con costo fijo, retiro local gratis y cambios coordinados por contacto directo.",
  links: [
    { label: "Escribir por WhatsApp", href: contactLink.href, external: true },
    { label: "Ver colección", href: "/coleccion" },
    { label: "Conocer Irruptivo", href: "/nosotros" }
  ],
  sections: [
    {
      title: "Envío a domicilio",
      body: [
        "Enviamos a todo el país por Correo Argentino. El costo fijo de envío es ARS 5.000 por compra.",
        "La preparación del pedido empieza después del pago verificado por Mercado Pago."
      ]
    },
    {
      title: "Retiro local",
      body: [
        "El retiro en Benavidez/Zona Norte es gratis.",
        "Coordinamos el punto y horario por WhatsApp después del pago verificado por Mercado Pago."
      ]
    },
    {
      title: "Cambios",
      body: [
        "Para pedir un cambio, escribinos dentro de los 7 días desde la recepción o retiro del pedido.",
        "El producto debe estar sin uso y en condiciones originales.",
        "En cambios voluntarios, el cliente paga los envíos necesarios. Si enviamos un artículo equivocado o con defecto, Irruptivo cubre los costos de envío del caso.",
        "Los reembolsos se realizan solo cuando corresponda por ley o cuando el dueño los apruebe."
      ]
    },
    {
      title: "Soporte",
      body: [
        "Si tenés dudas sobre talle, disponibilidad, envío, retiro o un inconveniente con suplementos, escribinos por WhatsApp o Instagram para revisarlo caso por caso."
      ]
    }
  ]
} as const satisfies TrustPageContent;
