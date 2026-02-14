import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Idea Journal",
  description: "Morning voice memo journal with AI-powered idea extraction",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans bg-bg min-h-screen`}
      >
        <Nav />
        <main className="py-5 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
