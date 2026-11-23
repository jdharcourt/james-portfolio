import type { Viewport } from "next";
import { JsonLd } from "@/components/JsonLd";
import { Passport } from "@/components/passport/Passport";
import { PassportText } from "@/components/passport/PassportText";
import { buildHomeJsonLd } from "@/lib/seo";

// The CSP nonce is per request, so the page is rendered dynamically.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#16120e", viewportFit: "cover" };

export default function Home() {
  return (
    <main className="passport-page">
      <JsonLd data={buildHomeJsonLd()} />
      <Passport />
      <PassportText />
      <noscript>
        <style>{".passport{display:none}.passport-text{position:static!important;width:auto!important;height:auto!important;clip:auto!important;overflow:visible!important}"}</style>
      </noscript>
    </main>
  );
}
