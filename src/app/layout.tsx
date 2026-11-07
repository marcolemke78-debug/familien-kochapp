import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Familienkochbuch",
  description: "Unsere Rezepte für Thermomix, Heißluft und jeden Tag",
  robots: { index: false, follow: false }, // privat: nicht in Suchmaschinen
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1716" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="de" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppHeader userName={user?.displayName ?? null} />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
