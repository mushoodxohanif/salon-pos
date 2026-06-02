/**
 * One-off generator for curated services-catalog.json.
 * Run: bun lib/generate-curated-catalog.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePriceString, type ServicesCatalog } from "./catalog-types";

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/services-catalog.json",
);

const AR: Record<string, string> = {
  // Waxing
  "Half/Full Arm": "نصف/كامل الذراع",
  "Half/Full Legs": "نصف/كامل الساق",
  Underarms: "الإبط",
  Bikini: "خط البikini",
  "Full Face": "الوجه كامل",
  Back: "الظهر",
  Chest: "الصدر",
  "Front/Back Neck": "الرقبة أمام/خلف",
  "Full Body": "الجسم كامل",
  // Bleaching
  "Normal Face Bleach": "تبييض وجه عادي",
  "Herbal Face Bleach": "تبييض وجه بالأعشاب",
  "Half/Full Arms": "نصف/كامل الذراعين",
  "Full Body Normal": "تبييض جسم كامل عادي",
  "Full Body Herbal": "تبييض جسم كامل بالأعشاب",
  // Facials
  "Herbal Facial": "تنظيف بالأعشاب",
  "Fruit Facial": "تنظيف بالفواكه",
  "Whitening Facial": "تنظيف تفتيح",
  "Acne Treatment": "علاج حب الشباب",
  "Laser Facial": "تنظيف بالليزر",
  "Hydra Facial": "تنظيف هيدرا",
  "Carbon Laser Facial": "تنظيف كربون ليزر",
  // Eyebrows
  "Eyebrows Threading": "خيط الحواجب",
  "Eyebrows Color": "صبغ الحواجب",
  "Eyebrows Bleaching": "تبييض الحواجب",
  "Eyebrows Waxing": "إزالة شعر الحواجب",
  "Upper Lips Thread/wax": "خيط/شمع الشفة العليا",
  "Chin Thread/wax": "خيط/شمع الذقن",
  "Full Face Thread+Mask": "خيط وجه كامل + ماسك",
  "Eyebrows Blading": "رسم الحواجب",
  "Full Face Blading": "رسم الوجه كامل",
  // Hair Color
  "Root touch up": "تغطية الجذور",
  Refreshing: "تجديد",
  "Front head": "مقدمة الرأس",
  "Full head": "الرأس كامل",
  "Blonde Shades Full head": "درجات أشقر - رأس كامل",
  "Dark shades Full head": "درجات داكنة - رأس كامل",
  // Highlights
  "Front Head": "مقدمة الرأس",
  "Full Head": "الرأس كامل",
  Balayage: "بالياج",
  "Lowlights/Highlights": "هايلايت/لو لايت",
  // Straightening
  "Keratin/Protein Front": "كيراتين/بروتين - أمام",
  "Keratin/Protein Full": "كيراتين/بروتين - كامل",
  "Rebonding Full": "ريبوندينغ كامل",
  "Smoothening Full": "تمليس كامل",
  // Hair Cut
  "Simple Trimming": "قص بسيط",
  "Front Layers": "طبقات أمامية",
  "Full Layers": "طبقات كاملة",
  "Different Cuts": "قصات مختلفة",
  "Cut Styling": "قص وتصفيف",
  "Baby Full Trimming": "قص أطفال كامل",
  "Baby Layers": "طبقات أطفال",
  "Baby Front": "قص أطفال أمامي",
  // Hair Styling
  "Blowdryer+Iron": "سشوار + مكواة",
  "Curls/Wavy": "تجعيد/موج",
  "Simple Iron": "مكواة بسيطة",
  "Extensions Per Pec": "إضافات لكل قطعة",
  "Stencils 10 Pec": "استنسل 10 قطع",
  "Party Hairstyle": "تسريحة حفلة",
  "Bridal Hairstyle": "تسريحة عروس",
  // Makeup
  Casual: "مكياج يومي",
  Party: "مكياج حفلة",
  Nude: "مكياج نود",
  Bridal: "مكياج عروس",
  "Normal Eyelashes": "رموش عادية",
  "Eyelashes Extensions": "تركيب رموش",
  // Manicure
  "Basic Manicure": "مانيكير عادي",
  "French Manicure": "مانيكير فرنسي",
  "Whitening Manicure": "مانيكير تفتيح",
  "Paraffin Manicure": "مانيكير بالشمع",
  // Pedicure
  "Basic Pedicure": "بيديكير عادي",
  "French Pedicure": "بيديكير فرنسي",
  "Whitening Pedicure": "بيديكير تفتيح",
  "Paraffin Pedicure": "بيديكير بالشمع",
  // Nails
  "Nail Shaping": "تشكيل الأظافر",
  "Basic Nail polish": "طلاء أظافر عادي",
  "Nail Art": "فن الأظافر",
  "Nail Extensions 3 Days": "تركيب أظافر 3 أيام",
  "Nail Extensions 6 Days": "تركيب أظافر 6 أيام",
  "Acrylic Nail": "أظافر أكريليك",
  "Acrylic Nail 15/30 Days": "أظافر أكريليك 15/30 يوم",
  // Treatments
  "Hair Fall": "تساقط الشعر",
  Dandruff: "قشرة الرأس",
  "Dry Damaged": "شعر جاف تالف",
  "Color Damaged": "شعر تالف من الصبغ",
  Relaxing: "استرخاء الشعر",
  // Body Massage
  "Full Body 1hr": "جسم كامل - ساعة",
  "Legs 30min": "الساقين - 30 دقيقة",
  "Back 30min": "الظهر - 30 دقيقة",
  "Belly 30min": "البطن - 30 دقيقة",
  "Arms+Neck 30min": "الذراعين والرقبة - 30 دقيقة",
  "Head 30min": "الرأس - 30 دقيقة",
  // Steam Bath
  "Basic Steam Bath": "حمام بخار عادي",
  "Moroccan Herbal Bath": "حمام مغربي بالأعشاب",
  "Turkish Steam Bath": "حمام بخار تركي",
  "Special Moroccan Bath": "حمام مغربي خاص",
  "Bridal Moroccan Bath": "حمام مغربي للعروس",
  // Extras
  "Moroccan Loofah": "ليفة مغربية",
  "Artificial Nail": "ظفر صناعي",
  "Henna Simple/Color": "حناء بسيط/ملون",
  "Hair Oil": "زيت الشعر",
  "Hair Fall Oil": "زيت تساقط الشعر",
  "Beauty Action Cream": "كريم بيوتي أكشن",
  "Oil Application Roller": "بكرة تطبيق الزيت",
  "Eyelashes Extensions Fake Hair": "تركيب رموش شعر صناعي",
  "Extensions Original Human Hair": "تركيب شعر بشري أصلي",
};

const CATEGORIES: ServicesCatalog["categories"] = [
  {
    name_en: "Waxing",
    name_ar: "إزالة الشعر",
    sort_order: 1,
    services: [
      ["Half/Full Arm", "3/6"],
      ["Half/Full Legs", "4/8"],
      ["Underarms", "2"],
      ["Bikini", "8"],
      ["Full Face", "5"],
      ["Back", "10"],
      ["Chest", "5"],
      ["Front/Back Neck", "5"],
      ["Full Body", "30"],
    ],
  },
  {
    name_en: "Bleaching",
    name_ar: "تبييض",
    sort_order: 2,
    services: [
      ["Normal Face Bleach", "5"],
      ["Herbal Face Bleach", "7"],
      ["Half/Full Arms", "3/6"],
      ["Half/Full Legs", "4/8"],
      ["Full Body Normal", "20"],
      ["Full Body Herbal", "25"],
    ],
  },
  {
    name_en: "Facials",
    name_ar: "تنظيفات",
    sort_order: 3,
    services: [
      ["Herbal Facial", "10"],
      ["Fruit Facial", "15"],
      ["Whitening Facial", "20"],
      ["Acne Treatment", "-"],
      ["Laser Facial", "25"],
      ["Hydra Facial", "40"],
      ["Carbon Laser Facial", "50"],
    ],
  },
  {
    name_en: "Eyebrows",
    name_ar: "حواجب",
    sort_order: 4,
    services: [
      ["Eyebrows Threading", "3"],
      ["Eyebrows Color", "3/5"],
      ["Eyebrows Bleaching", "3"],
      ["Eyebrows Waxing", "2"],
      ["Upper Lips Thread/wax", "1"],
      ["Chin Thread/wax", "1"],
      ["Full Face Thread+Mask", "5"],
      ["Eyebrows Blading", "2"],
      ["Full Face Blading", "5/10"],
    ],
  },
  {
    name_en: "Hair Color",
    name_ar: "صبغ الشعر",
    sort_order: 5,
    services: [
      ["Root touch up", "10/15/20"],
      ["Refreshing", "15/20/30"],
      ["Front head", "10/15/20"],
      ["Full head", "-"],
      ["Blonde Shades Full head", "20/25/30+70"],
      ["Dark shades Full head", "15/20/25/30"],
    ],
  },
  {
    name_en: "Highlights",
    name_ar: "شيم",
    sort_order: 6,
    services: [
      ["Refreshing", "15/20/30"],
      ["Front Head", "10/15/20"],
      ["Full Head", "15/20/25+40"],
      ["Balayage", "20/25+50"],
      ["Lowlights/Highlights", "15/20/25+50"],
    ],
  },
  {
    name_en: "Straightening",
    name_ar: "فرد الشعر",
    sort_order: 7,
    services: [
      ["Keratin/Protein Front", "-"],
      ["Keratin/Protein Full", "20/25+50"],
      ["Rebonding Full", "35/40/45+100"],
      ["Smoothening Full", "25/30/35+50"],
    ],
  },
  {
    name_en: "Hair Cut",
    name_ar: "قص الشعر",
    sort_order: 8,
    services: [
      ["Simple Trimming", "5"],
      ["Front Layers", "5"],
      ["Full Layers", "10/15"],
      ["Different Cuts", "10/15"],
      ["Cut Styling", "5"],
      ["Baby Full Trimming", "5"],
      ["Baby Layers", "5/10"],
      ["Baby Front", "3"],
    ],
  },
  {
    name_en: "Hair Styling",
    name_ar: "تسريحات",
    sort_order: 9,
    services: [
      ["Blowdryer+Iron", "5/7/10+20"],
      ["Curls/Wavy", "5/7/10+20"],
      ["Simple Iron", "5/7+15"],
      ["Extensions Per Pec", "3+"],
      ["Stencils 10 Pec", "5+"],
      ["Party Hairstyle", "10/15+30"],
      ["Bridal Hairstyle", "40/50/60"],
    ],
  },
  {
    name_en: "Makeup",
    name_ar: "مكياج",
    sort_order: 10,
    services: [
      ["Casual", "15"],
      ["Party", "20"],
      ["Nude", "25"],
      ["Bridal", "50/60+100"],
      ["Normal Eyelashes", "3/5/7"],
      ["Eyelashes Extensions", "15/20/25/30"],
    ],
  },
  {
    name_en: "Manicure",
    name_ar: "مانيكير",
    sort_order: 11,
    services: [
      ["Basic Manicure", "7"],
      ["French Manicure", "7"],
      ["Whitening Manicure", "10"],
      ["Paraffin Manicure", "15"],
    ],
  },
  {
    name_en: "Pedicure",
    name_ar: "بيديكير",
    sort_order: 12,
    services: [
      ["Basic Pedicure", "7"],
      ["French Pedicure", "7"],
      ["Whitening Pedicure", "10"],
      ["Paraffin Pedicure", "15"],
    ],
  },
  {
    name_en: "Nails",
    name_ar: "أظافر",
    sort_order: 13,
    services: [
      ["Nail Shaping", "5"],
      ["Basic Nail polish", "2"],
      ["Nail Art", "7"],
      ["Nail Extensions 3 Days", "-"],
      ["Nail Extensions 6 Days", "7"],
      ["Acrylic Nail", "10"],
      ["Acrylic Nail 15/30 Days", "20/25"],
    ],
  },
  {
    name_en: "Treatments",
    name_ar: "علاجات",
    sort_order: 14,
    services: [
      ["Hair Fall", "10"],
      ["Dandruff", "10"],
      ["Dry Damaged", "10"],
      ["Color Damaged", "15"],
      ["Relaxing", "10"],
    ],
  },
  {
    name_en: "Body Massage",
    name_ar: "مساج الجسم",
    sort_order: 15,
    services: [
      ["Full Body 1hr", "20"],
      ["Legs 30min", "10"],
      ["Back 30min", "5"],
      ["Belly 30min", "5"],
      ["Arms+Neck 30min", "5"],
      ["Head 30min", "5"],
    ],
  },
  {
    name_en: "Steam Bath",
    name_ar: "حمام بخار",
    sort_order: 16,
    services: [
      ["Basic Steam Bath", "15"],
      ["Moroccan Herbal Bath", "20"],
      ["Turkish Steam Bath", "20"],
      ["Special Moroccan Bath", "30"],
      ["Bridal Moroccan Bath", "40/50"],
    ],
  },
  {
    name_en: "Extras",
    name_ar: "إضافات",
    sort_order: 17,
    services: [
      ["Moroccan Loofah", "3"],
      ["Artificial Nail", "5/7/10"],
      ["Henna Simple/Color", "1/2/3"],
      ["Hair Oil", "5/10"],
      ["Hair Fall Oil", "10/15"],
      ["Beauty Action Cream", "7"],
      ["Oil Application Roller", "3"],
      ["Eyelashes Extensions Fake Hair", "2/3/5"],
      ["Extensions Original Human Hair", "40/120"],
    ],
  },
].map((cat) => ({
  name_en: cat.name_en,
  name_ar: cat.name_ar,
  sort_order: cat.sort_order,
  services: cat.services.map(([nameEn, priceRaw]) => {
    const { tiers, isActive } = parsePriceString(priceRaw);
    const nameAr = AR[nameEn];
    if (!nameAr) throw new Error(`Missing Arabic for: ${nameEn}`);
    return {
      name_en: nameEn,
      name_ar: nameAr,
      price_tiers: tiers,
      ...(isActive ? {} : { is_active: false }),
    };
  }),
}));

const catalog: ServicesCatalog = { categories: CATEGORIES };
fs.writeFileSync(OUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUT}`);
