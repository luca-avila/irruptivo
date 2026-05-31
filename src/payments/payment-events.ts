export type PaymentEventProvider = "mercado_pago";

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

const paymentEvents: PaymentEventRecord[] = [];

export function recordPaymentEventOnce(
  event: RecordPaymentEventInput
): RecordPaymentEventOnceResult {
  const normalizedEvent = normalizePaymentEventRecord(event);
  const existingEvent = paymentEvents.find(
    (candidateEvent) =>
      candidateEvent.provider === normalizedEvent.provider &&
      candidateEvent.providerEventId === normalizedEvent.providerEventId
  );

  if (existingEvent) {
    return {
      status: "duplicate",
      event: clonePaymentEvent(existingEvent)
    };
  }

  paymentEvents.push(clonePaymentEvent(normalizedEvent));

  return {
    status: "recorded",
    event: clonePaymentEvent(normalizedEvent)
  };
}

export function hasProcessedPaymentEvent({
  provider,
  providerEventId
}: PaymentEventIdentity): boolean {
  assertNonEmptyString(providerEventId, "providerEventId");

  return paymentEvents.some(
    (event) =>
      event.provider === provider && event.providerEventId === providerEventId
  );
}

export function readPaymentEventsForTests(): PaymentEventRecord[] {
  return paymentEvents.map(clonePaymentEvent);
}

export function resetPaymentEventsForTests(): void {
  paymentEvents.splice(0, paymentEvents.length);
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

function clonePaymentEvent(event: PaymentEventRecord): PaymentEventRecord {
  return {
    ...event
  };
}

function assertNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must be a non-empty string`);
  }
}
