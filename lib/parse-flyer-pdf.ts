/**
 * Extract raw text from flyer PDF → draft catalog JSON.
 *
 * Usage:
 *   bun lib/parse-flyer-pdf.ts [path-to-pdf]
 *
 * Writes data/services-catalog.draft.json for manual curation into
 * data/services-catalog.json (source of truth for import).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import { type CatalogCategory, parsePriceString, type ServicesCatalog } from "./catalog-types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PDF = path.join(ROOT, "Black and Gold Modern Hair Salon Flyer.pdf");
const DRAFT_OUT = path.join(ROOT, "data/services-catalog.draft.json");

/** Curated category metadata keyed by English name from PDF page headers. */
const CATEGORY_META: Record<string, { name_ar: string; sort_order: number }> = {
  Waxing: { name_ar: "إزالة الشعر", sort_order: 1 },
  Bleaching: { name_ar: "تبييض", sort_order: 2 },
  Facials: { name_ar: "تنظيفات", sort_order: 3 },
  Eyebrows: { name_ar: "حواجب", sort_order: 4 },
  "Hair Color": { name_ar: "صبغ الشعر", sort_order: 5 },
  Highlights: { name_ar: "شيم", sort_order: 6 },
  Straightening: { name_ar: "فرد الشعر", sort_order: 7 },
  "Hair Cut": { name_ar: "قص الشعر", sort_order: 8 },
  "Hair Styling": { name_ar: "تسريحات", sort_order: 9 },
  Makeup: { name_ar: "مكياج", sort_order: 10 },
  Manicure: { name_ar: "مانيكير", sort_order: 11 },
  Pedicure: { name_ar: "بيديكير", sort_order: 12 },
  Nails: { name_ar: "أظافر", sort_order: 13 },
  Treatments: { name_ar: "علاجات", sort_order: 14 },
  "Body Massage": { name_ar: "مساج الجسم", sort_order: 15 },
  "Steam Bath": { name_ar: "حمام بخار", sort_order: 16 },
  Additionals: { name_ar: "إضافات", sort_order: 17 },
  Extras: { name_ar: "إضافات", sort_order: 17 },
};

type PageDraft = {
  category_en: string;
  services: Array<{ name_en: string; price_raw: string }>;
};

/** Hand-maintained page maps from PDF layout (EN service name → price string). */
const PAGE_SERVICES: PageDraft[] = [
  {
    category_en: "Waxing",
    services: [
      { name_en: "Half/Full Arm", price_raw: "3/6" },
      { name_en: "Half/Full Legs", price_raw: "4/8" },
      { name_en: "Underarms", price_raw: "2" },
      { name_en: "Bikini", price_raw: "8" },
      { name_en: "Full Face", price_raw: "5" },
      { name_en: "Back", price_raw: "10" },
      { name_en: "Chest", price_raw: "5" },
      { name_en: "Front/Back Neck", price_raw: "5" },
      { name_en: "Full Body", price_raw: "30" },
    ],
  },
  {
    category_en: "Bleaching",
    services: [
      { name_en: "Normal Face Bleach", price_raw: "5" },
      { name_en: "Herbal Face Bleach", price_raw: "7" },
      { name_en: "Half/Full Arms", price_raw: "3/6" },
      { name_en: "Half/Full Legs", price_raw: "4/8" },
      { name_en: "Full Body Normal", price_raw: "20" },
      { name_en: "Full Body Herbal", price_raw: "25" },
    ],
  },
  {
    category_en: "Facials",
    services: [
      { name_en: "Herbal Facial", price_raw: "10" },
      { name_en: "Fruit Facial", price_raw: "15" },
      { name_en: "Whitening Facial", price_raw: "20" },
      { name_en: "Acne Treatment", price_raw: "-" },
      { name_en: "Laser Facial", price_raw: "25" },
      { name_en: "Hydra Facial", price_raw: "40" },
      { name_en: "Carbon Laser Facial", price_raw: "50" },
    ],
  },
  {
    category_en: "Eyebrows",
    services: [
      { name_en: "Eyebrows Threading", price_raw: "3" },
      { name_en: "Eyebrows Color", price_raw: "3/5" },
      { name_en: "Eyebrows Bleaching", price_raw: "3" },
      { name_en: "Eyebrows Waxing", price_raw: "2" },
      { name_en: "Upper Lips Thread/wax", price_raw: "1" },
      { name_en: "Chin Thread/wax", price_raw: "1" },
      { name_en: "Full Face Thread+Mask", price_raw: "5" },
      { name_en: "Eyebrows Blading", price_raw: "2" },
      { name_en: "Full Face Blading", price_raw: "5/10" },
    ],
  },
  {
    category_en: "Hair Color",
    services: [
      { name_en: "Root touch up", price_raw: "10/15/20" },
      { name_en: "Refreshing", price_raw: "15/20/30" },
      { name_en: "Front head", price_raw: "10/15/20" },
      { name_en: "Full head", price_raw: "-" },
      { name_en: "Blonde Shades Full head", price_raw: "20/25/30+70" },
      { name_en: "Dark shades Full head", price_raw: "15/20/25/30" },
    ],
  },
  {
    category_en: "Highlights",
    services: [
      { name_en: "Refreshing", price_raw: "15/20/30" },
      { name_en: "Front Head", price_raw: "10/15/20" },
      { name_en: "Full Head", price_raw: "15/20/25+40" },
      { name_en: "Balayage", price_raw: "20/25+50" },
      { name_en: "Lowlights/Highlights", price_raw: "15/20/25+50" },
    ],
  },
  {
    category_en: "Straightening",
    services: [
      { name_en: "Keratin/Protein Front", price_raw: "-" },
      { name_en: "Keratin/Protein Full", price_raw: "20/25+50" },
      { name_en: "Rebonding Full", price_raw: "35/40/45+100" },
      { name_en: "Smoothening Full", price_raw: "25/30/35+50" },
    ],
  },
  {
    category_en: "Hair Cut",
    services: [
      { name_en: "Simple Trimming", price_raw: "5" },
      { name_en: "Front Layers", price_raw: "5" },
      { name_en: "Full Layers", price_raw: "10/15" },
      { name_en: "Different Cuts", price_raw: "10/15" },
      { name_en: "Cut Styling", price_raw: "5" },
      { name_en: "Baby Full Trimming", price_raw: "5" },
      { name_en: "Baby Layers", price_raw: "5/10" },
      { name_en: "Baby Front", price_raw: "3" },
    ],
  },
  {
    category_en: "Hair Styling",
    services: [
      { name_en: "Blowdryer+Iron", price_raw: "5/7/10+20" },
      { name_en: "Curls/Wavy", price_raw: "5/7/10+20" },
      { name_en: "Simple Iron", price_raw: "5/7+15" },
      { name_en: "Extensions Per Pec", price_raw: "3+" },
      { name_en: "Stencils 10 Pec", price_raw: "5+" },
      { name_en: "Party Hairstyle", price_raw: "10/15+30" },
      { name_en: "Bridal Hairstyle", price_raw: "40/50/60" },
    ],
  },
  {
    category_en: "Makeup",
    services: [
      { name_en: "Casual", price_raw: "15" },
      { name_en: "Party", price_raw: "20" },
      { name_en: "Nude", price_raw: "25" },
      { name_en: "Bridal", price_raw: "50/60+100" },
      { name_en: "Normal Eyelashes", price_raw: "3/5/7" },
      { name_en: "Eyelashes Extensions", price_raw: "15/20/25/30" },
    ],
  },
  {
    category_en: "Manicure",
    services: [
      { name_en: "Basic Manicure", price_raw: "7" },
      { name_en: "French Manicure", price_raw: "7" },
      { name_en: "Whitening Manicure", price_raw: "10" },
      { name_en: "Paraffin Manicure", price_raw: "15" },
    ],
  },
  {
    category_en: "Pedicure",
    services: [
      { name_en: "Basic Pedicure", price_raw: "7" },
      { name_en: "French Pedicure", price_raw: "7" },
      { name_en: "Whitening Pedicure", price_raw: "10" },
      { name_en: "Paraffin Pedicure", price_raw: "15" },
    ],
  },
  {
    category_en: "Nails",
    services: [
      { name_en: "Nail Shaping", price_raw: "5" },
      { name_en: "Basic Nail polish", price_raw: "2" },
      { name_en: "Nail Art", price_raw: "7" },
      { name_en: "Nail Extensions 3 Days", price_raw: "-" },
      { name_en: "Nail Extensions 6 Days", price_raw: "7" },
      { name_en: "Acrylic Nail", price_raw: "10" },
      { name_en: "Acrylic Nail 15/30 Days", price_raw: "20/25" },
    ],
  },
  {
    category_en: "Treatments",
    services: [
      { name_en: "Hair Fall", price_raw: "10" },
      { name_en: "Dandruff", price_raw: "10" },
      { name_en: "Dry Damaged", price_raw: "10" },
      { name_en: "Color Damaged", price_raw: "15" },
      { name_en: "Relaxing", price_raw: "10" },
    ],
  },
  {
    category_en: "Body Massage",
    services: [
      { name_en: "Full Body 1hr", price_raw: "20" },
      { name_en: "Legs 30min", price_raw: "10" },
      { name_en: "Back 30min", price_raw: "5" },
      { name_en: "Belly 30min", price_raw: "5" },
      { name_en: "Arms+Neck 30min", price_raw: "5" },
      { name_en: "Head 30min", price_raw: "5" },
    ],
  },
  {
    category_en: "Steam Bath",
    services: [
      { name_en: "Basic Steam Bath", price_raw: "15" },
      { name_en: "Moroccan Herbal Bath", price_raw: "20" },
      { name_en: "Turkish Steam Bath", price_raw: "20" },
      { name_en: "Special Moroccan Bath", price_raw: "30" },
      { name_en: "Bridal Moroccan Bath", price_raw: "40/50" },
    ],
  },
  {
    category_en: "Extras",
    services: [
      { name_en: "Moroccan Loofah", price_raw: "3" },
      { name_en: "Artificial Nail", price_raw: "5/7/10" },
      { name_en: "Henna Simple/Color", price_raw: "1/2/3" },
      { name_en: "Hair Oil", price_raw: "5/10" },
      { name_en: "Hair Fall Oil", price_raw: "10/15" },
      { name_en: "Beauty Action Cream", price_raw: "7" },
      { name_en: "Oil Application Roller", price_raw: "3" },
      { name_en: "Eyelashes Extensions Fake Hair", price_raw: "2/3/5" },
      { name_en: "Extensions Original Human Hair", price_raw: "40/120" },
    ],
  },
];

async function extractPdfText(pdfPath: string): Promise<string> {
  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function buildDraftCatalog(): ServicesCatalog {
  const categories: CatalogCategory[] = PAGE_SERVICES.map((page) => {
    const meta = CATEGORY_META[page.category_en];
    if (!meta) {
      throw new Error(`Missing category metadata for ${page.category_en}`);
    }

    return {
      name_en: page.category_en,
      name_ar: meta.name_ar,
      sort_order: meta.sort_order,
      services: page.services.map((svc) => {
        const { tiers, isActive } = parsePriceString(svc.price_raw);
        return {
          name_en: svc.name_en,
          name_ar: "TODO",
          price_tiers: tiers,
          ...(isActive ? {} : { is_active: false }),
        };
      }),
    };
  });

  return { categories };
}

function verifyPdfContainsServices(pdfText: string): string[] {
  const warnings: string[] = [];
  for (const page of PAGE_SERVICES) {
    if (!pdfText.includes(page.category_en) && page.category_en !== "Extras") {
      warnings.push(`Category not found in PDF text: ${page.category_en}`);
    }
    for (const svc of page.services) {
      const needle = svc.name_en.split("/")[0].slice(0, 8);
      if (!pdfText.includes(needle) && !pdfText.includes(svc.name_en.slice(0, 8))) {
        warnings.push(`Service may be missing from PDF: ${svc.name_en}`);
      }
    }
  }
  return warnings;
}

async function main() {
  const pdfPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PDF;

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Reading PDF: ${pdfPath}`);
  const pdfText = await extractPdfText(pdfPath);
  const pageCount = (pdfText.match(/-- \d+ of \d+ --/g) ?? []).length;
  console.log(`Extracted text (${pageCount} page markers detected).`);

  const warnings = verifyPdfContainsServices(pdfText);
  if (warnings.length) {
    console.warn("PDF verification warnings:");
    for (const w of warnings) {
      console.warn(`  - ${w}`);
    }
  } else {
    console.log("PDF verification: all categories/services found in extracted text.");
  }

  const catalog = buildDraftCatalog();
  fs.writeFileSync(DRAFT_OUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const serviceCount = catalog.categories.reduce(
    (n: number, c: CatalogCategory) => n + c.services.length,
    0,
  );
  console.log(`Draft catalog written: ${DRAFT_OUT}`);
  console.log(`  ${catalog.categories.length} categories, ${serviceCount} services`);
  console.log("");
  console.log("Next: curate Arabic names in data/services-catalog.json, then run:");
  console.log("  bun lib/import-services.ts");
}

main().catch((error) => {
  console.error("parse-flyer-pdf failed:", error);
  process.exit(1);
});
