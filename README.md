# Irruptivo

Ecommerce fullstack de la marca de ropa deportiva / streetwear **Irruptivo**. Storefront
mobile-first, premium y clothing-first, con checkout de invitado vía Mercado Pago y un panel
de admin para gestionar catálogo, stock, imágenes y pedidos.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL + Prisma 6 · Zod 4 · Tailwind 4
· sharp · Mercado Pago · Vitest. Deploy en VPS vía Docker.

## Desarrollo

```bash
npm install            # instala deps y corre `prisma generate`
npm run dev            # servidor de desarrollo
npm test               # tests de dominio/lógica (vitest)
npm run typecheck      # tsc --noEmit
npx prisma migrate dev # aplica migraciones a la DB local
npx prisma db seed     # datos de demo (prisma/seed.ts)
```

Copiá `.env.example` a `.env` y completá las variables. Necesitás una PostgreSQL corriendo
(o usá `docker-compose up`).

## Documentación

La documentación vive en [`docs/`](./docs/):

- **[`product.md`](./docs/product.md)** — la esencia del proyecto: qué es, posicionamiento,
  modelo comercial, dirección de UX/marca y los non-goals.
- **[`architecture.md`](./docs/architecture.md)** — el sistema como está construido: stack,
  módulos, modelo de datos, flujo de compra, modelo de stock y deploy.
- **[`decisions.md`](./docs/decisions.md)** — log canónico de decisiones de producto y técnicas.
- **[`agent-rules.md`](./docs/agent-rules.md)** — convenciones de código, UX y copy para
  trabajar en el repo.
- **[`wireframes/`](./docs/wireframes/)** — referencia de diseño.
