import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  getProductCardView,
  type CatalogProductRecord,
  type PublicProductCardView,
  demoCatalogProducts
} from "./catalog";

const SUPPLEMENT_FILTER_ALL = "todo";

const CANONICAL_SUPPLEMENT_TYPES = [
  { value: "proteina", label: "Proteína" },
  { value: "creatina", label: "Creatina" },
  { value: "pre-entreno", label: "Pre-entreno" }
] as const;

type SupplementListingInput = {
  products?: readonly CatalogProductRecord[];
  selectedType?: string | null;
};

type SupplementTypeFilterDefinition = {
  value: string;
  label: string;
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
  products = demoCatalogProducts,
  selectedType = null
}: SupplementListingInput = {}): SupplementListingView {
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

function getSupplementTypeFilters(
  products: readonly CatalogProductRecord[],
  selectedType: string | null
): SupplementTypeFilterView[] {
  const typeCounts = getSupplementTypeCounts(products);
  const canonicalFilters = CANONICAL_SUPPLEMENT_TYPES.map((type) =>
    getSupplementTypeFilterView(type, typeCounts, selectedType)
  );
  const extraTypeFilters = [...typeCounts.keys()]
    .filter(
      (typeValue) =>
        !CANONICAL_SUPPLEMENT_TYPES.some(
          (canonicalType) => canonicalType.value === typeValue
        )
    )
    .sort((first, second) =>
      getSupplementTypeLabel(first).localeCompare(getSupplementTypeLabel(second), "es-AR")
    )
    .map((typeValue) =>
      getSupplementTypeFilterView(
        {
          value: typeValue,
          label: getSupplementTypeLabel(typeValue)
        },
        typeCounts,
        selectedType
      )
    );

  return [
    {
      label: "Todo",
      value: SUPPLEMENT_FILTER_ALL,
      href: "/suplementos",
      isActive: selectedType === null,
      productCount: products.length
    },
    ...canonicalFilters,
    ...extraTypeFilters
  ];
}

function getSupplementTypeFilterView(
  type: SupplementTypeFilterDefinition,
  typeCounts: ReadonlyMap<string, number>,
  selectedType: string | null
): SupplementTypeFilterView {
  return {
    label: type.label,
    value: type.value,
    href: `/suplementos?tipo=${encodeURIComponent(type.value)}`,
    isActive: selectedType === type.value,
    productCount: typeCounts.get(type.value) ?? 0
  };
}

function getSupplementTypeCounts(
  products: readonly CatalogProductRecord[]
): Map<string, number> {
  return products.reduce((counts, product) => {
    const typeValue = getSupplementTypeValue(product.supplementType);
    counts.set(typeValue, (counts.get(typeValue) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
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
  return normalizeSupplementTypeValue(type) ?? "suplementos";
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

function getSupplementTypeLabel(type: string | null | undefined): string {
  const typeValue = getSupplementTypeValue(type);
  const canonicalType = CANONICAL_SUPPLEMENT_TYPES.find(
    (candidate) => candidate.value === typeValue
  );

  if (canonicalType) {
    return canonicalType.label;
  }

  return typeValue
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPriceArs(priceArs: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(priceArs);
}
