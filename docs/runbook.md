# Runbook operativo

Procedimientos de operación de la tienda en el VPS: deploy, rollback y resolución de las
fallas más comunes. El **cómo está construido** está en
[`architecture.md`](./architecture.md); acá sólo está el **cómo se opera**.

## Cuándo usar este runbook

- Deploy de una nueva versión de la app.
- Rollback de un deploy problemático.
- Un pago quedó en revisión manual / el webhook de Mercado Pago no llegó.
- Problemas de envío de emails, media o la base de datos en producción.

## Prerequisitos y accesos

- **SSH al VPS** con el usuario que corre Docker, y el `docker-compose.prod.yml` + `.env`
  del proyecto en el directorio de trabajo del VPS.
- **GitHub**: acceso al repo (para ver Actions y editar Variables de repo). Las imágenes se
  publican en `ghcr.io/luca-avila/irruptivo-{app,migrate}`; si los paquetes son privados,
  hacer `docker login ghcr.io` en el VPS antes del pull.
- **Panel de admin** (`/admin`): cola y detalle de pedidos, transiciones de fulfillment,
  reenvío de emails de fulfillment.
- **Dashboard de Mercado Pago**: conciliar pagos dudosos y hacer devoluciones.
- **Dashboard de Resend**: estado del dominio remitente y bounces.
- **Acceso a la DB** (psql dentro del contenedor de Postgres) para diagnóstico de
  `payment_events` / `email_deliveries`.

## Deploy estándar

1. Merge a `main` con CI en verde (typecheck + test + build). El push dispara
   `.github/workflows/deploy.yml`, que buildea y publica dos imágenes:
   `irruptivo-app` (target `runner`) e `irruptivo-migrate` (target `deps`), taggeadas
   `latest` y con el SHA del commit.
2. Esperar el workflow **Build and push images** en verde antes de tocar el VPS.
3. En el VPS:

   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

   `up -d` corre el servicio `migrate` (one-shot, `npx prisma migrate deploy`) y la app
   arranca recién cuando termina con éxito. Correrlo en cada deploy es esperado:
   `migrate deploy` es idempotente si no hay migraciones pendientes.

4. Verificación post-deploy:

   ```bash
   docker compose -f docker-compose.prod.yml ps        # app Up, migrate Exit 0
   docker compose -f docker-compose.prod.yml logs app --tail 50
   curl -fsS http://localhost:3000/ >/dev/null && echo OK
   ```

   Más smoke test manual: home carga con productos, un detalle de producto muestra imagen,
   y el panel de admin lista pedidos (valida DB y sesión).

### Variables de entorno

- El `.env` del VPS es la fuente de secretos (`ADMIN_*`, `MERCADO_PAGO_*`,
  `IRRUPTIVO_EMAIL_*`, `POSTGRES_*`). La app lo lee vía `env_file`; `DATABASE_URL` y
  `IRRUPTIVO_MEDIA_ROOT` se sobreescriben in-network en el compose (no editarlos en `.env`
  esperando efecto en los contenedores).
- `NEXT_PUBLIC_WHATSAPP_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` son **Variables de repo de
  GitHub** horneadas en el build: cambiarlas no requiere tocar el VPS, pero sí re-run del
  workflow (se puede disparar manualmente con `workflow_dispatch`).
- Cambios en `.env` requieren recrear el contenedor de app: `up -d` (no basta restart).

## Rollback

Cada imagen queda taggeada con el SHA del commit que la produjo. Para volver a una versión
puntual:

```bash
IMAGE_TAG=<sha> docker compose -f docker-compose.prod.yml up -d
```

Eso fija tanto `app` como `migrate` al mismo SHA. Sin `IMAGE_TAG`, compose usa `latest`.

**Ojo con la DB**: las migraciones son forward-only (`migrate deploy`). Si el deploy conflictó
una migración nueva, el rollback de la app **no revierte el schema**; verificar que el código
anterior funcione contra el schema actual (en la práctica, las migraciones de este proyecto
son aditivas). Si el schema quedó roto, la salida es una migración nueva, no un rollback.

## Pago en revisión manual

**Síntoma:** un pedido aparece marcado en la cola de pedidos del admin como
"requiere revisión manual". Significa que llegó un evento de pago cuyo pago fue aprobado
pero la orden ya estaba `expired` (pago tardío), o un evento que no se pudo reconciliar
automáticamente. Queda registrado en `payment_events` con
`processingResult = 'manual_review_required'`.

1. Identificar el pedido y los eventos:

   ```sql
   SELECT provider_payment_id, type, action, provider_status, processing_result,
          received_at
   FROM payment_events
   WHERE order_id = '<id del pedido>'
   ORDER BY received_at DESC;
   ```

2. Verificar en el dashboard de Mercado Pago el estado real del pago por su id
   (`providerPaymentId`).
3. Resolver según el caso — **no hay path automático de `expired` → `paid`**:
   - **Pago aprobado y hay stock:** resolver con el comprador (contacto por WhatsApp está en
     el sitio) y decidir: devolver el pago desde MP, o fulfillment manual (crear/mover el
     pedido a estado enviado/retiro desde el admin según corresponda a lo acordado).
   - **Pago rechazado/anulado:** no hay nada que hacer del lado de la app; el pedido sigue
     `expired`.
4. Dejar registro en el propio pedido (editar notas de contacto/fulfillment desde el admin)
   para trazabilidad.

### Red de seguridad: página de retorno

Si el webhook falló pero la orden **no** expiró, todavía hay reconciliación automática: cuando
el comprador aterriza en la página de retorno de MP (`/checkout/pago/*`), la app llama
`reconcileMercadoPagoPaymentById` con el `payment_id` de la URL. Si el comprador avisa por
WhatsApp que pagó y el pedido sigue pendiente, pedirle que entre al link de pago/retorno, o
inspeccionar `payment_events` para ver qué falló.

### Webhook no llega / firma inválida

1. Confirmar en el panel de MP que la notificación apunta a
   `https://<dominio>/api/mercado-pago/webhook` (o lo que diga
   `MERCADO_PAGO_NOTIFICATION_URL`).
2. Verificar `MERCADO_PAGO_WEBHOOK_SECRET` en el `.env` del VPS: una firma inválida responde
   `unverified`. MP reintenta solos un tiempo; si el secret se rotó, actualizar `.env` y
   recrear el contenedor de app.
3. Buscar los eventos del pago en `payment_events` para ver si llegaron y con qué
   `processingResult`.

## Emails

- El adaptador de producción es **Resend** (`IRRUPTIVO_EMAIL_PROVIDER=resend` + token +
  remitente). Si el provider quedó mal configurado, el envío falla sin romper el checkout
  (`sendEmailSafely` captura) y el estado queda en `email_deliveries`.
- Diagnóstico:

  ```sql
  SELECT kind, status, attempted_at, error_message
  FROM email_deliveries
  ORDER BY attempted_at DESC
  LIMIT 20;
  ```

- **Emails de fulfillment** (`shipped` / `ready_for_pickup`): se pueden reenviar manualmente
  desde el detalle del pedido en el admin (`resendFulfillmentUpdateEmail`). Son idempotentes
  vía `EmailDelivery`, así que el reenvío genera una nueva entrega.
- Pendiente conocido: verificar el dominio remitente en Resend (SPF/DKIM); si no, los emails
  caen en spam o fallan (ver `architecture.md`).

## Media y backups

- Las imágenes viven en el volumen `media_data` (`/var/lib/irruptivo/media` en el contenedor)
  y sobreviven a redeploys. Si las imágenes desaparecen tras un deploy, chequear que el
  volumen siga montado (`docker compose -f docker-compose.prod.yml volume ls`).
- **No hay automatización de backups** (ni DB ni media): es tarea humana pendiente.
  Mínimo recomendado: dump periódico del volumen de Postgres
  (`docker compose -f docker-compose.prod.yml exec postgres pg_dump -U <user> <db> > backup.sql`)
  y backup del volumen de media fuera del VPS.

## Escalación

Proyecto operado por una sola persona. Escalación externa según el dominio del problema:

- **Pagos:** soporte de Mercado Pago (con `providerPaymentId` y timestamps de
  `payment_events` a mano).
- **Emails:** soporte de Resend (con ids de `email_deliveries`).
- **Infra/VPS:** el proveedor del VPS (con la salida de `docker compose ps` / `logs`).
