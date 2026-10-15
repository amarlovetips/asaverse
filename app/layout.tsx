import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Bengali, Pixelify_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const pixelFont = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });
const bengaliFont = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], variable: "--font-bengali", display: "swap" });

export const metadata: Metadata = {
  title: "AsaVerse",
  description: "Explore the AsaVerse world.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body className={`${pixelFont.variable} ${bengaliFont.variable} min-h-screen bg-[#070b17] text-white antialiased`}>
    <Providers>{children}</Providers>
  </body></html>;
}
