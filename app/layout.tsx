import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { EB_Garamond, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif, Mrs_Saint_Delafield } from "next/font/google";
import { profile } from "@/lib/data";
import { openGraphImages, SITE_URL } from "@/lib/seo";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });
// Passport cover lettering and the bearer signature, drawn into WebGL textures.
const garamond = EB_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-garamond", preload: false });
const signature = Mrs_Saint_Delafield({ subsets: ["latin"], weight: "400", variable: "--font-signature", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "James Harcourt | Hardware & Software Engineer & CEO of Equilibrium",
    template: "%s | James Harcourt",
  },
  description:
    "James Harcourt is a Dublin-based hardware and software engineer and CEO & co-founder of Equilibrium, building embedded systems, health-tech and smart-building products. Creator of GlucoBit and Stripe Young Scientist 2026 award winner.",
  keywords: [
    "James Harcourt",
    "James Harcourt Dublin",
    "James Harcourt Equilibrium",
    "James Harcourt engineer",
    "James Harcourt GlucoBit",
    "James Harcourt Young Scientist",
    "James Harcourt Patch",
    "Equilibrium HVAC",
    "jdharcourt",
  ],
  authors: [{ name: profile.name, url: SITE_URL }],
  creator: profile.name,
  publisher: profile.name,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "James Harcourt | Hardware & Software Engineer",
    description:
      "CEO & co-founder of Equilibrium in Dublin. Embedded systems, health-tech and smart-building products. Creator of GlucoBit.",
    url: SITE_URL,
    siteName: profile.name,
    locale: "en_IE",
    type: "profile",
    firstName: "James",
    lastName: "Harcourt",
    username: "jdharcourt",
    images: openGraphImages,
  },
  twitter: {
    card: "summary_large_image",
    title: "James Harcourt | Hardware & Software Engineer",
    description:
      "CEO & co-founder of Equilibrium in Dublin. Embedded systems, health-tech and smart-building products. Creator of GlucoBit.",
    images: [openGraphImages[0].url],
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
