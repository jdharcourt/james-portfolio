"use client";

import { useEffect, useState } from "react";

export default function Nav() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current =
      (document.documentElement.dataset.theme as "dark" | "light") || "dark";
    setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <header className="nav">
      <a href="#top" className="nav__brand">
        JH<span>.</span>
      </a>
      <nav className="nav__links">
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
      <button
        className="theme-toggle"
        onClick={toggle}
        aria-label="Toggle colour theme"
        data-theme={theme}
      >
        <span className="theme-toggle__dot" />
      </button>
    </header>
  );
}
