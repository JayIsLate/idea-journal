import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import ProcessingBar from "@/components/ProcessingBar";
import { ProcessingProvider } from "@/lib/processing-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FF4D00",
};

export const metadata: Metadata = {
  title: "Idea Journal",
  description: "Morning voice memo journal with AI-powered idea extraction",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Idea Journal",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans bg-bg min-h-screen`}
      >
        <ProcessingProvider>
          <Nav />
          <main className="py-5 sm:py-8 pb-20">{children}</main>
          <ProcessingBar />
        </ProcessingProvider>
      </body>
    </html>
  );
}
