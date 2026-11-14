"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/#equilibrium", label: "Equilibrium" },
  { href: "/#work", label: "Projects" },
  { href: "/#experience", label: "Experience" },
  { href: "/resume", label: "Résumé" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Link href="/" className="nav-brand" aria-label="James Harcourt home">
        <span className="serif">jh<span className="dot">.</span></span>
        <span className="label" aria-hidden="true">Portfolio · Rev 26.11</span>
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map((link, index) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{link.label}</Link>)}
      </nav>
    </header>
  );
}
