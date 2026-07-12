import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Chakra_Petch, Geist_Mono, Play } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { formattingLocale } from "@/i18n/config";

import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Chakra Petch has no Cyrillic glyphs; Play is a matching squared face
// that covers Russian and sits behind it in the font stack.
const play = Play({
  variable: "--font-play",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
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

  return (
    <html
      lang={formattingLocale(locale)}
      className={`${chakraPetch.variable} ${play.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
