"use client";

import { Button } from "@/components/button/components/button";

export function PrintResume() {
  return <Button className="h-11 px-5" onClick={() => window.print()}>Print / save PDF</Button>;
}
