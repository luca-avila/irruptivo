import {
  PRODUCT_AREA,
  listActiveProductsByArea,
  type CatalogProductRecord,
  type PublicProductCardView
} from "../catalog/catalog";

const HOMEPAGE_FEATURED_LIMIT = {
  clothing: 3,
  supplements: 4
} as const;

export type HomepageFeaturedProducts = {
  clothing: PublicProductCardView[];
  supplements: PublicProductCardView[];
};

export function getHomepageFeaturedProducts(
  products: readonly CatalogProductRecord[]
): HomepageFeaturedProducts {
  return {
    clothing: listProductsByArea(PRODUCT_AREA.clothing, products).slice(
      0,
      HOMEPAGE_FEATURED_LIMIT.clothing
    ),
    supplements: listProductsByArea(PRODUCT_AREA.supplement, products).slice(
      0,
      HOMEPAGE_FEATURED_LIMIT.supplements
    )
  };
}

function listProductsByArea(
  area: typeof PRODUCT_AREA.clothing | typeof PRODUCT_AREA.supplement,
  products: readonly CatalogProductRecord[]
): PublicProductCardView[] {
  return listActiveProductsByArea(area, products);
}
