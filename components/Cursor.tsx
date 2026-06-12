"use client";

import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const dot = useRef<HTMLDivElement | null>(null);
  const ring = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only on devices with a fine pointer (mouse/trackpad)
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    let raf = 0;
    let visible = false;

    const move = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        dot.current?.classList.add("cursor--visible");
        ring.current?.classList.add("cursor--visible");
      }
      if (dot.current) {
        dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      }
    };

    const render = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      }
      raf = requestAnimationFrame(render);
    };

    const over = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest(
        "a, button, [data-cursor='hover']"
      );
      ring.current?.classList.toggle("cursor--hover", !!t);
    };

    const down = () => ring.current?.classList.add("cursor--down");
    const up = () => ring.current?.classList.remove("cursor--down");
    const leave = () => {
      dot.current?.classList.remove("cursor--visible");
      ring.current?.classList.remove("cursor--visible");
      visible = false;
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    document.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      document.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={ring} className="cursor cursor__ring" aria-hidden />
      <div ref={dot} className="cursor cursor__dot" aria-hidden />
    </>
  );
}
