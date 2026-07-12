export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tag used for date/time formatting per app locale. */
export function formattingLocale(locale: string): string {
  return locale === "ru" ? "ru-RU" : "en-GB";
}
