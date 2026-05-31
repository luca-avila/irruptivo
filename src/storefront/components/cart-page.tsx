"use client";

import { ArrowRight, Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  refreshCartReviewAction,
  type CartReviewActionResult,
  type CartReviewItem
} from "../../cart/actions";
import { hydrateCart, removeItem, serializeCart, updateQuantity } from "../../cart/cart";
import { CART_STORAGE_KEY } from "../navigation";
import styles from "./cart-page.module.css";

type CartPageStatus = "loading" | "ready" | "error";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function StorefrontCartPage() {
  const [status, setStatus] = useState<CartPageStatus>("loading");
  const [review, setReview] = useState<CartReviewActionResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);

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

  async function handleQuantityChange(item: CartReviewItem, quantity: number) {
    if (item.availableStock < 1) {
      return;
    }

    setUpdatingVariantId(item.variantId);

    try {
      const cart = hydrateCart(window.localStorage.getItem(CART_STORAGE_KEY));
      const updatedCart = updateQuantity(cart, {
        variantId: item.variantId,
        quantity,
        availableStock: item.availableStock
      });

      persistSerializedCart(serializeCart(updatedCart));
      await refreshCart();
    } catch {
      setStatus("error");
    } finally {
      setUpdatingVariantId(null);
    }
  }

  async function handleRemoveItem(variantId: string) {
    setUpdatingVariantId(variantId);

    try {
      const cart = hydrateCart(window.localStorage.getItem(CART_STORAGE_KEY));
      persistSerializedCart(serializeCart(removeItem(cart, variantId)));
      await refreshCart();
    } catch {
      setStatus("error");
    } finally {
      setUpdatingVariantId(null);
    }
  }

  if (status === "loading") {
    return <CartLoadingState />;
  }

  if (status === "error") {
    return <CartErrorState onRetry={() => void refreshCart(true)} />;
  }

  const items = review?.items ?? [];

  return (
    <section className={styles.cartPage} aria-busy={isRefreshing}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Carrito</p>
          <h1 className={styles.title}>Revisá tu compra</h1>
        </header>

        {items.length === 0 || !review ? (
          <CartEmptyState />
        ) : (
          <div className={styles.reviewLayout}>
            <section className={styles.itemList} aria-label="Productos en el carrito">
              {items.map((item) => (
                <CartItemRow
                  key={item.variantId}
                  item={item}
                  isUpdating={updatingVariantId === item.variantId}
                  onDecrease={() => void handleQuantityChange(item, item.quantity - 1)}
                  onIncrease={() => void handleQuantityChange(item, item.quantity + 1)}
                  onRemove={() => void handleRemoveItem(item.variantId)}
                />
              ))}
            </section>

            <CartSummaryPanel review={review} isRefreshing={isRefreshing} />
          </div>
        )}
      </div>
    </section>
  );
}

function CartItemRow({
  item,
  isUpdating,
  onDecrease,
  onIncrease,
  onRemove
}: {
  item: CartReviewItem;
  isUpdating: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const canDecrease = item.isAvailable && item.availableStock > 0 && item.quantity > 1;
  const canIncrease =
    item.isAvailable && item.availableStock > 0 && item.quantity < item.availableStock;
  const hasStockCapNotice = item.issues.some(
    (issue) => issue.code === "insufficient_stock"
  );
  const hasReachedStockLimit =
    item.isAvailable &&
    item.availableStock > 0 &&
    item.quantity >= item.availableStock &&
    !hasStockCapNotice;

  return (
    <article
      className={styles.cartItem}
      data-status={item.status}
      aria-label={item.productName}
    >
      <Link className={styles.productImageLink} href={item.productHref} tabIndex={-1}>
        <span className={styles.productImageFrame}>
          {item.image ? (
            <Image
              className={styles.productImage}
              src={item.image.path}
              alt={item.image.alt}
              fill
              sizes="7rem"
            />
          ) : (
            <span className={styles.productImageFallback}>Sin imagen</span>
          )}
        </span>
      </Link>

      <div className={styles.itemBody}>
        <div className={styles.itemTopLine}>
          <div className={styles.productCopy}>
            <Link className={styles.productName} href={item.productHref}>
              {item.productName}
            </Link>
            <p className={styles.variantSummary}>{item.optionSummary}</p>
          </div>
          <button
            className={styles.removeButton}
            type="button"
            aria-label={`Quitar ${item.productName} del carrito`}
            title="Quitar"
            disabled={isUpdating}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.itemMeta}>
          <span className={styles.availability} data-available={item.isAvailable}>
            {item.availabilityLabel}
          </span>
          <span>{item.sku}</span>
        </div>

        <div className={styles.quantityRow}>
          <div className={styles.quantityControl} aria-label="Cantidad">
            <button
              type="button"
              aria-label={`Reducir cantidad de ${item.productName}`}
              disabled={!canDecrease || isUpdating}
              onClick={onDecrease}
            >
              <Minus aria-hidden="true" size={16} strokeWidth={2.5} />
            </button>
            <span aria-live="polite">{item.quantity}</span>
            <button
              type="button"
              aria-label={`Aumentar cantidad de ${item.productName}`}
              disabled={!canIncrease || isUpdating}
              onClick={onIncrease}
            >
              <Plus aria-hidden="true" size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className={styles.itemPrices}>
            <p>{priceFormatter.format(item.unitPriceArs)} c/u</p>
            <strong>{priceFormatter.format(item.lineTotalArs)}</strong>
          </div>
        </div>

        {hasReachedStockLimit ? (
          <p className={styles.stockNote}>Llegaste al stock disponible.</p>
        ) : null}
        {item.issues.length > 0 ? (
          <ul
            className={styles.issueList}
            aria-label={`Avisos de ${item.productName}`}
          >
            {item.issues.map((issue) => (
              <li data-blocking={issue.isBlocking} key={issue.code}>
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function CartSummaryPanel({
  review,
  isRefreshing
}: {
  review: CartReviewActionResult;
  isRefreshing: boolean;
}) {
  const canProceedToCheckout = review.canCheckout && !isRefreshing;

  return (
    <aside className={styles.summaryPanel} aria-label="Resumen del carrito">
      <h2>Resumen</h2>
      <dl className={styles.summaryList}>
        <div>
          <dt>Subtotal</dt>
          <dd>{priceFormatter.format(review.summary.subtotalArs)}</dd>
        </div>
        <div>
          <dt>Envío o retiro</dt>
          <dd>A definir en checkout</dd>
        </div>
        <div className={styles.totalRow}>
          <dt>Total</dt>
          <dd>Se confirma en checkout</dd>
        </div>
      </dl>
      {canProceedToCheckout ? (
        <Link className={styles.checkoutButton} href="/checkout">
          <span>Continuar al checkout</span>
          <ArrowRight aria-hidden="true" size={19} strokeWidth={2.2} />
        </Link>
      ) : (
        <button className={styles.checkoutButton} type="button" disabled>
          <span>Continuar al checkout</span>
          <ArrowRight aria-hidden="true" size={19} strokeWidth={2.2} />
        </button>
      )}
      <p className={styles.summaryHelp}>
        {review.hasBlockingIssues
          ? "Quitá o corregí los productos marcados para continuar."
          : "Vas a elegir envío o retiro antes de crear el pedido."}
      </p>
      {isRefreshing ? (
        <p className={styles.refreshingStatus} role="status">
          Actualizando carrito
        </p>
      ) : null}
    </aside>
  );
}

function CartEmptyState() {
  return (
    <section className={styles.emptyPanel} aria-live="polite">
      <ShoppingCart aria-hidden="true" size={76} strokeWidth={1.7} />
      <h2>Tu carrito está vacío</h2>
      <p>Cuando añadas productos van a aparecer acá.</p>
      <div className={styles.emptyActions}>
        <Link className={styles.primaryAction} href="/coleccion">
          Explorar colección
        </Link>
        <Link className={styles.secondaryAction} href="/suplementos">
          Ver suplementos
        </Link>
      </div>
    </section>
  );
}

function CartLoadingState() {
  return (
    <section className={styles.cartPage}>
      <div className={styles.inner}>
        <div className={styles.statePanel} role="status">
          <Loader2 aria-hidden="true" size={34} strokeWidth={2.2} />
          <p>Cargando carrito</p>
        </div>
      </div>
    </section>
  );
}

function CartErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={styles.cartPage}>
      <div className={styles.inner}>
        <section className={styles.statePanel} role="alert">
          <h1>No pudimos cargar el carrito</h1>
          <p>Revisá la configuración del navegador y volvé a intentar.</p>
          <button className={styles.primaryAction} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </section>
      </div>
    </section>
  );
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
