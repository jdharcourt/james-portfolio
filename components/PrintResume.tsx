"use client";

export function PrintResume() {
  return <button className="button button-primary" onClick={() => window.print()}>Print / save PDF ↓</button>;
}
