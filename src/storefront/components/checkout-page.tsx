"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import {
  refreshCartReviewAction,
  type CartReviewActionResult
} from "../../cart/actions";
import { hydrateCart, serializeCart } from "../../cart/cart";
import {
  createPendingOrderAction,
  type CheckoutFormValues
} from "../../checkout/actions";
import {
  buildCheckoutSummary,
  type CheckoutField,
  type CheckoutSummary,
  type CheckoutValidationErrors
} from "../../checkout/checkout";
import {
  DELIVERY_METHOD,
  getDeliveryCost,
  getDeliveryMethodLabel,
  type DeliveryMethod
} from "../../domain/rules";
import { CART_STORAGE_KEY } from "../navigation";
import styles from "./checkout-page.module.css";

type CheckoutPageStatus = "loading" | "ready" | "error";

type SubmitFeedback = {
  tone: "success" | "error";
  message: string;
};

type DeliveryOption = {
  method: DeliveryMethod;
  description: string;
};

const deliveryOptions: DeliveryOption[] = [
  {
    method: DELIVERY_METHOD.shipping,
    description: "Correo Argentino a todo el país con costo fijo."
  },
  {
    method: DELIVERY_METHOD.pickup,
    description:
      "Retiro gratis en Benavidez/Zona Norte. Coordinamos por WhatsApp después del pago confirmado."
  }
];

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function StorefrontCheckoutPage() {
  const [status, setStatus] = useState<CheckoutPageStatus>("loading");
  const [review, setReview] = useState<CartReviewActionResult | null>(null);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<
    DeliveryMethod | ""
  >("");
  const [fieldErrors, setFieldErrors] = useState<CheckoutValidationErrors>({});
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutSubmissionKeyRef = useRef("");

  const refreshCart = useCallback(async (showLoadingState = false) => {
    if (showLoadingState) {
      setStatus("loading");
    } else {
      setIsRefreshing(true);
    }

    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      const result = await refreshCartReviewAction(rawCart);

      if (rawCart !== result.serializedCart) {
        persistSerializedCart(result.serializedCart);
      }

      setReview(result);
      setStatus("ready");
    } catch {
      setStatus("error");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshCart(true);
  }, [refreshCart]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await createPendingOrderAction({
        rawCart: window.localStorage.getItem(CART_STORAGE_KEY),
        checkout: getCheckoutFormValues(formData, selectedDeliveryMethod),
        idempotencyKey: getCheckoutSubmissionKey()
      });

      persistSerializedCart(result.serializedCart);

      if (result.status === "invalid") {
        setFieldErrors(result.validation.errors);
        setSubmitFeedback({
          tone: "error",
          message: result.validation.errors.cart
            ? "Revisá el carrito antes de continuar."
            : "Revisá los campos marcados."
        });
      } else if (result.status === "created") {
        setFieldErrors({});
        setSubmitFeedback({
          tone: "success",
          message: `Pedido ${result.order.orderNumber} creado. El pago con Mercado Pago queda listo para el próximo paso.`
        });
      } else {
        setFieldErrors({
          cart: [result.message]
        });
        setSubmitFeedback({
          tone: "error",
          message: result.message
        });
      }

      await refreshCart();
    } catch {
      setSubmitFeedback({
        tone: "error",
        message: "No pudimos crear el pedido. Volvé a intentar."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getCheckoutSubmissionKey(): string {
    if (!checkoutSubmissionKeyRef.current) {
      checkoutSubmissionKeyRef.current = createCheckoutSubmissionKey();
    }

    return checkoutSubmissionKeyRef.current;
  }

  function handleDeliveryChange(method: DeliveryMethod) {
    setSelectedDeliveryMethod(method);
    setSubmitFeedback(null);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      deliveryMethod: undefined,
      addressLine: undefined,
      city: undefined,
      province: undefined,
      postalCode: undefined
    }));
  }

  if (status === "loading") {
    return <CheckoutLoadingState />;
  }

  if (status === "error") {
    return <CheckoutErrorState onRetry={() => void refreshCart(true)} />;
  }

  const items = review?.items ?? [];
  const checkoutSummary =
    review && review.canCheckout && selectedDeliveryMethod
      ? buildCheckoutSummary({
          itemCount: review.summary.itemCount,
          subtotalArs: review.summary.subtotalArs,
          deliveryMethod: selectedDeliveryMethod
        })
      : null;
  const canSubmit =
    Boolean(review?.canCheckout) &&
    !isRefreshing &&
    !isSubmitting;

  return (
    <section className={styles.checkoutPage} aria-busy={isRefreshing}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href="/carrito">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
          <span>Volver al carrito</span>
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Compra</p>
          <h1 className={styles.title}>Completá tu compra</h1>
          <p className={styles.subtitle}>
            Compra sin cuenta. Validamos el carrito antes de avanzar al pago.
          </p>
        </header>

        {!review || items.length === 0 ? (
          <CheckoutEmptyState />
        ) : (
          <div className={styles.layout}>
            <form className={styles.form} noValidate onSubmit={handleSubmit}>
              <section className={styles.formSection} aria-labelledby="contact-title">
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>
                    <ShieldCheck aria-hidden="true" size={20} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 id="contact-title">Contacto</h2>
                    <p>Usamos estos datos para confirmar el pedido.</p>
                  </div>
                </div>

                <div className={styles.fieldGrid}>
                  <TextField
                    name="fullName"
                    label="Nombre y apellido"
                    autoComplete="name"
                    error={fieldErrors.fullName}
                  />
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    error={fieldErrors.email}
                  />
                  <TextField
                    name="phone"
                    label="Teléfono"
                    type="tel"
                    autoComplete="tel"
                    error={fieldErrors.phone}
                  />
                </div>
              </section>

              <section className={styles.formSection} aria-labelledby="delivery-title">
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>
                    <Truck aria-hidden="true" size={20} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 id="delivery-title">Entrega</h2>
                    <p>Elegí cómo querés recibir tu compra.</p>
                  </div>
                </div>

                <div
                  className={styles.deliveryOptions}
                  role="radiogroup"
                  aria-labelledby="delivery-title"
                  aria-describedby={
                    fieldErrors.deliveryMethod
                      ? "checkout-deliveryMethod-error"
                      : undefined
                  }
                >
                  {deliveryOptions.map((option) => (
                    <label
                      className={styles.deliveryOption}
                      data-selected={selectedDeliveryMethod === option.method}
                      key={option.method}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={option.method}
                        checked={selectedDeliveryMethod === option.method}
                        onChange={() => handleDeliveryChange(option.method)}
                      />
                      <span className={styles.optionIcon}>
                        {option.method === DELIVERY_METHOD.shipping ? (
                          <Truck aria-hidden="true" size={19} strokeWidth={2} />
                        ) : (
                          <PackageCheck
                            aria-hidden="true"
                            size={19}
                            strokeWidth={2}
                          />
                        )}
                      </span>
                      <span className={styles.optionCopy}>
                        <strong>{getDeliveryMethodLabel(option.method)}</strong>
                        <span>{option.description}</span>
                      </span>
                      <span className={styles.optionCost}>
                        {priceFormatter.format(getDeliveryCost(option.method))}
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError id="checkout-deliveryMethod-error" error={fieldErrors.deliveryMethod} />
              </section>

              {selectedDeliveryMethod === DELIVERY_METHOD.shipping ? (
                <section
                  className={styles.formSection}
                  aria-labelledby="shipping-address-title"
                >
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <MapPin aria-hidden="true" size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <h2 id="shipping-address-title">Dirección de envío</h2>
                      <p>Datos necesarios para coordinar Correo Argentino.</p>
                    </div>
                  </div>

                  <div className={styles.fieldGrid}>
                    <TextField
                      name="addressLine"
                      label="Dirección"
                      autoComplete="street-address"
                      error={fieldErrors.addressLine}
                    />
                    <TextField
                      name="city"
                      label="Ciudad"
                      autoComplete="address-level2"
                      error={fieldErrors.city}
                    />
                    <TextField
                      name="province"
                      label="Provincia"
                      autoComplete="address-level1"
                      error={fieldErrors.province}
                    />
                    <TextField
                      name="postalCode"
                      label="Código postal"
                      autoComplete="postal-code"
                      error={fieldErrors.postalCode}
                    />
                  </div>

                  <TextAreaField
                    name="notes"
                    label="Notas de entrega"
                    placeholder="Piso, departamento, horario útil u otra referencia"
                  />
                </section>
              ) : null}

              {selectedDeliveryMethod === DELIVERY_METHOD.pickup ? (
                <section className={styles.formSection} aria-labelledby="pickup-title">
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <PackageCheck aria-hidden="true" size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <h2 id="pickup-title">Retiro local</h2>
                      <p>
                        Coordinamos punto y horario por WhatsApp después del pago
                        confirmado.
                      </p>
                    </div>
                  </div>

                  <TextAreaField
                    name="notes"
                    label="Notas para coordinar"
                    placeholder="Horario preferido o comentario para el retiro"
                  />
                </section>
              ) : null}

              {fieldErrors.cart ? (
                <div className={styles.cartIssue} role="alert">
                  <p>{fieldErrors.cart[0]}</p>
                  <Link href="/carrito">Corregir carrito</Link>
                </div>
              ) : null}

              {!review.canCheckout ? (
                <div className={styles.cartIssue} role="alert">
                  <p>El carrito tiene productos que necesitan revisión.</p>
                  <Link href="/carrito">Volver al carrito</Link>
                </div>
              ) : null}

              <button className={styles.submitButton} type="submit" disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2
                      className={styles.spinner}
                      aria-hidden="true"
                      size={19}
                      strokeWidth={2.2}
                    />
                    <span>Creando pedido</span>
                  </>
                ) : (
                  <>
                    <span>Continuar con Mercado Pago</span>
                    <ArrowRight aria-hidden="true" size={19} strokeWidth={2.2} />
                  </>
                )}
              </button>

              {submitFeedback ? (
                <p
                  className={styles.submitFeedback}
                  data-tone={submitFeedback.tone}
                  role={submitFeedback.tone === "error" ? "alert" : "status"}
                >
                  {submitFeedback.tone === "success" ? (
                    <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2.2} />
                  ) : null}
                  <span>{submitFeedback.message}</span>
                </p>
              ) : null}
            </form>

            <CheckoutSummaryPanel
              review={review}
              summary={checkoutSummary}
              selectedDeliveryMethod={selectedDeliveryMethod}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TextField({
  name,
  label,
  type = "text",
  autoComplete,
  error
}: {
  name: CheckoutField;
  label: string;
  type?: "email" | "tel" | "text";
  autoComplete: string;
  error?: string[];
}) {
  const id = `checkout-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function TextAreaField({
  name,
  label,
  placeholder
}: {
  name: "notes";
  label: string;
  placeholder: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={`checkout-${name}`}>{label}</label>
      <textarea id={`checkout-${name}`} name={name} rows={4} placeholder={placeholder} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string[] }) {
  if (!error?.[0]) {
    return null;
  }

  return (
    <p className={styles.fieldError} id={id}>
      {error[0]}
    </p>
  );
}

function CheckoutSummaryPanel({
  review,
  summary,
  selectedDeliveryMethod
}: {
  review: CartReviewActionResult;
  summary: CheckoutSummary | null;
  selectedDeliveryMethod: DeliveryMethod | "";
}) {
  return (
    <aside className={styles.summaryPanel} aria-label="Resumen del pedido">
      <div>
        <h2>Resumen</h2>
        <p>{review.summary.itemCount} productos en el carrito</p>
      </div>

      <ul className={styles.summaryItems} aria-label="Productos del pedido">
        {review.items.map((item) => (
          <li key={item.variantId}>
            <span>
              {item.quantity} x {item.productName}
            </span>
            <strong>{priceFormatter.format(item.lineTotalArs)}</strong>
          </li>
        ))}
      </ul>

      <dl className={styles.summaryTotals}>
        <div>
          <dt>Subtotal</dt>
          <dd>{priceFormatter.format(review.summary.subtotalArs)}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>
            {selectedDeliveryMethod
              ? getDeliveryMethodLabel(selectedDeliveryMethod)
              : "Elegí método"}
          </dd>
        </div>
        <div>
          <dt>Costo de entrega</dt>
          <dd>
            {summary ? priceFormatter.format(summary.deliveryCostArs) : "A definir"}
          </dd>
        </div>
        <div className={styles.totalRow}>
          <dt>Total</dt>
          <dd>{summary ? priceFormatter.format(summary.totalArs) : "A definir"}</dd>
        </div>
      </dl>

      <p className={styles.trustNote}>
        <ShieldCheck aria-hidden="true" size={18} strokeWidth={2} />
        <span>Sin cuenta obligatoria. Pago seguro en el siguiente paso.</span>
      </p>
    </aside>
  );
}

function CheckoutEmptyState() {
  return (
    <section className={styles.statePanel} aria-live="polite">
      <h2>Tu carrito está vacío</h2>
      <p>Agregá productos antes de completar la compra.</p>
      <Link className={styles.primaryAction} href="/coleccion">
        Explorar colección
      </Link>
    </section>
  );
}

function CheckoutLoadingState() {
  return (
    <section className={styles.checkoutPage}>
      <div className={styles.inner}>
        <div className={styles.statePanel} role="status">
          <Loader2 aria-hidden="true" size={34} strokeWidth={2.2} />
          <p>Cargando compra</p>
        </div>
      </div>
    </section>
  );
}

function CheckoutErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={styles.checkoutPage}>
      <div className={styles.inner}>
        <section className={styles.statePanel} role="alert">
          <h1>No pudimos cargar la compra</h1>
          <p>Revisá la configuración del navegador y volvé a intentar.</p>
          <button className={styles.primaryAction} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </section>
      </div>
    </section>
  );
}

function getCheckoutFormValues(
  formData: FormData,
  selectedDeliveryMethod: DeliveryMethod | ""
): CheckoutFormValues {
  return {
    fullName: getFormValue(formData, "fullName"),
    email: getFormValue(formData, "email"),
    phone: getFormValue(formData, "phone"),
    deliveryMethod:
      selectedDeliveryMethod || getFormValue(formData, "deliveryMethod"),
    addressLine: getFormValue(formData, "addressLine"),
    city: getFormValue(formData, "city"),
    province: getFormValue(formData, "province"),
    postalCode: getFormValue(formData, "postalCode"),
    notes: getFormValue(formData, "notes")
  };
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function persistSerializedCart(serializedCart: string) {
  const cart = hydrateCart(serializedCart);

  if (cart.items.length === 0) {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } else {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(cart));
  }

  window.dispatchEvent(new Event("irruptivo:cart-updated"));
}

function createCheckoutSubmissionKey(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
