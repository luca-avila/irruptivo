import { SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  PRODUCT_LISTING_ALL_FILTER_VALUE,
  getClothingCollectionListing,
  type ProductListingEmptyState,
  type PublicProductCardView
} from "../../src/catalog/catalog";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Colección | Irruptivo",
  description: "Ropa Irruptivo disponible para entrenar y moverse."
};

type CollectionPageProps = {
  searchParams?: Promise<{
    categoria?: string | string[];
  }>;
};

const categorySearchParam = "categoria";
const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export default async function CollectionPage({
  searchParams
}: CollectionPageProps) {
  const params = await searchParams;
  const selectedSubcategory = getSearchParamValue(params?.categoria);
  const listing = getClothingCollectionListing({
    subcategory: selectedSubcategory
  });

  return (
    <section className={styles.collectionPage}>
      <div className={styles.collectionInner}>
        <div className={styles.collectionTop}>
          <h1 className={styles.collectionTitle}>Colección</h1>
          <SlidersHorizontal
            className={styles.filterGlyph}
            aria-hidden="true"
            size={30}
            strokeWidth={1.9}
          />
        </div>

        <nav className={styles.filters} aria-label="Filtrar colección">
          {listing.filters.map((filter) => (
            <Link
              key={filter.value}
              className={`${styles.filterLink} ${
                filter.isActive ? styles.filterLinkActive : ""
              }`}
              href={getFilterHref(filter.value)}
              aria-current={filter.isActive ? "page" : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        {listing.emptyState ? (
          <CollectionEmptyState emptyState={listing.emptyState} />
        ) : (
          <div className={styles.productGrid}>
            {listing.products.map((product) => (
              <CollectionProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionProductCard({
  product
}: {
  product: PublicProductCardView;
}) {
  const availabilityClassName = product.isAvailable
    ? styles.availabilityBadge
    : `${styles.availabilityBadge} ${styles.availabilityBadgeUnavailable}`;

  return (
    <Link
      className={styles.productCard}
      href={`/coleccion/${product.slug}`}
      aria-label={`Ver ${product.name}`}
    >
      <div className={styles.productImageFrame}>
        {product.image ? (
          <Image
            className={styles.productImage}
            src={product.image.path}
            alt={product.image.alt}
            fill
            sizes="(min-width: 920px) 25vw, 50vw"
            priority={false}
          />
        ) : (
          <div className={styles.productImagePlaceholder}>Sin imagen</div>
        )}
        <span className={availabilityClassName}>{product.availabilityLabel}</span>
      </div>

      <div className={styles.productMeta}>
        <p className={styles.productContext}>{product.contextLabel}</p>
        <h2 className={styles.productName}>{product.name}</h2>
        <p className={styles.productPrice}>
          {priceFormatter.format(product.priceArs)}
        </p>
      </div>
    </Link>
  );
}

function CollectionEmptyState({
  emptyState
}: {
  emptyState: ProductListingEmptyState;
}) {
  const isEmptyCatalog = emptyState.reason === "empty_catalog";
  const title = isEmptyCatalog
    ? "Todavía no hay prendas publicadas."
    : `No hay prendas en ${emptyState.selectedLabel}.`;
  const body = isEmptyCatalog
    ? "Estamos preparando la próxima tanda de ropa Irruptivo."
    : "Probá con otra categoría o volvé a ver toda la colección.";
  const actionHref = isEmptyCatalog ? "/" : "/coleccion";
  const actionLabel = isEmptyCatalog ? "Volver al inicio" : "Ver toda la colección";

  return (
    <div className={styles.emptyState}>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyCopy}>{body}</p>
      <Link className={styles.emptyAction} href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}

function getSearchParamValue(value?: string | string[]): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getFilterHref(value: string): string {
  if (value === PRODUCT_LISTING_ALL_FILTER_VALUE) {
    return "/coleccion";
  }

  return `/coleccion?${categorySearchParam}=${encodeURIComponent(value)}`;
}
