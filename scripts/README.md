# Maintenance scripts

## Product image duplicate cleanup

`dedupe-product-images.ts` removes duplicated `ProductImage` rows created by repeated
admin uploads of the same source file. It defaults to dry-run mode.

Duplicate key:

```text
productId + sha256(card.webp + detail.webp + original.webp) + associatedColor + variantId
```

The script intentionally does not use `alt` text or image dimensions because admins can reuse
copy across distinct photos. It keeps the row with the lowest `sort_order` in each duplicate
group, deletes the other rows, deletes only media folders that no surviving row references,
and then renormalizes `sort_order` per product.

Local dry-run:

```bash
npx tsx scripts/dedupe-product-images.ts
```

Local apply:

```bash
npx tsx scripts/dedupe-product-images.ts --apply
```

Production dry-run against the Docker database and `media_data` volume from the deployed
repo directory:

```bash
docker run --rm --network irruptivo_default --env-file .env \
  -e IRRUPTIVO_MEDIA_ROOT=/var/lib/irruptivo/media \
  -v "$PWD":/app -w /app \
  -v irruptivo_media_data:/var/lib/irruptivo/media \
  node:20-bookworm-slim \
  sh -lc 'export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public" && npm ci && npx prisma generate && npx tsx scripts/dedupe-product-images.ts'
```

Production apply:

```bash
docker run --rm --network irruptivo_default --env-file .env \
  -e IRRUPTIVO_MEDIA_ROOT=/var/lib/irruptivo/media \
  -v "$PWD":/app -w /app \
  -v irruptivo_media_data:/var/lib/irruptivo/media \
  node:20-bookworm-slim \
  sh -lc 'export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public" && npm ci && npx prisma generate && npx tsx scripts/dedupe-product-images.ts --apply'
```
