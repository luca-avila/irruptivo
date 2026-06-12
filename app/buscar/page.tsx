import { Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  searchActiveProductsByName,
  type ProductSearchEmptyState,
  type ProductSearchResultView
} from "../../src/catalog/catalog";
import { loadCatalogProducts } from "../../src/catalog/product-repository";

export const dynamic = "force-dynamic";

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

const sectionClass =
  "min-h-[calc(100svh-72px)] pt-[1.35rem] px-4 pb-16 bg-[#f7f7f5] text-[#101010] min-[760px]:pt-[2.25rem] min-[760px]:px-8 min-[760px]:pb-20";
const innerClass = "w-[min(100%,52rem)] mx-auto";
const eyebrowClass =
  "m-0 mb-2 text-[#686868] text-[0.74rem] font-[850] tracking-[0.13em] leading-[1.2] uppercase";
const titleClass =
  "m-0 text-[clamp(2.1rem,12vw,4.2rem)] font-[560] tracking-[0] leading-[0.95]";

const baseActionClass =
  "inline-flex items-center justify-center min-h-[46px] px-4 transition-[background-color,border-color,transform] duration-[180ms] ease-[ease] active:scale-[0.98]";
const primaryActionClass = `${baseActionClass} font-[850] border border-[#101010] bg-[#101010] text-white! hover:bg-black`;
const secondaryActionClass = `${baseActionClass} font-[850] border border-[#c9c5bc] bg-white text-[#101010]! hover:border-[#101010] hover:bg-[#f0f0ec]`;

const availabilityBadgeClass =
  "absolute top-[0.45rem] left-[0.45rem] max-w-[calc(100%-0.9rem)] py-[0.28rem] px-[0.38rem] [overflow-wrap:anywhere] bg-[rgba(255,106,26,0.95)] text-[#101010] text-[0.62rem] font-[850] tracking-[0.04em] leading-none uppercase";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const products = await loadCatalogProducts();
  const search = searchActiveProductsByName(
    getFirstSearchParamValue(params?.[searchParamName]),
    products
  );

  return (
    <section className={sectionClass}>
      <div className={innerClass}>
        <header className="pt-[0.35rem] pb-[1.2rem] min-[760px]:pb-[1.45rem]">
          <p className={eyebrowClass}>Buscar</p>
          <h1 className={titleClass}>Encontrá productos</h1>
        </header>

        <form className="grid gap-[0.45rem]" action="/buscar" role="search">
          <label
            className="text-[#686868] text-[0.83rem] font-[800]"
            htmlFor="product-search"
          >
            Producto
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] min-h-[54px] border border-[#d6d4ce] bg-white">
            <input
              id="product-search"
              className="min-w-0 border-0 bg-transparent text-[#101010] font-[inherit] text-[1rem] outline-none px-[0.9rem] placeholder:text-[#8b887f]"
              name={searchParamName}
              type="search"
              defaultValue={search.query}
              placeholder="Nombre del producto"
              autoComplete="off"
            />
            <button
              className="inline-flex items-center justify-center gap-[0.42rem] min-w-[6.4rem] border-0 border-l border-l-[#d6d4ce] bg-[#101010] text-white cursor-pointer text-[0.95rem]! font-[850]! transition-colors duration-[180ms] ease-[ease] hover:bg-black"
              type="submit"
            >
              <Search aria-hidden="true" size={18} strokeWidth={2.2} />
              <span>Buscar</span>
            </button>
          </div>
        </form>

        {search.emptyState ? (
          <SearchEmptyState emptyState={search.emptyState} />
        ) : (
          <section className="mt-6" aria-live="polite">
            <p className="m-0 mb-3 text-[#686868] text-[0.93rem] font-[750]">
              {search.results.length === 1
                ? "1 producto encontrado"
                : `${search.results.length} productos encontrados`}
            </p>
            <div className="grid gap-[0.65rem] min-[760px]:gap-[0.8rem]">
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
    ? availabilityBadgeClass
    : `${availabilityBadgeClass} bg-[rgba(16,16,16,0.86)] text-white`;

  return (
    <Link
      className="group grid grid-cols-[minmax(6.4rem,32%)_minmax(0,1fr)] min-h-[7rem] overflow-hidden border border-[#e0ddd6] rounded-[4px] bg-white transition-[border-color,box-shadow,transform] duration-[180ms] ease-[ease] active:scale-[0.995] hover:border-[#c7c3ba] hover:shadow-[0_10px_26px_rgba(16,16,16,0.09)] hover:-translate-y-0.5 min-[760px]:grid-cols-[9rem_minmax(0,1fr)] min-[760px]:min-h-[9rem]"
      href={product.href}
      aria-label={`Ver ${product.name}`}
    >
      <div className="relative grid min-h-[7rem] overflow-hidden place-items-center bg-[#e6e6e2] min-[760px]:min-h-[9rem]">
        {product.image ? (
          <Image
            className="object-cover transition-transform duration-[550ms] ease-[ease] group-hover:scale-105"
            src={product.image.path}
            alt={product.image.alt}
            fill
            sizes="(min-width: 760px) 9rem, 7rem"
          />
        ) : (
          <span className="p-3 text-[#777777] text-[0.78rem] font-[800] text-center">
            Sin imagen
          </span>
        )}
        <span className={availabilityClassName}>{product.availabilityLabel}</span>
      </div>

      <div className="grid content-center min-w-0 pt-[0.85rem] px-[0.85rem] pb-[0.9rem] min-[760px]:px-[1.15rem]">
        <p className="m-0 text-[#707070] text-[0.72rem] font-[850] tracking-[0.06em] leading-[1.25] uppercase">
          {product.areaLabel} / {product.contextLabel}
        </p>
        <h2 className="m-0 mt-1 [overflow-wrap:anywhere] text-[#101010] text-[1.18rem] font-[720] tracking-[0] leading-[1.08] group-hover:underline group-hover:underline-offset-[0.16em] min-[760px]:text-[1.34rem]">
          {product.name}
        </h2>
        <p className="flex flex-wrap gap-x-[0.65rem] gap-y-[0.34rem] m-0 mt-[0.45rem] text-[#626262] text-[0.9rem] leading-[1.3]">
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
      <section
        className="max-w-[34rem] mt-[2.2rem] pt-[1.35rem] border-t border-t-[#dedbd4]"
        aria-live="polite"
      >
        <h2 className="m-0 text-[#101010] text-[1.55rem] leading-[1.12]">
          Escribí un nombre para empezar.
        </h2>
        <p className="mt-[0.8rem] mb-0 mx-0 text-[#626262] text-[1rem] leading-[1.55]">
          Podés buscar prendas y suplementos publicados.
        </p>
      </section>
    );
  }

  return (
    <section
      className="max-w-[34rem] mt-[2.2rem] pt-[1.35rem] border-t border-t-[#dedbd4]"
      aria-live="polite"
    >
      <h2 className="m-0 text-[#101010] text-[1.55rem] leading-[1.12]">
        No encontramos productos para &quot;{emptyState.query}&quot;.
      </h2>
      <p className="mt-[0.8rem] mb-0 mx-0 text-[#626262] text-[1rem] leading-[1.55]">
        Probá con otro nombre o seguí explorando las secciones principales.
      </p>
      <div className="flex flex-wrap gap-[0.65rem] mt-5">
        <Link className={primaryActionClass} href="/coleccion">
          Ver colección
        </Link>
        <Link className={secondaryActionClass} href="/suplementos">
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
