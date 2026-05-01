import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://podforge-studio.local"),
  title: {
    default: "PODForge Studio | Bulk POD Design Generator",
    template: "%s | PODForge Studio",
  },
  description:
    "Bulk print-ready PNG design generators for Etsy and print-on-demand sellers. Create text templates, graphic remix designs and pattern-fill text designs in the browser.",
  keywords: [
    "Etsy POD design generator",
    "bulk t-shirt design generator",
    "print on demand tools",
    "pattern fill text generator",
    "bulk PNG generator",
    "POD design suite",
  ],
  openGraph: {
    title: "PODForge Studio",
    description:
      "Client-side bulk print-ready design suite for Etsy and POD sellers.",
    type: "website",
    url: "/",
    siteName: "PODForge Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "PODForge Studio",
    description:
      "Bulk print-ready design generators for Etsy and print-on-demand sellers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
