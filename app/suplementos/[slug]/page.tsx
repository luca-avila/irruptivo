import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PRODUCT_AREA } from "../../../src/catalog/catalog";
import { loadCatalogProducts } from "../../../src/catalog/product-repository";
import { getProductDetailPageView } from "../../../src/catalog/product-detail";
import {
  StorefrontProductDetailPage,
  getSelectedOptionsFromSearchParams,
  type ProductDetailSearchParams
} from "../../../src/storefront/components/product-detail-page";

type SupplementProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<ProductDetailSearchParams>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: SupplementProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const products = await loadCatalogProducts();
  const view = getProductDetailPageView({
    area: PRODUCT_AREA.supplement,
    slug,
    selectedOptions: {},
    products
  });

  if (view.status === "active") {
    return {
      title: `${view.product.name} | Irruptivo`,
      description: view.product.description
    };
  }

  return {
    title: "Producto no disponible | Irruptivo",
    description: "Suplemento no disponible en Irruptivo."
  };
}

export default async function SupplementProductDetailPage({
  params,
  searchParams
}: SupplementProductDetailPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedOptions = getSelectedOptionsFromSearchParams(resolvedSearchParams);
  const products = await loadCatalogProducts();
  const view = getProductDetailPageView({
    area: PRODUCT_AREA.supplement,
    slug,
    selectedOptions,
    products
  });

  if (view.status === "not_found") {
    notFound();
  }

  return (
    <StorefrontProductDetailPage
      view={view}
      area={PRODUCT_AREA.supplement}
      basePath={`/suplementos/${slug}`}
      selectedOptions={selectedOptions}
    />
  );
}
