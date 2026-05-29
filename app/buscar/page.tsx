import { Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  searchActiveProductsByName,
  type ProductSearchEmptyState,
  type ProductSearchResultView
} from "../../src/catalog/catalog";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Buscar productos | Irruptivo",
  description: "Búsqueda de productos activos de Irruptivo."
};

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
  }>;
};

const searchParamName = "q";
const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const search = searchActiveProductsByName(
    getFirstSearchParamValue(params?.[searchParamName])
  );

  return (
    <section className={styles.searchPage}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Buscar</p>
          <h1 className={styles.title}>Encontrá productos</h1>
        </header>

        <form className={styles.form} action="/buscar" role="search">
          <label className={styles.label} htmlFor="product-search">
            Producto
          </label>
          <div className={styles.inputRow}>
            <input
              id="product-search"
              className={styles.searchInput}
              name={searchParamName}
              type="search"
              defaultValue={search.query}
              placeholder="Nombre del producto"
              autoComplete="off"
            />
            <button className={styles.submitButton} type="submit">
              <Search aria-hidden="true" size={18} strokeWidth={2.2} />
              <span>Buscar</span>
            </button>
          </div>
        </form>

        {search.emptyState ? (
          <SearchEmptyState emptyState={search.emptyState} />
        ) : (
          <section className={styles.results} aria-live="polite">
            <p className={styles.resultsSummary}>
              {search.results.length === 1
                ? "1 producto encontrado"
                : `${search.results.length} productos encontrados`}
            </p>
            <div className={styles.resultGrid}>
              {search.results.map((product) => (
                <SearchResultCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function SearchResultCard({ product }: { product: ProductSearchResultView }) {
  const availabilityClassName = product.isAvailable
    ? styles.availabilityBadge
    : `${styles.availabilityBadge} ${styles.availabilityBadgeUnavailable}`;

  return (
    <Link
      className={styles.resultCard}
      href={product.href}
      aria-label={`Ver ${product.name}`}
    >
      <div className={styles.resultMedia}>
        {product.image ? (
          <Image
            className={styles.resultImage}
            src={product.image.path}
            alt={product.image.alt}
            fill
            sizes="(min-width: 760px) 9rem, 7rem"
          />
        ) : (
          <span className={styles.resultImageFallback}>Sin imagen</span>
        )}
        <span className={availabilityClassName}>{product.availabilityLabel}</span>
      </div>

      <div className={styles.resultBody}>
        <p className={styles.resultContext}>
          {product.areaLabel} / {product.contextLabel}
        </p>
        <h2 className={styles.resultName}>{product.name}</h2>
        <p className={styles.resultMeta}>
          <span>{priceFormatter.format(product.priceArs)}</span>
          <span>{product.availabilityLabel}</span>
        </p>
      </div>
    </Link>
  );
}

function SearchEmptyState({
  emptyState
}: {
  emptyState: ProductSearchEmptyState;
}) {
  if (emptyState.reason === "empty_query") {
    return (
      <section className={styles.emptyState} aria-live="polite">
        <h2>Escribí un nombre para empezar.</h2>
        <p>Podés buscar prendas y suplementos publicados.</p>
      </section>
    );
  }

  return (
    <section className={styles.emptyState} aria-live="polite">
      <h2>No encontramos productos para &quot;{emptyState.query}&quot;.</h2>
      <p>Probá con otro nombre o seguí explorando las secciones principales.</p>
      <div className={styles.emptyActions}>
        <Link className={styles.primaryAction} href="/coleccion">
          Ver colección
        </Link>
        <Link className={styles.secondaryAction} href="/suplementos">
          Ver suplementos
        </Link>
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
