"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  changeAdminProductStatus,
  type ProductStatusActionState
} from "../../../../src/admin/product-actions";
import type { ProductStatus } from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";

type ProductStatusToggleProps = {
  productId: string;
  nextStatus: ProductStatus;
  label: string;
};

type VisibleToast = NonNullable<ProductStatusActionState["toast"]>;

export function ProductStatusToggle({
  productId,
  nextStatus,
  label
}: ProductStatusToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<VisibleToast | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => setToast(null), 3500);

    return () => clearTimeout(timeout);
  }, [toast]);

  function handleClick() {
    startTransition(async () => {
      const result = await changeAdminProductStatus(productId, nextStatus);

      if (result.toast) {
        setToast(result.toast);
      }

      // Refresh the list so the status pill and button label flip in place,
      // without losing the current scroll position.
      router.refresh();
    });
  }

  return (
    <>
      <button
        className={styles.textButton}
        type="button"
        onClick={handleClick}
        disabled={isPending}
      >
        {label}
      </button>

      {toast ? (
        <div
          className={styles.toast}
          data-tone={toast.tone}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
