export const THEME_COOKIE = "theme";

export type Theme = "light" | "dark";

/** The app was dark-only before the toggle; keep dark as the default. */
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}
