"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/theme";
import { setTheme } from "@/services/theme";

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const t = useTranslations("theme");
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    // Flip the class immediately for instant feedback; persist for next SSR.
    document.documentElement.classList.toggle("dark", next === "dark");
    startTransition(() => setTheme(next));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={toggle}
      aria-label={t("toggle")}
      title={t(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
