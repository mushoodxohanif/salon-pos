"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaleCodeCopyProps = {
  saleCode: string;
  className?: string;
  compact?: boolean;
};

export function SaleCodeCopy({ saleCode, className, compact = false }: SaleCodeCopyProps) {
  const t = useTranslations("employee.saleComplete");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(saleCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be unavailable.
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-mono font-semibold text-salon-black",
          compact ? "text-sm" : "text-base",
        )}
        dir="ltr"
      >
        {saleCode}
      </span>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className={cn(compact ? "h-8 px-2.5" : "min-h-10")}
        onClick={handleCopy}
        aria-label={copied ? t("copied") : t("copy")}
      >
        {copied ? (
          <Check className="size-4 text-salon-gold" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        <span className={compact ? "sr-only" : undefined}>{copied ? t("copied") : t("copy")}</span>
        {compact ? null : <span>{copied ? t("copied") : t("copy")}</span>}
      </Button>
    </div>
  );
}
