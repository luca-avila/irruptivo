"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteAdminProduct } from "../../../../src/admin/product-actions";
import styles from "../admin.module.css";

type DeleteProductButtonProps = {
  productId: string;
  productName: string;
};

export function DeleteProductButton({
  productId,
  productName
}: DeleteProductButtonProps) {
  const confirmationMessage = `Vas a eliminar «${productName}» de forma permanente, junto con sus variantes e imágenes. Esta acción no se puede deshacer. ¿Querés continuar?`;

  return (
    <form
      action={deleteAdminProduct}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <DeleteSubmitButton />
    </form>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.dangerButton} type="submit" disabled={pending}>
      <Trash2 aria-hidden="true" size={17} strokeWidth={2.1} />
      <span>{pending ? "Eliminando..." : "Eliminar producto"}</span>
    </button>
  );
}
