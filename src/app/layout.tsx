import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible,
  Fraunces,
  IBM_Plex_Sans,
  Inter,
  Libre_Baskerville,
  Lora,
  Merriweather,
  Newsreader,
  Nunito_Sans,
  Outfit,
  Playfair_Display,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const nunito = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex",
});
const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});
const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-baskerville",
});
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-merriweather",
});
const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
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
