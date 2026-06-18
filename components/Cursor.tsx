"use client";

import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const cursor = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const move = (event: MouseEvent) => {
      cursor.current?.style.setProperty("--x", `${event.clientX}px`);
      cursor.current?.style.setProperty("--y", `${event.clientY}px`);
    };
    const hover = (event: MouseEvent) => {
      cursor.current?.classList.toggle(
        "cursor--hover",
        !!(event.target as HTMLElement).closest("a, button")
      );
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", hover);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", hover);
    };
  }, []);

  if (!enabled) return null;

  return <div ref={cursor} className="cursor" aria-hidden />;
}
