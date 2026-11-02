import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sans = localFont({
  src: "../fonts/source-sans-3-200-900.woff2",
  weight: "200 900",
  display: "swap",
  variable: "--font-sans",
});
const serif = localFont({
  src: "../fonts/source-serif-4-200-900.woff2",
  weight: "200 900",
  display: "swap",
  variable: "--font-serif",
});
const inter = localFont({
  src: "../fonts/inter-100-900.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});
const nunito = localFont({
  src: "../fonts/nunito-sans-200-1000.woff2",
  weight: "200 1000",
  display: "swap",
  variable: "--font-nunito",
});
const atkinson = localFont({
  src: [
    { path: "../fonts/atkinson-hyperlegible-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/atkinson-hyperlegible-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-atkinson",
});
const plex = localFont({
  src: "../fonts/ibm-plex-sans.woff2",
  weight: "100 700",
  display: "swap",
  variable: "--font-plex",
});
const outfit = localFont({
  src: "../fonts/outfit-100-900.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-outfit",
});
const baskerville = localFont({
  src: "../fonts/libre-baskerville.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-baskerville",
});
const merriweather = localFont({
  src: "../fonts/merriweather.woff2",
  weight: "300 900",
  display: "swap",
  variable: "--font-merriweather",
});
const lora = localFont({
  src: "../fonts/lora-400-700.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-lora",
});
const newsreader = localFont({
  src: "../fonts/newsreader-200-800.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-newsreader",
});
const fraunces = localFont({
  src: "../fonts/fraunces-100-900.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-fraunces",
});
const playfair = localFont({
  src: "../fonts/playfair-display-400-900.woff2",
  weight: "400 900",
  display: "swap",
  variable: "--font-playfair",
});

const fontVariables = [
  sans.variable,
  serif.variable,
  inter.variable,
  nunito.variable,
  atkinson.variable,
  plex.variable,
  outfit.variable,
  baskerville.variable,
  merriweather.variable,
  lora.variable,
  newsreader.variable,
  fraunces.variable,
  playfair.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Passaic County Transportation",
  description: "Internal review app for the Passaic County Superintendent transportation office",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontVariables} antialiased`}>{children}</body>
    </html>
  );
}
