import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Exo_2, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";

import { TooltipProvider } from "@/components/ui/tooltip";
import { formattingLocale } from "@/i18n/config";
import { DEFAULT_THEME, isTheme, THEME_COOKIE } from "@/lib/theme";

import "./globals.css";

// Exo 2 is a wide, squared techno sans with full Cyrillic — one face covers
// both English and Russian. It stands in for Toxigenesis (whose free release is
// desktop-license-only); drop a licensed Toxigenesis .woff2 here to swap later.
const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Infragg",
    template: "%s · Infragg",
  },
  description: "Team platform for competitive Rainbow Six Siege",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;

  return (
    <html
      lang={formattingLocale(locale)}
      className={`${exo.variable} ${geistMono.variable} ${
        theme === "dark" ? "dark" : ""
      } h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
