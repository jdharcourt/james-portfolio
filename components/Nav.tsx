"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Nav() {
  const [theme, setTheme] = useState("light");
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved !== "dark" && saved !== "light") return;
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    } catch {}
  }, []);

  return (
    <header className="nav">
      <Link href="/" className="nav-brand" aria-label="James Harcourt home">jh<span>.</span></Link>
      <nav aria-label="Main navigation">
        <Link href="/#work" aria-current={pathname === "/" ? "page" : undefined}>Projects</Link>
        <Link href="/#about">About</Link>
        <Link href="/resume" aria-current={pathname === "/resume" ? "page" : undefined}>Résumé</Link>
        <Link href="/#terminal" className="nav-terminal">Terminal <span aria-hidden="true">↗</span></Link>
      </nav>
      <button className="theme-toggle" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={() => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("theme", next); } catch {}
      }}>{theme === "light" ? "◐" : "◑"}</button>
    </header>
  );
}
