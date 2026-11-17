"use client";

import { useEffect, useRef, useState } from "react";
import type { PassportHandle } from "./scene";
import { SECTIONS } from "./sections";
import "./passport.css";

function cssFont(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

export function Passport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<PassportHandle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [spread, setSpread] = useState(0);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abort = new AbortController();
    const fonts = {
      sans: cssFont("--font-plex-sans", "system-ui, sans-serif"),
      mono: cssFont("--font-plex-mono", "ui-monospace, monospace"),
      serif: cssFont("--font-garamond", "Georgia, serif"),
      script: cssFont("--font-signature", "cursive"),
    };
    import("./scene")
      .then(({ createPassport }) => 
        createPassport(
          canvas,
          fonts,
          {
            onReady: () => setStatus("ready"),
            onSpread: (s) => {
              setSpread(s);
              setMoved(true);
            },
          },
          abort.signal,
        ),
      )
      .then((h) => {
        if (abort.signal.aborted) h.dispose();
        else handle.current = h;
      })
      .catch((err: unknown) => {
        if (abort.signal.aborted) return;
        console.error("passport_webgl_failed", err);
        setStatus("failed");
      });
    return () => {
      abort.abort();
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  const current = [...SECTIONS].reverse().find((s) => spread >= s.spread)?.label;

  return (
    <div className="passport" data-status={status}>
      <canvas
        ref={canvasRef}
        className="passport-canvas"
        role="img"
        aria-label="An Irish passport belonging to James Harcourt. Click or tap to open it, drag or swipe to turn pages, or use the arrow keys."
      />
      <nav className="passport-tabs" aria-label="Passport sections">
        {SECTIONS.map((s) => (
          <button key={s.label} type="button" aria-current={current === s.label ? "true" : undefined} onClick={() => handle.current?.goTo(s.spread)}>
            {s.label}
          </button>
        ))}
      </nav>
      <p className="passport-hint" aria-hidden="true" data-hidden={moved || status !== "ready" ? "true" : undefined}>
        <span className="passport-hint-desktop">Click the passport to open · then drag a page or use ← →</span>
        <span className="passport-hint-touch">Tap to open · swipe to turn</span>
      </p>
    </div>
  );
}
