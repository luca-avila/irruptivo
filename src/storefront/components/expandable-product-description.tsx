"use client";

import { useId, useState } from "react";

import styles from "./product-detail-page.module.css";

const PRODUCT_DESCRIPTION_PREVIEW_LENGTH = 190;

export function ExpandableProductDescription({
  description
}: {
  description: string;
}) {
  const descriptionId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const collapsedDescription = getCollapsedProductDescription(description);

  if (!collapsedDescription.canExpand) {
    return <p className={styles.description}>{description}</p>;
  }

  return (
    <div className={styles.descriptionBlock}>
      <p className={styles.description} id={descriptionId}>
        {isExpanded ? description : collapsedDescription.text}
      </p>
      <button
        className={styles.descriptionToggle}
        type="button"
        aria-controls={descriptionId}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        {isExpanded ? "Ver menos" : "Ver más"}
      </button>
    </div>
  );
}

export function getCollapsedProductDescription(
  description: string,
  maxLength: number = PRODUCT_DESCRIPTION_PREVIEW_LENGTH
): { canExpand: boolean; text: string } {
  const normalizedDescription = description.trim();

  if (normalizedDescription.length <= maxLength) {
    return {
      canExpand: false,
      text: description
    };
  }

  const wordBoundary = normalizedDescription.lastIndexOf(" ", maxLength);
  const cutAt = wordBoundary >= Math.floor(maxLength * 0.65) ? wordBoundary : maxLength;

  return {
    canExpand: true,
    text: `${normalizedDescription.slice(0, cutAt).trimEnd()}…`
  };
}
