"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { validateAddToCartAction } from "../../cart/actions";
import { addItem, hydrateCart, serializeCart } from "../../cart/cart";
import { CART_STORAGE_KEY } from "../navigation";
import styles from "./product-detail-page.module.css";

type AddToCartFeedback =
  | {
      type: "error";
      message: string;
    }
  | {
      type: "limit";
      message: string;
    };

type AddToCartControlProps = {
  productId: string;
  productName: string;
  variantId?: string;
  canAddToCart: boolean;
  readinessCopy: string;
};

export function AddToCartControl({
  productId,
  productName,
  variantId,
  canAddToCart,
  readinessCopy
}: AddToCartControlProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<AddToCartFeedback | null>(null);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const addedFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDisabled = isPending || !canAddToCart || !variantId;

  useEffect(() => {
    return () => {
      if (addedFeedbackTimeout.current) {
        clearTimeout(addedFeedbackTimeout.current);
      }
    };
  }, []);

  function handleAddToCart() {
    if (!variantId) {
      setFeedback({
        type: "error",
        message: "Elegí una variante disponible para agregarla al carrito."
      });
      return;
    }

    setFeedback(null);

    startTransition(() => {
      void addSelectedVariant(variantId);
    });
  }

  async function addSelectedVariant(selectedVariantId: string) {
    try {
      const validation = await validateAddToCartAction({
        productId,
        variantId: selectedVariantId
      });

      if (validation.status === "error") {
        setFeedback({
          type: "error",
          message: validation.message
        });
        return;
      }

      const result = addItem(
        hydrateCart(window.localStorage.getItem(CART_STORAGE_KEY)),
        {
          productId: validation.item.productId,
          variantId: validation.item.variantId,
          sku: validation.item.sku,
          unitPriceArs: validation.item.unitPriceArs,
          availableStock: validation.item.availableStock,
          snapshotAt: validation.item.snapshotAt
        }
      );

      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(result.cart));
      window.dispatchEvent(new Event("irruptivo:cart-updated"));

      if (result.addedQuantity === 0) {
        setFeedback({
          type: "limit",
          message:
            "Ya tenés todas las unidades disponibles de esta variante en el carrito."
        });
        return;
      }

      showProductAddedFeedback();
    } catch {
      setFeedback({
        type: "error",
        message:
          "No pudimos actualizar el carrito en este navegador. Revisá la configuración de almacenamiento y volvé a intentar."
      });
    }
  }

  function showProductAddedFeedback() {
    setShowAddedFeedback(true);

    if (addedFeedbackTimeout.current) {
      clearTimeout(addedFeedbackTimeout.current);
    }

    addedFeedbackTimeout.current = setTimeout(() => {
      setShowAddedFeedback(false);
    }, 1500);
  }

  return (
    <section className={styles.ctaArea} aria-label="Compra del producto">
      <button
        className={styles.addButton}
        type="button"
        disabled={isDisabled}
        aria-label={`Añadir ${productName} al carrito`}
        onClick={handleAddToCart}
      >
        {isPending ? (
          <span className={styles.addButtonContent}>
            <Loader2 aria-hidden="true" size={19} strokeWidth={2.2} />
            Agregando
          </span>
        ) : (
          "Añadir al carrito"
        )}
      </button>
      <p className={styles.ctaHelp}>{readinessCopy}</p>
      {feedback ? (
        <p className={styles.addFeedback} data-tone={feedback.type} role="alert">
          {feedback.message}
        </p>
      ) : null}
      {showAddedFeedback ? (
        <div className={styles.addedOverlay} role="status" aria-live="polite">
          <div className={styles.addedOverlayContent}>
            <span className={styles.addedIcon}>
              <Check aria-hidden="true" size={54} strokeWidth={2.7} />
            </span>
            <p>Producto añadido</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
