# Handoff: emails de compra no llegan (Resend)

Estado al 2026-06-03 ~00:45. Retomar desde acá.

## Síntoma

Tras una compra pagada, NO llegan los emails (ni al comprador ni al admin).

## Diagnóstico hasta ahora

La tabla `email_deliveries` (fuente de verdad por intento de envío) en el VPS mostró:

| kind | status | recipient | error | cuándo |
|---|---|---|---|---|
| admin_notification | **failed** | avilaluca61@gmail.com | "No pudimos enviar el email transaccional con Resend." | 2026-06-03 00:39 |
| buyer_confirmation | **failed** | lucaa.136a@gmail.com | "No pudimos enviar el email transaccional con Resend." | 2026-06-03 00:39 |
| buyer_confirmation | configuration_missing | lucaa.136a@gmail.com | faltaban las env vars | 2026-06-02 21:31 |

Pedidos: `IRR-20260603-96B2FA23` está `paid` (00:38) → la reconciliación a `paid` SÍ dispara el envío.

Conclusiones:
- El `configuration_missing` de las 21:31 ya está resuelto: las env vars de Resend ahora están cargadas en el `.env` del VPS (`docker compose exec app env | grep IRRUPTIVO_EMAIL` = OK).
- El pedido llega a `paid` correctamente y el flujo intenta ambos emails.
- **El problema actual: Resend RECHAZA el envío** (response no-ok) → status `failed`.
- El adaptador hoy **descarta el error real de Resend** y guarda un texto genérico, por eso no sabemos el motivo exacto todavía.

## Próximo paso inmediato (correr en el VPS)

Sacar el error real de Resend con las credenciales del contenedor (la imagen slim NO trae curl, por eso node):

```bash
docker compose exec app node -e '
const token = process.env.IRRUPTIVO_EMAIL_PROVIDER_TOKEN;
const from = `${process.env.IRRUPTIVO_EMAIL_FROM_NAME || "Irruptivo"} <${process.env.IRRUPTIVO_EMAIL_FROM_EMAIL}>`;
fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ from, to: ["avilaluca61@gmail.com"], subject: "Test Irruptivo", text: "prueba" })
}).then(async (r) => { console.log("HTTP", r.status); console.log(await r.text()); })
  .catch((e) => console.log("ERR", e));
'
```

Imprime el HTTP status + JSON exacto de Resend.

## Causa más probable e interpretación

Fallan LOS DOS emails → apunta a config global, no a un destinatario:

1. **(Apuesta principal) Dominio del remitente NO verificado en Resend.**
   - `IRRUPTIVO_EMAIL_FROM_EMAIL` usa un dominio sin verificar (DKIM/SPF). Es el ítem de DNS pendiente en `hitl-checklist.md`.
   - Resend devuelve `403`/`422` con "domain is not verified".
   - **Fix real:** verificar el dominio en Resend (panel → Domains → agregar registros DNS).
   - **Fix para probar YA:** `IRRUPTIVO_EMAIL_FROM_EMAIL=onboarding@resend.dev`.
     - OJO: con `onboarding@resend.dev` (sin dominio propio), Resend SOLO permite enviar a la casilla dueña de la cuenta (`avilaluca61@gmail.com`). El email del comprador a otra casilla (`lucaa.136a@gmail.com`) va a seguir fallando. Para enviar a cualquier comprador hay que verificar el dominio sí o sí.

2. **Token inválido** → Resend `401` "API key is invalid". Revisar que `IRRUPTIVO_EMAIL_PROVIDER_TOKEN` se cargó bien (sin comillas/espacios).

## Mejora de código pendiente (acordada, NO implementada)

`src/notifications/email-provider.ts` → `sendResendEmail`: cuando `!response.ok`, leer el body de la respuesta de Resend y propagar ese mensaje a `EmailSendResult.failed.message`, en lugar del texto genérico "No pudimos enviar el email transaccional con Resend.". Así el motivo real queda en `email_deliveries.error_message` y no hace falta el curl manual. Cambio chico, con test del caso no-ok que capture el body.

## Comandos útiles (VPS)

```bash
# Estado de cada envío
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "select kind, status, recipient_email, error_message, attempted_at from email_deliveries order by attempted_at desc limit 10;"

# Env del contenedor app
docker compose exec app env | grep -i IRRUPTIVO_EMAIL

# Últimos pedidos
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "select order_number, status, created_at from orders order by created_at desc limit 5;"
```

## Notas de arquitectura relevantes

- Envío enganchado en `reconcileApprovedPayment` (`src/payments/payment-reconciliation.ts`); cubre webhook y retorno del comprador. Ambos emails se mandan en paralelo y de forma independiente: el del admin no bloquea al del comprador ni a la reconciliación.
- Idempotencia por `EmailDelivery` con unique `(orderId, kind)`: `buyer_confirmation` / `admin_notification`.
- Config de email vía `.env` del VPS (`docker-compose.yml` → service `app` usa `env_file: .env`).
- Destinatario admin: `StoreSettings.adminNotificationEmail` (panel `/admin/configuracion`) → fallback `IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL`.
- Modos del provider en `src/notifications/email-provider.ts`: `local` (outbox dev) / `http` (genérico) / `resend` (prod, `https://api.resend.com/emails`).
