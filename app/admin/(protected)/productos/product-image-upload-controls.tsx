"use client";

import { ImagePlus } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

import styles from "../admin.module.css";

export function ProductImageFileInput() {
  const [imageUploadId, setImageUploadId] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.currentTarget.files?.[0] ?? null;
    setImageUploadId(selectedFile ? globalThis.crypto?.randomUUID?.() ?? "" : "");
  }

  return (
    <>
      <input type="hidden" name="imageUploadId" value={imageUploadId} />
      <label className={styles.field}>
        <span>Archivo</span>
        <input
          name="image"
          type="file"
          accept="image/avif,image/jpeg,image/png,image/webp"
          required
          onChange={handleFileChange}
        />
      </label>
    </>
  );
}

export function ProductImageUploadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} type="submit" disabled={pending}>
      <ImagePlus aria-hidden="true" size={17} strokeWidth={2.1} />
      <span>{pending ? "Subiendo..." : "Subir imagen"}</span>
    </button>
  );
}
