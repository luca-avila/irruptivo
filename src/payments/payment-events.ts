import { type Prisma, type PaymentEvent as PaymentEventRow } from "@prisma/client";

import { prisma, type PrismaClient } from "../db/client";

export type PaymentEventProvider = "mercado_pago";

export const PAYMENT_MANUAL_REVIEW_PROCESSING_RESULT =
  "manual_review_required";

export type PaymentEventIdentity = {
  provider: PaymentEventProvider;
  providerEventId: string;
};

export type PaymentEventRecord = PaymentEventIdentity & {
  providerPaymentId: string;
  orderId: string | null;
  type: string;
  action: string;
  providerStatus: string | null;
  processingResult: string;
  receivedAt: string;
};

export type RecordPaymentEventInput = PaymentEventRecord;

export type RecordPaymentEventOnceResult =
  | {
      status: "recorded";
      event: PaymentEventRecord;
    }
  | {
      status: "duplicate";
      event: PaymentEventRecord;
    };

export type PaymentManualReviewState = {
  required: boolean;
  label: string;
  description: string;
  providerPaymentIds: string[];
  latestEventAt: string | null;
};

export type PaymentEventWriteRow = Omit<PaymentEventRow, "id">;

type PaymentEventPrismaClient = PrismaClient | Prisma.TransactionClient;

export async function recordPaymentEventOnce(
  event: RecordPaymentEventInput
): Promise<RecordPaymentEventOnceResult> {
  const normalizedEvent = normalizePaymentEventRecord(event);

  try {
    const createdEvent = await prisma.paymentEvent.create({
      data: mapPaymentEventRecordToRow(normalizedEvent)
    });

    return {
      status: "recorded",
      event: mapPaymentEventRowToRecord(createdEvent)
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existingEvent = await readPaymentEventByIdentity(normalizedEvent);

    if (!existingEvent) {
      throw error;
    }

    return {
      status: "duplicate",
      event: existingEvent
    };
  }
}

export async function hasProcessedPaymentEvent({
  provider,
  providerEventId
}: PaymentEventIdentity): Promise<boolean> {
  assertNonEmptyString(providerEventId, "providerEventId");

  const event = await prisma.paymentEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider,
        providerEventId: providerEventId.trim()
      }
    },
    select: {
      id: true
    }
  });

  return Boolean(event);
}

export async function findPaymentEventByIdentity(
  identity: PaymentEventIdentity
): Promise<PaymentEventRecord | null> {
  return readPaymentEventByIdentity(identity);
}

export async function getPaymentManualReviewForOrder(
  orderId: string
): Promise<PaymentManualReviewState> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return getNeutralManualReviewState();
  }

  const reviewEvents = await prisma.paymentEvent.findMany({
    where: {
      orderId: normalizedOrderId,
      processingResult: PAYMENT_MANUAL_REVIEW_PROCESSING_RESULT
    },
    orderBy: [
      {
        receivedAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return buildPaymentManualReviewState(
    normalizedOrderId,
    reviewEvents.map(mapPaymentEventRowToRecord)
  );
}

export async function readPaymentEventsForTests(): Promise<PaymentEventRecord[]> {
  const events = await prisma.paymentEvent.findMany({
    orderBy: [
      {
        receivedAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return events.map(mapPaymentEventRowToRecord);
}

export async function resetPaymentEventsForTests(): Promise<void> {
  await prisma.paymentEvent.deleteMany();
}

export function mapPaymentEventRowToRecord(
  row: PaymentEventRow | PaymentEventWriteRow
): PaymentEventRecord {
  if (row.provider !== "mercado_pago") {
    throw new RangeError("provider must be mercado_pago");
  }

  return {
    provider: row.provider,
    providerEventId: row.providerEventId,
    providerPaymentId: row.providerPaymentId,
    orderId: row.orderId,
    type: row.type,
    action: row.action,
    providerStatus: row.providerStatus,
    processingResult: row.processingResult,
    receivedAt: row.receivedAt.toISOString()
  };
}

export function mapPaymentEventRecordToRow(
  event: RecordPaymentEventInput
): PaymentEventWriteRow {
  const normalizedEvent = normalizePaymentEventRecord(event);

  return {
    provider: normalizedEvent.provider,
    providerEventId: normalizedEvent.providerEventId,
    providerPaymentId: normalizedEvent.providerPaymentId,
    orderId: normalizedEvent.orderId,
    type: normalizedEvent.type,
    action: normalizedEvent.action,
    providerStatus: normalizedEvent.providerStatus,
    processingResult: normalizedEvent.processingResult,
    receivedAt: new Date(normalizedEvent.receivedAt)
  };
}

export function buildPaymentManualReviewState(
  orderId: string,
  events: readonly PaymentEventRecord[]
): PaymentManualReviewState {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return getNeutralManualReviewState();
  }

  const reviewEvents = events.filter(
    (event) =>
      event.orderId === normalizedOrderId &&
      event.processingResult === PAYMENT_MANUAL_REVIEW_PROCESSING_RESULT
  );

  if (reviewEvents.length === 0) {
    return getNeutralManualReviewState();
  }

  return {
    required: true,
    label: "Revisión manual requerida",
    description:
      "Llegó un pago aprobado que no pudimos completar automáticamente (reserva vencida o sin stock al confirmar). Revisá el caso antes de preparar o devolver el pago.",
    providerPaymentIds: getUniqueProviderPaymentIds(reviewEvents),
    latestEventAt: getLatestReceivedAt(reviewEvents)
  };
}

async function readPaymentEventByIdentity(
  event: PaymentEventIdentity,
  client: PaymentEventPrismaClient = prisma
): Promise<PaymentEventRecord | null> {
  const existingEvent = await client.paymentEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: event.provider,
        providerEventId: event.providerEventId.trim()
      }
    }
  });

  return existingEvent ? mapPaymentEventRowToRecord(existingEvent) : null;
}

function normalizePaymentEventRecord(
  event: RecordPaymentEventInput
): PaymentEventRecord {
  assertNonEmptyString(event.providerEventId, "providerEventId");
  assertNonEmptyString(event.providerPaymentId, "providerPaymentId");
  assertNonEmptyString(event.type, "type");
  assertNonEmptyString(event.action, "action");
  assertNonEmptyString(event.processingResult, "processingResult");

  if (event.provider !== "mercado_pago") {
    throw new RangeError("provider must be mercado_pago");
  }

  if (Number.isNaN(Date.parse(event.receivedAt))) {
    throw new RangeError("receivedAt must be a valid date");
  }

  return {
    provider: event.provider,
    providerEventId: event.providerEventId.trim(),
    providerPaymentId: event.providerPaymentId.trim(),
    orderId: event.orderId?.trim() || null,
    type: event.type.trim(),
    action: event.action.trim(),
    providerStatus: event.providerStatus?.trim() || null,
    processingResult: event.processingResult.trim(),
    receivedAt: new Date(event.receivedAt).toISOString()
  };
}

function getNeutralManualReviewState(): PaymentManualReviewState {
  return {
    required: false,
    label: "Sin revisión manual",
    description: "No hay pagos tardíos pendientes de revisión para este pedido.",
    providerPaymentIds: [],
    latestEventAt: null
  };
}

function getUniqueProviderPaymentIds(
  events: readonly PaymentEventRecord[]
): string[] {
  return [...new Set(events.map((event) => event.providerPaymentId))];
}

function getLatestReceivedAt(
  events: readonly PaymentEventRecord[]
): string {
  let latestReceivedAt = events[0]?.receivedAt ?? new Date(0).toISOString();

  for (const event of events.slice(1)) {
    if (Date.parse(event.receivedAt) > Date.parse(latestReceivedAt)) {
      latestReceivedAt = event.receivedAt;
    }
  }

  return latestReceivedAt;
}

function assertNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must be a non-empty string`);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaKnownError(error, "P2002");
}

function isPrismaKnownError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
