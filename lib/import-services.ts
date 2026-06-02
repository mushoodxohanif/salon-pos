/**
 * Idempotent import from data/services-catalog.json into service_categories + services.
 *
 * Usage:
 *   bun lib/import-services.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { serviceCategories, services } from "../src/lib/db/schema";
import type { ServicesCatalog } from "./catalog-types";
import { printValidationReport, summarizeCatalog, validateCatalog } from "./validate-catalog";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "data/services-catalog.json");

function loadCatalog(): ServicesCatalog {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw) as ServicesCatalog;
}

async function importCatalog(catalog: ServicesCatalog, dryRun: boolean) {
  const db = getDb();
  let categoriesUpserted = 0;
  let servicesInserted = 0;
  let servicesUpdated = 0;

  for (const category of catalog.categories) {
    const [existingCategory] = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.nameEn, category.name_en))
      .limit(1);

    let categoryId: string;

    if (existingCategory) {
      categoryId = existingCategory.id;
      if (
        existingCategory.nameAr !== category.name_ar ||
        existingCategory.sortOrder !== category.sort_order
      ) {
        if (!dryRun) {
          await db
            .update(serviceCategories)
            .set({
              nameAr: category.name_ar,
              sortOrder: category.sort_order,
            })
            .where(eq(serviceCategories.id, categoryId));
        }
        categoriesUpserted++;
      }
    } else {
      if (dryRun) {
        categoryId = "dry-run-category-id";
      } else {
        const [created] = await db
          .insert(serviceCategories)
          .values({
            nameEn: category.name_en,
            nameAr: category.name_ar,
            sortOrder: category.sort_order,
          })
          .returning();
        categoryId = created.id;
      }
      categoriesUpserted++;
    }

    for (const service of category.services) {
      const isActive = service.is_active !== false;

      const [existingService] = dryRun
        ? []
        : await db
            .select()
            .from(services)
            .where(and(eq(services.categoryId, categoryId), eq(services.nameEn, service.name_en)))
            .limit(1);

      if (existingService) {
        const needsUpdate =
          existingService.nameAr !== service.name_ar ||
          existingService.isActive !== isActive ||
          JSON.stringify(existingService.priceTiers) !== JSON.stringify(service.price_tiers);

        if (needsUpdate) {
          if (!dryRun) {
            await db
              .update(services)
              .set({
                nameAr: service.name_ar,
                priceTiers: service.price_tiers,
                isActive,
              })
              .where(eq(services.id, existingService.id));
          }
          servicesUpdated++;
        }
      } else {
        if (!dryRun) {
          await db.insert(services).values({
            categoryId,
            nameEn: service.name_en,
            nameAr: service.name_ar,
            priceTiers: service.price_tiers,
            isActive,
          });
        }
        servicesInserted++;
      }
    }
  }

  return { categoriesUpserted, servicesInserted, servicesUpdated };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Catalog not found: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = loadCatalog();
  console.log(`Loaded catalog from ${CATALOG_PATH}`);
  summarizeCatalog(catalog);

  if (!printValidationReport(validateCatalog(catalog))) {
    process.exit(1);
  }

  if (dryRun) {
    console.log("");
    console.log("Dry run — no database changes will be made.");
  }

  const { categoriesUpserted, servicesInserted, servicesUpdated } = await importCatalog(
    catalog,
    dryRun,
  );

  console.log("");
  console.log(dryRun ? "Dry run complete." : "Import complete.");
  console.log(`  Categories upserted: ${categoriesUpserted}`);
  console.log(`  Services inserted:   ${servicesInserted}`);
  console.log(`  Services updated:    ${servicesUpdated}`);
}

main().catch((error) => {
  console.error("import-services failed:", error);
  process.exit(1);
});
