import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "James Harcourt | Hardware & Software Engineer",
  description:
    "James Harcourt | engineer building IoT, health-tech and embedded systems. Creator of GlucoBit, a low-cost glucose visualisation device.",
  openGraph: {
    title: "James Harcourt | Hardware & Software Engineer",
    description:
      "Engineer building IoT, health-tech and embedded systems. Creator of GlucoBit.",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
