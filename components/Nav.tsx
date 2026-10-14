"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Link href="/" className="nav-brand" aria-label="James Harcourt home">jh<span>.</span></Link>
      <nav aria-label="Main navigation">
        <Link href="/#work">Projects</Link>
        <Link href="/#about">About</Link>
        <Link href="/resume" aria-current={pathname === "/resume" ? "page" : undefined}>Résumé</Link>
      </nav>
    </header>
  );
}
