"use client";

import { useEffect } from "react";

export function BackgroundParallax() {
  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty(
        "--bg-y",
        `${window.scrollY * 0.16}px`
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return null;
}
