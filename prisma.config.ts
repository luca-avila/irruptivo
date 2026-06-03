// Prisma configuration (replaces the deprecated `package.json#prisma` block).
// A config file disables Prisma's automatic .env loading, so we load it
// explicitly to keep `DATABASE_URL` available for migrate/seed/validate.
import "dotenv/config";
import path from "node:path";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
