import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { loadCatalogProducts } from "../../src/catalog/product-repository";
import { listSupplementProducts } from "../../src/catalog/supplements";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type SupplementsPageProps = {
  searchParams?: Promise<{
    tipo?: string | string[];
  }>;
};

export default async function SupplementsPage({
  searchParams
}: SupplementsPageProps) {
  const params = await searchParams;
  const products = await loadCatalogProducts();
  const listing = listSupplementProducts({
    products,
    selectedType: getFirstSearchParamValue(params?.tipo)
  });

  return (
    <section className={styles.supplementsPage}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Selección complementaria</p>
            <h1 className={styles.title}>Suplementos</h1>
          </div>
          <SlidersHorizontal
            className={styles.filterIcon}
            aria-hidden="true"
            size={28}
            strokeWidth={1.9}
          />
        </div>

        <nav className={styles.filters} aria-label="Filtrar suplementos por tipo">
          {listing.filters.map((filter) => (
            <Link
              key={filter.value}
              className={styles.filterLink}
              href={filter.href}
              aria-current={filter.isActive ? "page" : undefined}
              data-active={filter.isActive}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        {listing.products.length > 0 ? (
          <div className={styles.productGrid}>
            {listing.products.map((product) => (
              <article className={styles.productCard} key={product.id}>
                <Link
                  className={styles.productMedia}
                  href={product.href}
                  aria-label={`Ver ${product.name}`}
                >
                  {product.image ? (
                    <img src={product.image.path} alt={product.image.alt} />
                  ) : (
                    <span className={styles.productImageFallback} aria-hidden="true">
                      {product.typeLabel}
                    </span>
                  )}
                </Link>

                <div className={styles.productInfo}>
                  <p className={styles.productType}>{product.typeLabel}</p>
                  <Link className={styles.productName} href={product.href}>
                    {product.name}
                  </Link>
                  <div className={styles.productMeta}>
                    <span>{product.priceLabel}</span>
                    <span
                      className={styles.availability}
                      data-available={product.isAvailable}
                    >
                      {product.availabilityLabel}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {listing.emptyState ? (
          <section className={styles.emptyState} aria-live="polite">
            <h2>{listing.emptyState.title}</h2>
            <p>{listing.emptyState.description}</p>
            <Link className={styles.emptyStateAction} href={listing.emptyState.actionHref}>
              {listing.emptyState.actionLabel}
            </Link>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function getFirstSearchParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
