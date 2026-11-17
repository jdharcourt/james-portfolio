import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { EB_Garamond, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif, Mrs_Saint_Delafield } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });
// Passport cover lettering and the bearer signature, drawn into WebGL textures.
const garamond = EB_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-garamond", preload: false });
const signature = Mrs_Saint_Delafield({ subsets: ["latin"], weight: "400", variable: "--font-signature", preload: false });

export const metadata: Metadata = {
  title: "James Harcourt | Hardware & Software Engineer",
  description:
    "James Harcourt | CEO & co-founder of Equilibrium, building embedded systems, health-tech and smart-building products. Creator of GlucoBit.",
  openGraph: {
    title: "James Harcourt | Hardware & Software Engineer",
    description:
      "CEO & co-founder of Equilibrium. Embedded systems, health-tech and smart buildings. Creator of GlucoBit.",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable} ${serif.variable} ${garamond.variable} ${signature.variable}`}>
      <body suppressHydrationWarning>
        {children}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
