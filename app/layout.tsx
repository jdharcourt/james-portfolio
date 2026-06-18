import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "James Harcourt — Hardware & Software Engineer",
  description:
    "James Harcourt — engineer building IoT, health-tech and embedded systems. Creator of GlucoBit, a low-cost non-invasive glucose visualisation device.",
  openGraph: {
    title: "James Harcourt — Hardware & Software Engineer",
    description:
      "Engineer building IoT, health-tech and embedded systems. Creator of GlucoBit.",
    type: "website",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
