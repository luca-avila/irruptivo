import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  getProductCardView,
  type CatalogProductRecord,
  type PublicProductCardView
} from "./catalog";

const SUPPLEMENT_FILTER_ALL = "todo";

// Suplementos sin "Tipo de suplemento" cargado caen en este bucket: se listan
// bajo "Todo" pero no generan una chip de filtro propia.
const SUPPLEMENT_FALLBACK_TYPE = "suplementos";
const SUPPLEMENT_FALLBACK_LABEL = "Suplementos";

type SupplementListingInput = {
  products: readonly CatalogProductRecord[];
  selectedType?: string | null;
};

export type SupplementTypeFilterView = {
  label: string;
  value: string;
  href: string;
  isActive: boolean;
  productCount: number;
};

export type SupplementProductCardView = PublicProductCardView & {
  href: string;
  typeLabel: string;
  priceLabel: string;
};

export type SupplementListingEmptyState = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export type SupplementListingView = {
  products: SupplementProductCardView[];
  filters: SupplementTypeFilterView[];
  emptyState: SupplementListingEmptyState | null;
  selectedType: string | null;
  totalProductCount: number;
};

export function listSupplementProducts({
  products,
  selectedType = null
}: SupplementListingInput): SupplementListingView {
  const activeSupplements = products.filter(
    (product) =>
      product.area === PRODUCT_AREA.supplement &&
      product.status === PRODUCT_STATUS.active
  );
  const selectedTypeKey = normalizeSupplementTypeValue(selectedType);
  const filteredSupplements = selectedTypeKey
    ? activeSupplements.filter(
        (product) => getSupplementTypeValue(product.supplementType) === selectedTypeKey
      )
    : activeSupplements;

  const productViews = filteredSupplements.map(getSupplementProductCardView);

  return {
    products: productViews,
    filters: getSupplementTypeFilters(activeSupplements, selectedTypeKey),
    emptyState: getSupplementListingEmptyState(
      activeSupplements.length,
      productViews.length
    ),
    selectedType: selectedTypeKey,
    totalProductCount: activeSupplements.length
  };
}

function getSupplementProductCardView(
  product: CatalogProductRecord
): SupplementProductCardView {
  const cardView = getProductCardView(product);
  const typeLabel = getSupplementTypeLabel(product.supplementType);

  return {
    ...cardView,
    contextLabel: typeLabel,
    href: `/suplementos/${cardView.slug}`,
    typeLabel,
    priceLabel: formatPriceArs(cardView.priceArs)
  };
}

// Las categorías que aparecen son las que el admin carga en los productos: cada
// "Tipo de suplemento" distinto genera su chip. Si no quedan productos con un
// tipo, la chip desaparece sola. Los suplementos sin tipo no generan chip.
function getSupplementTypeFilters(
  products: readonly CatalogProductRecord[],
  selectedType: string | null
): SupplementTypeFilterView[] {
  const typeFilters = [...getSupplementTypeEntries(products).values()]
    .filter((entry) => entry.value !== SUPPLEMENT_FALLBACK_TYPE)
    .sort((first, second) => first.label.localeCompare(second.label, "es-AR"))
    .map((entry) => ({
      label: entry.label,
      value: entry.value,
      href: `/suplementos?tipo=${encodeURIComponent(entry.value)}`,
      isActive: selectedType === entry.value,
      productCount: entry.count
    }));

  return [
    {
      label: "Todo",
      value: SUPPLEMENT_FILTER_ALL,
      href: "/suplementos",
      isActive: selectedType === null,
      productCount: products.length
    },
    ...typeFilters
  ];
}

type SupplementTypeEntry = {
  value: string;
  label: string;
  count: number;
};

function getSupplementTypeEntries(
  products: readonly CatalogProductRecord[]
): Map<string, SupplementTypeEntry> {
  return products.reduce((entries, product) => {
    const value = getSupplementTypeValue(product.supplementType);
    const existing = entries.get(value);

    if (existing) {
      existing.count += 1;
    } else {
      entries.set(value, {
        value,
        label: getSupplementTypeLabel(product.supplementType),
        count: 1
      });
    }

    return entries;
  }, new Map<string, SupplementTypeEntry>());
}

function getSupplementListingEmptyState(
  totalProductCount: number,
  visibleProductCount: number
): SupplementListingEmptyState | null {
  if (totalProductCount === 0) {
    return {
      title: "Todavía no hay suplementos disponibles.",
      description: "Mientras tanto podés seguir explorando la colección principal.",
      actionLabel: "Ver colección",
      actionHref: "/coleccion"
    };
  }

  if (visibleProductCount === 0) {
    return {
      title: "No hay suplementos para este filtro.",
      description: "Probá con otro tipo o volvé a ver todos los suplementos activos.",
      actionLabel: "Ver todos",
      actionHref: "/suplementos"
    };
  }

  return null;
}

function getSupplementTypeValue(type: string | null | undefined): string {
  return normalizeSupplementTypeValue(type) ?? SUPPLEMENT_FALLBACK_TYPE;
}

function normalizeSupplementTypeValue(type: string | null | undefined): string | null {
  if (!type) {
    return null;
  }

  const value = type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!value || value === SUPPLEMENT_FILTER_ALL) {
    return null;
  }

  return value;
}

// Mostramos el "Tipo de suplemento" tal como lo escribió el admin (respetando
// acentos y mayúsculas); el bucket sin tipo usa la etiqueta genérica.
function getSupplementTypeLabel(type: string | null | undefined): string {
  return type?.trim() || SUPPLEMENT_FALLBACK_LABEL;
}

function formatPriceArs(priceArs: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(priceArs);
}
