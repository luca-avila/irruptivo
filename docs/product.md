# Producto — Irruptivo

> La esencia durable del proyecto: qué es, para quién, cómo se posiciona y qué
> deliberadamente **no** hace. Si una decisión de producto o diseño contradice este
> documento, eso es una señal de alerta. El "por qué" detallado de cada decisión vive en
> [`decisions.md`](./decisions.md); el sistema como está construido, en
> [`architecture.md`](./architecture.md).

## Qué es

Irruptivo es una marca real de ropa deportiva / streetwear con identidad visual minimal,
premium y agresiva. Este proyecto es su ecommerce: un storefront mobile-first que traduce
la identidad de marca en una experiencia de compra clara y soporta compras reales, sin
sobre-construir una plataforma de ecommerce madura demasiado pronto.

El objetivo no es optimización de conversión avanzada. El objetivo es un storefront
**creíble, premium y coherente con la marca** que convierta la atención temprana
(Instagram, ads, boca a boca) en intención de compra, y que saque a la marca del flujo
informal de venta por WhatsApp.

## Posicionamiento

- **Clothing-first.** La ropa/sportswear lidera la identidad de marca.
- **Suplementos como soporte.** Son productos de terceros revendidos/curados por Irruptivo.
  Deben ser fáciles de encontrar y comprar, sin hacer que el sitio se sienta como un
  supermercado genérico de suplementos.
- El storefront debe sentirse: premium, minimal, atlético, directo, confiable,
  product-focused, profesional sin ser distante.

## Para quién

- **Clientes:** adultos jóvenes (~20-35), fitness-oriented, mobile-heavy, en Argentina,
  que descubren la marca por Instagram, ads, boca a boca o links directos.
- **Dueño / admin:** necesita un storefront profesional, control sobre la percepción de
  marca, y herramientas de admin para productos, variantes, stock, imágenes y pedidos —
  sin editar la base de datos a mano.

## Modelo comercial (MVP)

- Pedidos solo en Argentina.
- Pago con Mercado Pago.
- Checkout como invitado (sin autenticación de cliente).
- Carrito en LocalStorage.
- Envío nacional (Correo Argentino) con tarifa fija de ARS 5.000.
- Retiro local gratuito en Benavidez / Zona Norte, coordinado por WhatsApp luego del pago.
- Fulfillment manual por el dueño/admin.
- Email de confirmación tras pago verificado.
- Link seguro de estado de pedido para invitados.

## Tensión central de producto

El sitio balancea tres fuerzas que pueden tirar en direcciones opuestas:

1. **Branding premium fuerte** — minimal, agresivo, visualmente distintivo.
2. **Usabilidad clara de ecommerce** — la información esencial de compra no se puede ocultar.
3. **Simplicidad operativa** — fulfillment manual, sin complejidad prematura.

El minimalismo no es un fin en sí mismo. Siempre deben quedar claros: precio, variante,
disponibilidad, imágenes, descripción, expectativa de envío/retiro, expectativa de pago,
información de cambios, acción de compra y vía de contacto.

## Dirección de UX y marca

- **Mobile-first**, baja densidad visual, jerarquía de producto fuerte.
- Base neutra/minimal, mucho whitespace, acentos oscuros para contraste, fotografía de
  producto grande, tipografía con jerarquía clara.
- Tono: minimal, directo, premium, atlético, confiado, limpio.
- Evitar sentirse: corporativo, frío, llamativo, sobrediseñado, barato, genérico, o como
  un marketplace de suplementos.
- Referencia de dirección (no a copiar): ecommerce fitness moderno estilo Gymshark.
- **Copy en español de Argentina (`es-AR`)** para todo lo customer-facing y admin. Nunca
  exponer valores internos de enum/estado (`pending_payment`, `paid`, etc.) al usuario —
  mapearlos siempre por los helpers de label (ver [`agent-rules.md`](./agent-rules.md) y
  `src/domain/rules.ts`).
- Estados claros de loading / error / empty en toda la experiencia.

## Non-goals (lo que el MVP deliberadamente NO hace)

Estos límites son intencionales. Agregar cualquiera de estos sin una decisión explícita es
scope creep:

- Cuentas de cliente, historial de pedidos, carritos autenticados o direcciones guardadas.
- OAuth / "olvidé mi contraseña" / claiming de pedidos de invitado.
- Promociones complejas, cupones, loyalty, wishlist, reviews, recomendaciones.
- Cálculo dinámico de envío; tracking de envíos o integración con la API de Correo Argentino.
- Gestión de reembolsos / cancelaciones.
- **Sistema de reserva/hold de stock** (ver [`architecture.md`](./architecture.md) para el
  modelo de stock real: decremento al confirmarse el pago).
- CMS complejo; abstracciones de backend genéricas antes de validar el flujo de compra core.
- Priorizar desktop sobre mobile; tratar la conversión como el problema principal antes de
  tener tráfico suficiente.

## Qué significa éxito

- Un visitante nuevo entiende rápido qué vende Irruptivo, y la ropa se siente central.
- Los suplementos son accesibles sin diluir el posicionamiento clothing-first.
- La experiencia mobile se siente moderna, rápida y limpia; los grids son fáciles de escanear.
- Las páginas de producto explican con claridad precio, variantes, disponibilidad, envío,
  retiro y cambios.
- Se puede comprar sin login, completando checkout como invitado vía Mercado Pago.
- El cliente recibe estados de pago claros, email de confirmación y acceso a estado de pedido.
- El admin gestiona productos, variantes, stock, imágenes y pedidos sin tocar la base de datos.
- La marca se siente más profesional que un flujo de venta solo por WhatsApp.

## Restricciones de contexto

- Desarrollo en paralelo con trabajo full-time → iteración rápida, vertical slices chicos.
- Presupuesto limitado → uso selectivo de herramientas pagas; evitar servicios de terceros
  hasta que sean claramente útiles.
- Web mobile-first, fullstack Next.js, PostgreSQL + Prisma, Mercado Pago, deploy en VPS con
  almacenamiento de imágenes en filesystem persistente.
