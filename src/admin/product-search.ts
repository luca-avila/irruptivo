// Pure, bundler-safe name matching for the admin product search box.
// Kept free of catalog.ts imports so it can run inside the client component
// without pulling node:fs into the bundle.

// Mirrors the project's NFD-strip-diacritics + lowercase normalization
// convention (see normalizeSupplementTypeValue / slugify) so the search is
// accent-insensitive and case-insensitive.
export function normalizeProductSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function productNameMatchesQuery(name: string, query: string): boolean {
  const normalizedQuery = normalizeProductSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return normalizeProductSearchText(name).includes(normalizedQuery);
}
