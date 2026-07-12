"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { LOCALES } from "@/i18n/config";
import { setLocale } from "@/services/locale";

export function LocaleSwitcher() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language">
      {LOCALES.map((candidate) => (
        <Button
          key={candidate}
          variant={candidate === locale ? "secondary" : "ghost"}
          size="sm"
          disabled={pending || candidate === locale}
          onClick={() => startTransition(() => setLocale(candidate))}
          className="h-7 px-2 text-xs uppercase"
        >
          {candidate}
        </Button>
      ))}
    </div>
  );
}
