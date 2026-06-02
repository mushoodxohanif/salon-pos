import type { CatalogService, ServicesCatalog } from "./catalog-types";

export type ValidationIssue = {
  path: string;
  message: string;
};

export function validateCatalog(catalog: ServicesCatalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const categoryNames = new Set<string>();

  if (!catalog.categories.length) {
    issues.push({ path: "categories", message: "Catalog has no categories" });
    return issues;
  }

  for (const category of catalog.categories) {
    const catPath = `categories[${category.name_en}]`;
    validateBilingualName(category, catPath, issues);

    if (categoryNames.has(category.name_en)) {
      issues.push({ path: catPath, message: `Duplicate category: ${category.name_en}` });
    }
    categoryNames.add(category.name_en);

    if (category.services.length === 0) {
      issues.push({ path: catPath, message: "Category has no services" });
    }

    const serviceNames = new Set<string>();
    for (const service of category.services) {
      const svcPath = `${catPath}/services[${service.name_en}]`;
      validateService(service, svcPath, issues);

      if (serviceNames.has(service.name_en)) {
        issues.push({ path: svcPath, message: `Duplicate service: ${service.name_en}` });
      }
      serviceNames.add(service.name_en);
    }
  }

  return issues;
}

function validateBilingualName(
  entry: { name_en: string; name_ar: string },
  path: string,
  issues: ValidationIssue[],
) {
  if (!entry.name_en.trim()) {
    issues.push({ path, message: "Missing English name" });
  }
  if (!entry.name_ar.trim()) {
    issues.push({ path, message: "Missing Arabic name" });
  }
  if (entry.name_ar.trim() && !/[\u0600-\u06FF]/.test(entry.name_ar)) {
    issues.push({ path, message: "Arabic name does not contain Arabic script" });
  }
}

function validateService(service: CatalogService, path: string, issues: ValidationIssue[]) {
  validateBilingualName(service, path, issues);

  const isActive = service.is_active !== false;
  if (isActive && service.price_tiers.length === 0) {
    issues.push({ path, message: "Active service must have at least one price tier" });
  }

  for (const tier of service.price_tiers) {
    if (!tier.label.trim()) {
      issues.push({ path, message: "Price tier missing label" });
    }
    if (!Number.isFinite(tier.amount) || tier.amount <= 0) {
      issues.push({ path, message: `Invalid tier amount: ${tier.amount}` });
    }
    const rounded = Math.round(tier.amount * 1000) / 1000;
    if (rounded !== tier.amount) {
      issues.push({
        path,
        message: `Tier amount must have 3 decimal places: ${tier.amount}`,
      });
    }
  }
}

export function printValidationReport(issues: ValidationIssue[]): boolean {
  if (issues.length === 0) {
    console.log("Catalog validation passed.");
    return true;
  }

  console.error(`Catalog validation failed (${issues.length} issue(s)):`);
  for (const issue of issues) {
    console.error(`  [${issue.path}] ${issue.message}`);
  }
  return false;
}

export function summarizeCatalog(catalog: ServicesCatalog) {
  const serviceCount = catalog.categories.reduce((n, c) => n + c.services.length, 0);
  const activeCount = catalog.categories.reduce(
    (n, c) => n + c.services.filter((s) => s.is_active !== false).length,
    0,
  );
  const inactiveCount = serviceCount - activeCount;

  console.log(`Categories: ${catalog.categories.length}`);
  console.log(`Services:   ${serviceCount} (${activeCount} active, ${inactiveCount} inactive)`);
}
