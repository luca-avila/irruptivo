import { ArrowLeft, MessageCircle, RotateCcw, Ruler, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  PRODUCT_AREA,
  type ProductArea,
  type PublicProductDetailView,
  type PublicProductImageView,
  type VariantOptionValues
} from "../../catalog/catalog";
import {
  type ProductDetailPageView,
  type ProductVariantSelectionView
} from "../../catalog/product-detail";
import { contactLink, instagramLink } from "../navigation";
import { AddToCartControl } from "./add-to-cart-control";
import styles from "./product-detail-page.module.css";

type SearchParamValue = string | string[] | undefined;

export type ProductDetailSearchParams = Record<string, SearchParamValue>;

type ProductDetailPageProps = {
  view: Exclude<ProductDetailPageView, { status: "not_found" }>;
  area: ProductArea;
  basePath: string;
  selectedOptions: VariantOptionValues;
};

type OptionConfig = {
  label: string;
  prompt: string;
  queryParam: string;
};

type OptionGroup = {
  key: keyof VariantOptionValues;
  label: string;
  prompt: string;
  values: string[];
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const OPTION_CONFIG = {
  color: {
    label: "Color",
    prompt: "Elegí color",
    queryParam: "color"
  },
  size: {
    label: "Talle",
    prompt: "Elegí talle",
    queryParam: "talle"
  },
  flavor: {
    label: "Sabor",
    prompt: "Elegí sabor",
    queryParam: "sabor"
  },
  weight: {
    label: "Peso",
    prompt: "Elegí peso",
    queryParam: "peso"
  },
  presentation: {
    label: "Presentación",
    prompt: "Elegí presentación",
    queryParam: "presentacion"
  }
} as const satisfies Record<keyof VariantOptionValues, OptionConfig>;

const OPTION_ORDER_BY_AREA = {
  [PRODUCT_AREA.clothing]: ["color", "size"],
  [PRODUCT_AREA.supplement]: ["flavor", "weight", "presentation"]
} as const satisfies Record<ProductArea, readonly (keyof VariantOptionValues)[]>;

export function getSelectedOptionsFromSearchParams(
  searchParams: ProductDetailSearchParams | undefined
): VariantOptionValues {
  return {
    color: getSearchParamString(searchParams?.[OPTION_CONFIG.color.queryParam]),
    size: getSearchParamString(searchParams?.[OPTION_CONFIG.size.queryParam]),
    flavor: getSearchParamString(searchParams?.[OPTION_CONFIG.flavor.queryParam]),
    weight: getSearchParamString(searchParams?.[OPTION_CONFIG.weight.queryParam]),
    presentation: getSearchParamString(
      searchParams?.[OPTION_CONFIG.presentation.queryParam]
    )
  };
}

export function StorefrontProductDetailPage({
  view,
  area,
  basePath,
  selectedOptions
}: ProductDetailPageProps) {
  if (view.status === "unavailable") {
    return <UnavailableProductDetail view={view} />;
  }

  const { product, selection } = view;
  const optionGroups = getOptionGroups(product, area);
  const galleryImages = product.images.length > 0 ? product.images : [];
  const primaryImage = galleryImages[0] ?? product.image;

  return (
    <section className={styles.detailPage} data-area={area}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href={view.backHref}>
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
          <span>{view.backLabel}</span>
        </Link>

        <div className={styles.layout}>
          <ProductGallery product={product} primaryImage={primaryImage} images={galleryImages} />

          <div className={styles.content}>
            <section className={styles.summary} aria-labelledby="product-detail-title">
              <p className={styles.context}>{product.contextLabel}</p>
              <h1 className={styles.title} id="product-detail-title">
                {product.name}
              </h1>
              <p className={styles.price}>
                {priceFormatter.format(selection.effectivePriceArs)}
              </p>
              <p className={styles.description}>{product.description}</p>
              <span className={styles.availability} data-state={getAvailabilityState(selection)}>
                {selection.availabilityLabel}
              </span>
            </section>

            <VariantSelectors
              area={area}
              basePath={basePath}
              groups={optionGroups}
              product={product}
              selectedOptions={selectedOptions}
            />

            <PurchaseReadiness product={product} selection={selection} />

            <div className={styles.contactActions}>
              <a
                className={styles.contactLink}
                href={contactLink.href}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle aria-hidden="true" size={19} strokeWidth={2} />
                <span>Consultar por WhatsApp</span>
              </a>
              <a
                className={styles.secondaryLink}
                href={instagramLink.href}
                target="_blank"
                rel="noreferrer"
              >
                Ver Instagram
              </a>
            </div>

            <TrustDetails area={area} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductGallery({
  product,
  primaryImage,
  images
}: {
  product: PublicProductDetailView;
  primaryImage: PublicProductImageView | null;
  images: PublicProductImageView[];
}) {
  return (
    <section className={styles.gallery} aria-label={`Fotos de ${product.name}`}>
      <div className={styles.heroImageFrame}>
        {primaryImage ? (
          <Image
            className={styles.heroImage}
            src={primaryImage.path}
            alt={primaryImage.alt}
            fill
            priority
            sizes="(min-width: 760px) 58vw, 100vw"
          />
        ) : (
          <div className={styles.imageFallback}>Sin imagen</div>
        )}
      </div>

      {images.length > 1 ? (
        <div className={styles.thumbnailGrid}>
          {images.map((image) => (
            <div className={styles.thumbnail} key={image.id}>
              <Image
                src={image.path}
                alt={image.alt}
                fill
                sizes="(min-width: 760px) 12vw, 25vw"
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function VariantSelectors({
  area,
  basePath,
  groups,
  product,
  selectedOptions
}: {
  area: ProductArea;
  basePath: string;
  groups: OptionGroup[];
  product: PublicProductDetailView;
  selectedOptions: VariantOptionValues;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className={styles.variantPanel} aria-label="Opciones del producto">
      {groups.map((group) => (
        <div key={group.key}>
          <div className={styles.selectorHeader}>
            <p className={styles.selectorLabel}>{group.prompt}</p>
            {area === PRODUCT_AREA.clothing && group.key === "size" ? (
              <a className={styles.sizeGuideLink} href="#guia-de-talles">
                Guía de talles
              </a>
            ) : null}
          </div>

          <div className={styles.optionList}>
            {group.values.map((value) => {
              const isActive = selectedOptions[group.key] === value;
              const isAvailable = isOptionAvailable({
                product,
                selectedOptions,
                optionKey: group.key,
                optionValue: value
              });

              return (
                <Link
                  className={styles.optionLink}
                  data-active={isActive}
                  data-available={isAvailable}
                  scroll={false}
                  href={getOptionHref({
                    area,
                    basePath,
                    selectedOptions,
                    optionKey: group.key,
                    optionValue: value
                  })}
                  key={value}
                  aria-current={isActive ? "true" : undefined}
                >
                  {value}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function PurchaseReadiness({
  product,
  selection
}: {
  product: PublicProductDetailView;
  selection: ProductVariantSelectionView;
}) {
  return (
    <AddToCartControl
      productId={product.id}
      productName={product.name}
      variantId={selection.selectedVariant?.id}
      canAddToCart={selection.canAddToCart}
      readinessCopy={getReadinessCopy(selection)}
    />
  );
}

function TrustDetails({ area }: { area: ProductArea }) {
  return (
    <section className={styles.trustList} aria-label="Información de compra">
      <div className={styles.trustItem}>
        <Truck aria-hidden="true" size={21} strokeWidth={1.9} />
        <div>
          <h2>Envío y retiro</h2>
          <p>
            Envío nacional por Correo Argentino por ARS 5.000 y retiro gratis en
            Benavidez/Zona Norte después del pago verificado.
          </p>
          <p>
            <Link href="/envios-y-cambios">Ver envíos y cambios</Link>
          </p>
        </div>
      </div>

      <div className={styles.trustItem}>
        <RotateCcw aria-hidden="true" size={21} strokeWidth={1.9} />
        <div>
          <h2>Cambios</h2>
          <p>
            Escribinos dentro de los 7 días. El producto debe estar sin uso y en
            condiciones originales.
          </p>
        </div>
      </div>

      {area === PRODUCT_AREA.clothing ? (
        <div className={styles.sizeGuide} id="guia-de-talles">
          <div>
            <h2>
              <Ruler aria-hidden="true" size={18} strokeWidth={1.9} /> Guía de talles
            </h2>
            <p>
              Si estás entre dos talles o querés confirmar medidas antes de comprar,
              escribinos por WhatsApp y te ayudamos con la prenda publicada.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UnavailableProductDetail({
  view
}: {
  view: Extract<ProductDetailPageView, { status: "unavailable" }>;
}) {
  return (
    <section className={styles.unavailablePage}>
      <div className={styles.unavailablePanel}>
        <Link className={styles.backLink} href={view.backHref}>
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
          <span>{view.backLabel}</span>
        </Link>
        <h1>{view.title}</h1>
        <p>{view.description}</p>
        <div className={styles.unavailableActions}>
          <Link className={styles.secondaryLink} href={view.backHref}>
            {view.backLabel}
          </Link>
          <a
            className={styles.contactLink}
            href={contactLink.href}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function getOptionGroups(
  product: PublicProductDetailView,
  area: ProductArea
): OptionGroup[] {
  return OPTION_ORDER_BY_AREA[area]
    .map((optionKey) => {
      const values = getUniqueOptionValues(product, optionKey);
      const config = OPTION_CONFIG[optionKey];

      return {
        key: optionKey,
        label: config.label,
        prompt: config.prompt,
        values
      };
    })
    .filter((group) => group.values.length > 0);
}

function getUniqueOptionValues(
  product: PublicProductDetailView,
  optionKey: keyof VariantOptionValues
): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const variant of product.variants) {
    const value = variant.options[optionKey];

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    values.push(value);
  }

  return values;
}

function isOptionAvailable({
  product,
  selectedOptions,
  optionKey,
  optionValue
}: {
  product: PublicProductDetailView;
  selectedOptions: VariantOptionValues;
  optionKey: keyof VariantOptionValues;
  optionValue: string;
}): boolean {
  const nextOptions = {
    ...selectedOptions,
    [optionKey]: optionValue
  };

  return product.variants.some((variant) => {
    if (!variant.isAvailable) {
      return false;
    }

    return Object.entries(nextOptions).every(([key, value]) => {
      if (!value) {
        return true;
      }

      return variant.options[key as keyof VariantOptionValues] === value;
    });
  });
}

function getOptionHref({
  area,
  basePath,
  selectedOptions,
  optionKey,
  optionValue
}: {
  area: ProductArea;
  basePath: string;
  selectedOptions: VariantOptionValues;
  optionKey: keyof VariantOptionValues;
  optionValue: string;
}): string {
  const params = new URLSearchParams();
  const nextOptions = {
    ...selectedOptions,
    [optionKey]: optionValue
  };

  for (const key of OPTION_ORDER_BY_AREA[area]) {
    const value = nextOptions[key];

    if (value) {
      params.set(OPTION_CONFIG[key].queryParam, value);
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function getAvailabilityState(selection: ProductVariantSelectionView): string {
  if (selection.status !== "selected") {
    return "blocked";
  }

  return selection.canAddToCart ? "available" : "out";
}

function getReadinessCopy(selection: ProductVariantSelectionView): string {
  if (selection.status === "no_selection") {
    return "Elegí una variante disponible para continuar.";
  }

  if (selection.status === "unavailable_selection") {
    return "Esa combinación no está disponible.";
  }

  if (!selection.canAddToCart) {
    return "La variante seleccionada no tiene stock.";
  }

  return "Variante seleccionada y disponible.";
}

function getSearchParamString(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}
