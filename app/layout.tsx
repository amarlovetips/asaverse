import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AsaVerse",
  description: "Explore the AsaVerse world.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body className="min-h-screen bg-[#070b17] text-white antialiased">
    <Providers>{children}</Providers>
  </body></html>;
}
