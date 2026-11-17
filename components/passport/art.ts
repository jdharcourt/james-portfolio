// Canvas 2D artwork for the passport pages, drawn at a fixed logical size and
// uploaded as textures. All illustrations are procedural so nothing is fetched.

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];

export const PW = 1024;
export const PH = 1456;

export function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scratch(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function path(pts: Pt[], close = false) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (close) p.closePath();
  return p;
}

export function stroke(ctx: Ctx, p: Path2D, color: string, lw: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(p);
  ctx.restore();
}

export function fill(ctx: Ctx, p: Path2D, color: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fill(p);
  ctx.restore();
}

/** Engraving-style parallel hatching clipped to a shape. */
export function hatch(ctx: Ctx, shape: Path2D, angle: number, gap: number, color: string, lw = 1.3, alpha = 1, box: [number, number, number, number] = [0, 0, PW, PH]) {
  ctx.save();
  ctx.clip(shape);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const r = Math.hypot(x1 - x0, y1 - y0) / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  ctx.beginPath();
  for (let o = -r; o <= r; o += gap) {
    const px = cx - dy * o;
    const py = cy + dx * o;
    ctx.moveTo(px - dx * r, py - dy * r);
    ctx.lineTo(px + dx * r, py + dy * r);
  }
  ctx.stroke();
  ctx.restore();
}

/** Rows of engraved water, tighter towards the horizon. */
export function waves(ctx: Ctx, y0: number, y1: number, color: string, seed: number, alpha = 0.7, x0 = 0, x1 = PW) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= alpha;
  let y = y0;
  let gap = 7;
  while (y < y1) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    ctx.lineWidth = 1 + t * 0.9;
    const amp = 1.5 + t * 4;
    const f = 0.02 + r() * 0.03;
    const ph = r() * 6.28;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) {
      const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 2) * amp * 0.35;
      if (x === x0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    y += gap;
    gap = 7 + t * 14;
  }
  ctx.restore();
}

/** Fine interference lines used as the security-print background. */
export function guilloche(ctx: Ctx, color: string, seed: number, alpha = 0.16, y0 = 0, y1 = PH) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha *= alpha;
  const f1 = 0.006 + r() * 0.004;
  const f2 = 0.017 + r() * 0.006;
  for (let k = 0; k < 2; k++) {
    for (let y = y0 - 40; y < y1 + 40; y += 9) {
      ctx.beginPath();
      for (let x = -10; x <= PW + 10; x += 10) {
        const yy = y + Math.sin(x * f1 + y * 0.011 + k * 2.1) * 22 + Math.sin(x * f2 - y * 0.02 + k) * 6;
        if (x === -10) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function rosette(ctx: Ctx, cx: number, cy: number, R: number, color: string, alpha = 0.35, petals = 18) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 720; i++) {
      const a = (i / 720) * Math.PI * 2;
      const rr = R * (0.55 + 0.045 * k) + Math.sin(a * petals + k * 0.7) * R * 0.18;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The Irish harp, drawn in a 100 x 140 box: curved fore-pillar on the left,
// straight decorated soundbox on the right, harmonic curve along the top.
// ---------------------------------------------------------------------------

function neckY(x: number) {
  // Sampled from the neck curve below so strings meet it cleanly.
  const pts: Pt[] = [];
  const bez = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      pts.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  };
  bez([13, 31], [16, 9], [34, 2], [46, 16]);
  bez([46, 16], [56, 28], [70, 26], [85, 13]);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    if ((x - ax) * (x - bx) <= 0 && ax !== bx) return ay + ((x - ax) / (bx - ax)) * (by - ay);
  }
  return 20;
}

function harpMask(ctx: Ctx) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Soundbox.
  const a: Pt = [88, 15];
  const b: Pt = [31, 131];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = (b[1] - a[1]) / len;
  const ny = -(b[0] - a[0]) / len;
  const w = 6.4;
  const box = path([[a[0] + nx * w, a[1] + ny * w], [b[0] + nx * w, b[1] + ny * w], [b[0] - nx * w, b[1] - ny * w], [a[0] - nx * w, a[1] - ny * w]], true);
  ctx.fill(box);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const inner = path([[a[0] + nx * 3.6, a[1] + ny * 3.6], [b[0] + nx * 3.6, b[1] + ny * 3.6], [b[0] - nx * 3.6, b[1] - ny * 3.6], [a[0] - nx * 3.6, a[1] - ny * 3.6]], true);
  ctx.fill(inner);
  ctx.restore();
  // Lozenges along the soundbox.
  for (let i = 1; i < 11; i++) {
    const t = i / 11;
    const cx = a[0] + (b[0] - a[0]) * t;
    const cy = a[1] + (b[1] - a[1]) * t;
    const dx = (b[0] - a[0]) / len;
    const dy = (b[1] - a[1]) / len;
    ctx.fill(path([[cx - dx * 3.6, cy - dy * 3.6], [cx + nx * 2.4, cy + ny * 2.4], [cx + dx * 3.6, cy + dy * 3.6], [cx - nx * 2.4, cy - ny * 2.4]], true));
  }
  // Finial at the top of the soundbox.
  ctx.beginPath();
  ctx.arc(89, 12, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(89, 12, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Neck (harmonic curve) as a hollow band.
  const neck = new Path2D();
  neck.moveTo(13, 31);
  neck.bezierCurveTo(16, 9, 34, 2, 46, 16);
  neck.bezierCurveTo(56, 28, 70, 26, 85, 13);
  ctx.lineWidth = 8.5;
  ctx.stroke(neck);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = 3.6;
  ctx.stroke(neck);
  ctx.restore();
  ctx.lineWidth = 1.5;
  for (let x = 20; x < 82; x += 6.5) {
    ctx.beginPath();
    ctx.arc(x, neckY(x), 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fore-pillar with a carved band and a small knot near the top.
  const pillar = new Path2D();
  pillar.moveTo(13, 31);
  pillar.bezierCurveTo(-3, 62, 2, 112, 31, 131);
  ctx.lineWidth = 9.5;
  ctx.stroke(pillar);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = 4.6;
  ctx.stroke(pillar);
  ctx.restore();
  ctx.lineWidth = 1.6;
  ctx.setLineDash([2.5, 3.5]);
  ctx.stroke(pillar);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(13, 31, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(31, 131, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(13, 31, 2.2, 0, Math.PI * 2);
  ctx.arc(31, 131, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Strings run from the neck down to the soundbox.
  ctx.lineWidth = 1.25;
  const ix0 = a[0] - nx * w;
  const iy0 = a[1] - ny * w;
  const ix1 = b[0] - nx * w;
  const iy1 = b[1] - ny * w;
  const sb = (x: number) => iy0 + ((ix0 - x) / (ix0 - ix1)) * (iy1 - iy0);
  for (let i = 0; i < 12; i++) {
    const x = 28 + i * 4.6;
    const top = neckY(x) + 3.2;
    const bottom = Math.min(sb(x) - 2, 128);
    if (bottom - top < 3) continue;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
}

/** Draw the harp in a solid colour with its top-left at (x, y), `h` tall. */
export function harp(ctx: Ctx, x: number, y: number, h: number, color: string, alpha = 1) {
  const s = h / 140;
  const pad = 8;
  const c = scratch(100 * s + pad * 2, h + pad * 2);
  const g = c.getContext("2d")!;
  g.translate(pad, pad);
  g.scale(s, s);
  harpMask(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(c, x - pad, y - pad);
  ctx.restore();
}

/** ICAO e-passport chip symbol. */
export function chip(ctx: Ctx, cx: number, cy: number, w: number, color: string) {
  const h = w * 0.6;
  const c = scratch(w + 4, h + 4);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(2, 2, w, h);
  g.globalCompositeOperation = "destination-out";
  g.fillRect(2, 2 + h * 0.3, w, h * 0.4);
  g.globalCompositeOperation = "source-over";
  g.lineWidth = h * 0.09;
  g.strokeStyle = "#fff";
  g.beginPath();
  g.moveTo(2, 2 + h / 2);
  g.lineTo(2 + w, 2 + h / 2);
  g.stroke();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(2 + w / 2, 2 + h / 2, h * 0.27, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "source-over";
  g.lineWidth = h * 0.08;
  g.beginPath();
  g.arc(2 + w / 2, 2 + h / 2, h * 0.21, 0, Math.PI * 2);
  g.stroke();
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(c, cx - w / 2 - 2, cy - h / 2 - 2);
}

/** Celtic triquetra: a trefoil knot interlaced with a ring. */
export function triquetra(ctx: Ctx, cx: number, cy: number, R: number, color: string, alpha = 1) {
  const o = R * 1.4;
  const c = scratch(o * 2, o * 2);
  const g = c.getContext("2d")!;
  const trace = () => {
    g.beginPath();
    for (let i = 0; i <= 480; i++) {
      const t = (i / 480) * Math.PI * 2;
      const x = Math.sin(t) + 2 * Math.sin(2 * t);
      const y = Math.cos(t) - 2 * Math.cos(2 * t);
      if (i) g.lineTo(o + (x * R) / 3, o - (y * R) / 3);
      else g.moveTo(o + (x * R) / 3, o - (y * R) / 3);
    }
    g.closePath();
    g.stroke();
    g.beginPath();
    g.arc(o, o, R * 0.5, 0, Math.PI * 2);
    g.stroke();
  };
  g.strokeStyle = "#fff";
  g.lineJoin = "round";
  g.lineWidth = R * 0.15;
  trace();
  g.globalCompositeOperation = "destination-out";
  g.lineWidth = R * 0.05;
  trace();
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(c, cx - o, cy - o);
  ctx.restore();
}

/**
 * Seamless felt tile (single channel). Baked once so the desk shader only
 * samples a texture instead of running fibre noise on every pixel.
 */
export function feltTile(size = 512) {
  const c = scratch(size, size);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const r = rng(77);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  // Draw at the tile offsets around the edge so everything wraps.
  const wrap = (x: number, y: number, reach: number, draw: (x: number, y: number) => void) => {
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        const px = x + dx;
        const py = y + dy;
        if (px > -reach && px < size + reach && py > -reach && py < size + reach) draw(px, py);
      }
  };
  for (let i = 0; i < 9000; i++) {
    const x = r() * size;
    const y = r() * size;
    const v = r();
    const s = 1 + r() * 2.5;
    g.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.08})` : `rgba(0,0,0,${0.05 + r() * 0.1})`;
    wrap(x, y, s, (px, py) => g.fillRect(px, py, s, s));
  }
  g.lineCap = "round";
  for (let i = 0; i < 2600; i++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI * 2;
    const len = 6 + r() * 26;
    const bend = (r() - 0.5) * len * 0.8;
    const light = r() > 0.45;
    g.strokeStyle = light ? `rgba(255,255,255,${0.08 + r() * 0.14})` : `rgba(0,0,0,${0.1 + r() * 0.16})`;
    g.lineWidth = 0.5 + r() * 1.1;
    wrap(x, y, len, (px, py) => {
      const ex = px + Math.cos(a) * len;
      const ey = py + Math.sin(a) * len;
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo((px + ex) / 2 - Math.sin(a) * bend, (py + ey) / 2 + Math.cos(a) * bend, ex, ey);
      g.stroke();
    });
  }
  const rgba = g.getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4];
  c.width = c.height = 1;
  return out;
}

// 5 x 7 dot-matrix glyphs for the perforated document number.
const DOTS: Record<string, string[]> = {
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
};

/** Laser-perforated number: holes go through the page, so versos read mirrored. */
export function perforation(ctx: Ctx, text: string, cx: number, y: number, mirrored: boolean, pitch = 9) {
  const cw = 5 * pitch + pitch * 2.2;
  const total = text.length * cw - pitch * 2.2;
  ctx.save();
  if (mirrored) {
    ctx.translate(cx * 2, 0);
    ctx.scale(-1, 1);
  }
  [...text].forEach((ch, i) => {
    const g = DOTS[ch];
    if (!g) return;
    const x0 = cx - total / 2 + i * cw;
    g.forEach((row, r) =>
      [...row].forEach((v, c) => {
        if (v !== "1") return;
        const x = x0 + c * pitch;
        const yy = y + r * pitch;
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.beginPath();
        ctx.arc(x + 1.2, yy + 1.2, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(70,60,50,0.55)";
        ctx.beginPath();
        ctx.arc(x, yy, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }),
    );
  });
  ctx.restore();
}

export type StampSpec = {
  x: number;
  y: number;
  rot: number;
  color: string;
  shape: "rect" | "circle" | "oval";
  lines: string[];
  font: string;
  seed: number;
  w?: number;
  h?: number;
};

/** Rubber stamp with uneven ink, drawn off-screen then multiplied onto the page. */
export function stamp(ctx: Ctx, s: StampSpec) {
  const w = s.w ?? (s.shape === "circle" ? 230 : 300);
  const h = s.h ?? (s.shape === "circle" ? 230 : 170);
  const c = scratch(w + 20, h + 20);
  const g = c.getContext("2d")!;
  g.translate(10, 10);
  g.strokeStyle = "#000";
  g.fillStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (s.shape === "rect") {
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.lineWidth = 2.5;
    g.strokeRect(14, 14, w - 28, h - 28);
    const n = s.lines.length;
    s.lines.forEach((line, i) => {
      const big = i === 0;
      g.font = `${big ? 700 : 600} ${big ? 40 : 21}px ${s.font}`;
      const yy = n === 1 ? h / 2 : big ? h * 0.36 : h * 0.36 + 28 + (i - 1) * 27;
      g.fillText(line, w / 2, yy, w - 44);
    });
  } else {
    const rx = w / 2 - 6;
    const ry = (s.shape === "circle" ? w : h) / 2 - 6;
    g.lineWidth = 6;
    g.beginPath();
    g.ellipse(w / 2, h / 2, rx, ry, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(w / 2, h / 2, rx - 12, ry - 12, 0, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.ellipse(w / 2, h / 2, rx - 44, ry - 44, 0, 0, Math.PI * 2);
    g.stroke();
    // Ring text.
    const ring = s.lines[1] ?? "";
    g.font = `600 19px ${s.font}`;
    const r = (rx + ry) / 2 - 28;
    const chars = [...ring];
    const span = Math.min(Math.PI * 1.7, chars.length * 0.16);
    chars.forEach((ch, i) => {
      const a = -Math.PI / 2 - span / 2 + (i + 0.5) * (span / chars.length);
      g.save();
      g.translate(w / 2 + Math.cos(a) * r * (rx / ((rx + ry) / 2)), h / 2 + Math.sin(a) * r * (ry / ((rx + ry) / 2)));
      g.rotate(a + Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
    });
    g.font = `700 ${s.lines[0].length > 6 ? 30 : 38}px ${s.font}`;
    g.fillText(s.lines[0], w / 2, h / 2 - 2, rx * 1.2);
    if (s.lines[2]) {
      g.font = `600 17px ${s.font}`;
      g.fillText(s.lines[2], w / 2, h / 2 + 30, rx * 1.1);
    }
  }
  // Distress: pits, worn edge and a heavier inked side.
  const r = rng(s.seed);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) {
    g.globalAlpha = 0.25 + r() * 0.75;
    g.beginPath();
    g.arc(r() * c.width, r() * c.height, 0.6 + r() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  g.globalAlpha = 1;
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = s.color;
  g.fillRect(0, 0, c.width, c.height);

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.globalAlpha *= 0.82;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  ctx.restore();
}

function birds(ctx: Ctx, color: string, seed: number, n: number, box: [number, number, number, number]) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * (box[2] - box[0]);
    const y = box[1] + r() * (box[3] - box[1]);
    const s = 5 + r() * 6;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.3);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.6, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.6, x + s, y - s * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function windows(ctx: Ctx, x: number, y: number, w: number, h: number, cols: number, rows: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  const cw = w / cols;
  const rh = h / rows;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) ctx.strokeRect(x + i * cw + cw * 0.3, y + j * rh + rh * 0.25, cw * 0.4, rh * 0.5);
  ctx.restore();
}

export type Scene = (ctx: Ctx, ink: string, paper: string) => void;

export const scenes: Record<string, Scene> = {
  beckett(ctx, ink, paper) {
    waves(ctx, 1185, 1400, ink, 11);
    // Quayside buildings and the tilted drum of the Convention Centre.
    const r = rng(4);
    for (let x = 20; x < 700; ) {
      const w = 60 + r() * 70;
      const h = 70 + r() * 110;
      const b = path([[x, 1172], [x, 1172 - h], [x + w, 1172 - h], [x + w, 1172]], true);
      fill(ctx, b, paper, 0.9);
      stroke(ctx, b, ink, 1.3, 0.75);
      windows(ctx, x + 4, 1172 - h + 8, w - 8, h - 16, Math.round(w / 18), Math.round(h / 22), ink);
      x += w + 6;
    }
    const drum = new Path2D();
    drum.moveTo(735, 1172);
    drum.lineTo(712, 930);
    drum.ellipse(812, 930, 100, 24, 0, Math.PI, 0);
    drum.lineTo(890, 1172);
    drum.closePath();
    fill(ctx, drum, paper, 0.95);
    hatch(ctx, drum, Math.PI / 2 + 0.09, 9, ink, 1.1, 0.7);
    stroke(ctx, drum, ink, 1.6);
    const top = new Path2D();
    top.ellipse(812, 930, 100, 24, 0, 0, Math.PI * 2);
    fill(ctx, top, paper);
    stroke(ctx, top, ink, 1.6);
    stroke(ctx, path([[0, 1172], [PW, 1172]]), ink, 2);
    // Deck.
    const deck = new Path2D();
    deck.moveTo(40, 1160);
    deck.quadraticCurveTo(500, 1118, 990, 1150);
    deck.lineTo(990, 1168);
    deck.quadraticCurveTo(500, 1136, 40, 1178);
    deck.closePath();
    fill(ctx, deck, paper);
    hatch(ctx, deck, 0, 4, ink, 1, 0.8);
    stroke(ctx, deck, ink, 1.8);
    // Curved pylon, like a harp lying on its side, with fanned cables.
    const spar = new Path2D();
    spar.moveTo(560, 1142);
    spar.quadraticCurveTo(470, 1010, 410, 790);
    spar.quadraticCurveTo(488, 1000, 590, 1140);
    spar.closePath();
    fill(ctx, spar, paper);
    hatch(ctx, spar, 1.1, 5, ink, 1.1);
    stroke(ctx, spar, ink, 2);
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 16; i++) {
      const t = 0.15 + (i / 15) * 0.85;
      const sx = 560 + (410 - 560) * t + Math.sin(t * Math.PI) * -18;
      const sy = 1142 + (790 - 1142) * t;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(530 - t * 430, 1140 - (1 - t) * 6);
      ctx.moveTo(sx, sy);
      ctx.lineTo(640 + t * 90, 1134);
      ctx.stroke();
    }
    ctx.restore();
  },

  poolbeg(ctx, ink, paper) {
    const hill = new Path2D();
    hill.moveTo(560, 1180);
    hill.bezierCurveTo(700, 1060, 860, 1040, 1024, 1090);
    hill.lineTo(1024, 1180);
    hill.closePath();
    hatch(ctx, hill, 0.35, 7, ink, 1, 0.45);
    waves(ctx, 1190, 1400, ink, 21);
    const plant = path([[240, 1182], [240, 1080], [780, 1080], [780, 1182]], true);
    fill(ctx, plant, paper);
    hatch(ctx, plant, Math.PI / 2, 12, ink, 1, 0.55);
    stroke(ctx, plant, ink, 1.6);
    windows(ctx, 250, 1092, 520, 40, 22, 1, ink);
    for (const cx of [430, 575]) {
      const top = 740;
      const bottom = 1082;
      const shaft = path([[cx - 26, bottom], [cx - 18, top], [cx + 18, top], [cx + 26, bottom]], true);
      fill(ctx, shaft, paper);
      const bands = 8;
      for (let i = 0; i < bands; i += 2) {
        const y0 = top + ((bottom - top) / bands) * i;
        const y1 = y0 + (bottom - top) / bands;
        const k0 = (y0 - top) / (bottom - top);
        const k1 = (y1 - top) / (bottom - top);
        const band = path([[cx - 18 - 8 * k0, y0], [cx + 18 + 8 * k0, y0], [cx + 18 + 8 * k1, y1], [cx - 18 - 8 * k1, y1]], true);
        hatch(ctx, band, 0, 3.2, ink, 1.1);
      }
      stroke(ctx, shaft, ink, 1.8);
      for (const y of [800, 930, 1010]) stroke(ctx, path([[cx - 30, y], [cx + 30, y]]), ink, 2.2);
    }
    stroke(ctx, path([[0, 1182], [PW, 1182]]), ink, 2);
    birds(ctx, ink, 3, 7, [140, 780, 900, 960]);
  },

  cliffs(ctx, ink, paper) {
    waves(ctx, 1150, 1400, ink, 31);
    const prof: Pt[] = [[0, 1010], [150, 965], [205, 1010], [380, 935], [440, 985], [640, 895], [705, 955], [1024, 860]];
    const cliff = path([...prof, [1024, 1165], [0, 1165]], true);
    fill(ctx, cliff, paper);
    // Horizontal sandstone and shale strata.
    ctx.save();
    ctx.clip(cliff);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.1;
    for (let y = 870; y < 1170; y += 9) {
      ctx.beginPath();
      for (let x = 0; x <= PW; x += 12) {
        const yy = y + Math.sin(x * 0.013 + y * 0.7) * 2.2;
        if (x) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Shadowed faces at each headland step.
    for (let i = 1; i < prof.length - 1; i += 2) {
      const [x, y] = prof[i];
      const [nx] = prof[i + 1];
      const face = path([[x, y], [nx, prof[i + 1][1]], [nx, 1165], [x + 20, 1165]], true);
      hatch(ctx, face, Math.PI / 2 - 0.25, 3.2, ink, 1, 0.6);
    }
    stroke(ctx, path(prof), ink, 2.4);
    // O'Brien's Tower.
    const tower = path([[742, 880], [742, 836], [770, 836], [770, 873]], true);
    fill(ctx, tower, paper);
    hatch(ctx, tower, Math.PI / 2, 4, ink, 1);
    stroke(ctx, tower, ink, 1.5);
    ctx.fillStyle = ink;
    for (let x = 742; x < 770; x += 8) ctx.fillRect(x, 830, 5, 6);
    // Sea stack.
    const stack = path([[300, 1170], [306, 1060], [326, 1052], [336, 1170]], true);
    fill(ctx, stack, paper);
    hatch(ctx, stack, Math.PI / 2, 4, ink, 1);
    stroke(ctx, stack, ink, 1.6);
    birds(ctx, ink, 8, 9, [120, 820, 620, 930]);
  },

  hook(ctx, ink, paper) {
    waves(ctx, 1195, 1400, ink, 41);
    const rock = new Path2D();
    rock.moveTo(0, 1200);
    rock.bezierCurveTo(200, 1150, 420, 1170, 560, 1150);
    rock.bezierCurveTo(720, 1130, 880, 1150, 1024, 1140);
    rock.lineTo(1024, 1215);
    rock.lineTo(0, 1215);
    rock.closePath();
    fill(ctx, rock, paper);
    hatch(ctx, rock, 0.05, 5, ink, 1.1, 0.8);
    stroke(ctx, rock, ink, 1.8);
    const tower = path([[485, 1150], [500, 900], [620, 900], [635, 1150]], true);
    fill(ctx, tower, paper);
    for (const [y0, y1] of [[958, 1008], [1062, 1112]]) {
      const k0 = (y0 - 900) / 250;
      const k1 = (y1 - 900) / 250;
      hatch(ctx, path([[500 - 15 * k0, y0], [620 + 15 * k0, y0], [620 + 15 * k1, y1], [500 - 15 * k1, y1]], true), 0, 3, ink, 1.2);
    }
    stroke(ctx, tower, ink, 2);
    hatch(ctx, path([[500, 900], [512, 900], [522, 1150], [500, 1150]], true), Math.PI / 2, 3, ink, 1, 0.6);
    const gallery = path([[478, 900], [478, 886], [642, 886], [642, 900]], true);
    fill(ctx, gallery, paper);
    stroke(ctx, gallery, ink, 1.8);
    for (let x = 482; x < 640; x += 9) stroke(ctx, path([[x, 886], [x, 868]]), ink, 1.1);
    stroke(ctx, path([[478, 868], [642, 868]]), ink, 1.4);
    const lantern = path([[528, 886], [528, 834], [592, 834], [592, 886]], true);
    fill(ctx, lantern, paper);
    stroke(ctx, lantern, ink, 1.8);
    for (let x = 540; x < 590; x += 13) stroke(ctx, path([[x, 834], [x, 886]]), ink, 1.1);
    const dome = new Path2D();
    dome.ellipse(560, 834, 34, 26, 0, Math.PI, 0);
    fill(ctx, dome, paper);
    hatch(ctx, dome, 0.6, 4, ink, 1);
    stroke(ctx, dome, ink, 1.8);
    const house = path([[660, 1150], [660, 1080], [700, 1050], [760, 1050], [800, 1080], [800, 1150]], true);
    fill(ctx, house, paper);
    stroke(ctx, house, ink, 1.6);
    hatch(ctx, path([[660, 1080], [700, 1050], [760, 1050], [800, 1080]], true), 0.7, 4, ink, 1);
    windows(ctx, 670, 1092, 120, 40, 3, 1, ink);
    birds(ctx, ink, 12, 6, [700, 820, 960, 940]);
  },

  newgrange(ctx, ink, paper) {
    // Winter-solstice sunrise behind the passage tomb.
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 30; i++) {
      const a = Math.PI + (i / 29) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(250 + Math.cos(a) * 92, 1000 + Math.sin(a) * 92);
      ctx.lineTo(250 + Math.cos(a) * (150 + (i % 2) * 50), 1000 + Math.sin(a) * (150 + (i % 2) * 50));
      ctx.stroke();
    }
    ctx.restore();
    const sun = new Path2D();
    sun.arc(250, 1000, 78, Math.PI, 0);
    hatch(ctx, sun, 0, 5, ink, 1.1, 0.8);
    stroke(ctx, sun, ink, 1.8);
    const mound = new Path2D();
    mound.moveTo(70, 1120);
    mound.bezierCurveTo(160, 930, 860, 930, 960, 1120);
    mound.closePath();
    fill(ctx, mound, paper);
    ctx.save();
    ctx.clip(mound);
    const r = rng(5);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 900; i++) {
      const x = 70 + r() * 890;
      const y = 950 + r() * 110;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y - 7);
      ctx.stroke();
    }
    ctx.restore();
    const wall = new Path2D();
    wall.moveTo(118, 1052);
    wall.bezierCurveTo(330, 1030, 700, 1030, 912, 1052);
    wall.lineTo(950, 1118);
    wall.lineTo(80, 1118);
    wall.closePath();
    fill(ctx, wall, paper);
    ctx.save();
    ctx.clip(wall);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    for (let y = 1040; y < 1120; y += 11)
      for (let x = 80 + ((y / 11) % 2) * 9; x < 950; x += 18) {
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    ctx.restore();
    stroke(ctx, wall, ink, 1.6);
    stroke(ctx, mound, ink, 2);
    const door = path([[492, 1118], [492, 1070], [532, 1070], [532, 1118]], true);
    fill(ctx, door, ink, 0.85);
    stroke(ctx, path([[484, 1058], [540, 1058], [540, 1046], [484, 1046]], true), ink, 1.6);
    // Entrance kerbstone with the triple spiral.
    const kerb = new Path2D();
    kerb.ellipse(512, 1150, 120, 32, 0, 0, Math.PI * 2);
    fill(ctx, kerb, paper);
    stroke(ctx, kerb, ink, 1.8);
    for (const [cx, cy] of [[470, 1146], [554, 1146], [512, 1160]] as Pt[]) {
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.1) {
        const rr = a * 2.2;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.45;
        if (a) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    // Field.
    const g = rng(9);
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    for (let y = 1190; y < 1400; y += 14)
      for (let x = (y * 7) % 23; x < PW; x += 16 + g() * 10) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2, y - 6 - (y - 1190) * 0.02);
        ctx.stroke();
      }
    ctx.restore();
  },

  causeway(ctx, ink, paper) {
    const cliff = new Path2D();
    cliff.moveTo(0, 1000);
    cliff.bezierCurveTo(260, 930, 600, 940, 1024, 880);
    cliff.lineTo(1024, 1100);
    cliff.lineTo(0, 1100);
    cliff.closePath();
    hatch(ctx, cliff, Math.PI / 2, 6, ink, 1, 0.5);
    stroke(ctx, cliff, ink, 1.5, 0.7);
    waves(ctx, 1110, 1400, ink, 51, 0.6);
    const R = 30;
    const rows = 7;
    for (let row = 0; row < rows; row++) {
      const y = 1095 + row * 40;
      for (let i = 0; i < 16; i++) {
        const x = 340 + i * R * 1.5 + (row % 2) * R * 0.75 - row * 22;
        if (x < 300 - row * 30 || x > PW + 30) continue;
        const h = 24 + Math.max(0, (x - 300) * 0.1) + ((i * 37 + row * 11) % 5) * 7;
        const ty = y - h;
        const hex: Pt[] = [];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          hex.push([x + Math.cos(a) * R * 0.95, ty + Math.sin(a) * R * 0.45]);
        }
        const side = path([[x - R * 0.95, ty], [x - R * 0.95, y + 8], [x + R * 0.95, y + 8], [x + R * 0.95, ty]], true);
        fill(ctx, side, paper);
        hatch(ctx, side, Math.PI / 2, 4.5, ink, 1, 0.8);
        stroke(ctx, side, ink, 1.4);
        const top = path(hex, true);
        fill(ctx, top, paper);
        stroke(ctx, top, ink, 1.4);
      }
    }
  },

  glendalough(ctx, ink, paper) {
    const m1 = new Path2D();
    m1.moveTo(0, 1150);
    m1.bezierCurveTo(140, 900, 300, 860, 520, 1000);
    m1.bezierCurveTo(640, 930, 820, 880, 1024, 960);
    m1.lineTo(1024, 1150);
    m1.closePath();
    hatch(ctx, m1, 0.5, 7, ink, 1, 0.45);
    stroke(ctx, m1, ink, 1.6, 0.8);
    waves(ctx, 1200, 1400, ink, 61);
    // Trees.
    const r = rng(14);
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 70; i++) {
      const x = r() * PW;
      const y = 1110 + r() * 80;
      ctx.beginPath();
      ctx.arc(x, y, 8 + r() * 10, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
    }
    ctx.restore();
    const tower = path([[300, 1190], [310, 830], [360, 830], [370, 1190]], true);
    fill(ctx, tower, paper);
    ctx.save();
    ctx.clip(tower);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    for (let y = 836; y < 1190; y += 10)
      for (let x = 300 + ((y / 10) % 2) * 8; x < 372; x += 16) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    ctx.restore();
    hatch(ctx, path([[350, 830], [360, 830], [370, 1190], [352, 1190]], true), Math.PI / 2, 3, ink, 1);
    stroke(ctx, tower, ink, 1.8);
    const cap = path([[304, 832], [335, 750], [366, 832]], true);
    fill(ctx, cap, paper);
    hatch(ctx, cap, 1.2, 4, ink, 1);
    stroke(ctx, cap, ink, 1.8);
    for (const y of [880, 980, 1070]) fill(ctx, path([[330, y], [330, y - 18], [340, y - 24], [340, y]], true), ink, 0.8);
    // Church ruin.
    const church = path([[560, 1190], [560, 1060], [650, 990], [740, 1060], [740, 1190]], true);
    fill(ctx, church, paper);
    hatch(ctx, church, 0, 9, ink, 1, 0.55);
    stroke(ctx, church, ink, 1.8);
    const win = new Path2D();
    win.moveTo(636, 1120);
    win.lineTo(636, 1070);
    win.arc(650, 1070, 14, Math.PI, 0);
    win.lineTo(664, 1120);
    win.closePath();
    fill(ctx, win, ink, 0.75);
  },

  hapenny(ctx, ink, paper) {
    const r = rng(17);
    for (let x = 0; x < PW; ) {
      const w = 90 + r() * 50;
      const h = 150 + r() * 90;
      const b = path([[x, 1160], [x, 1160 - h], [x + w, 1160 - h], [x + w, 1160]], true);
      fill(ctx, b, paper);
      stroke(ctx, b, ink, 1.3, 0.7);
      windows(ctx, x + 8, 1160 - h + 14, w - 16, h - 30, 3, Math.round(h / 40), ink);
      stroke(ctx, path([[x, 1160 - h + 8], [x + w, 1160 - h + 8]]), ink, 1, 0.6);
      x += w + 2;
    }
    waves(ctx, 1185, 1400, ink, 71);
    stroke(ctx, path([[0, 1172], [PW, 1172]]), ink, 2);
    // Cast-iron elliptical arch with ring railings.
    const arch = new Path2D();
    arch.moveTo(90, 1176);
    arch.quadraticCurveTo(512, 1010, 934, 1176);
    arch.lineTo(934, 1186);
    arch.quadraticCurveTo(512, 1030, 90, 1186);
    arch.closePath();
    fill(ctx, arch, paper);
    stroke(ctx, arch, ink, 2);
    const yAt = (x: number) => {
      const t = (x - 90) / 844;
      return (1 - t) * (1 - t) * 1176 + 2 * (1 - t) * t * 1010 + t * t * 1176;
    };
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.2;
    for (let x = 110; x < 920; x += 17) {
      const y = yAt(x);
      ctx.beginPath();
      ctx.ellipse(x, y - 15, 7, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let x = 90; x <= 934; x += 6) ctx.lineTo(x, yAt(x) - 30);
    ctx.stroke();
    ctx.restore();
    for (const x of [330, 512, 694]) {
      const y = yAt(x) - 30;
      const lamp = new Path2D();
      lamp.moveTo(x - 30, y);
      lamp.quadraticCurveTo(x, y - 70, x + 30, y);
      stroke(ctx, lamp, ink, 1.8);
      const glass = path([[x - 7, y - 54], [x + 7, y - 54], [x + 5, y - 38], [x - 5, y - 38]], true);
      fill(ctx, glass, paper);
      stroke(ctx, glass, ink, 1.4);
    }
    const shadow = new Path2D();
    shadow.moveTo(90, 1186);
    shadow.quadraticCurveTo(512, 1030, 934, 1186);
    shadow.lineTo(934, 1192);
    shadow.lineTo(90, 1192);
    shadow.closePath();
    hatch(ctx, shadow, 0, 3.4, ink, 1);
  },

  skellig(ctx, ink, paper) {
    waves(ctx, 1080, 1400, ink, 81, 0.75);
    const big = new Path2D();
    big.moveTo(170, 1130);
    big.lineTo(300, 960);
    big.lineTo(360, 820);
    big.lineTo(430, 930);
    big.lineTo(520, 860);
    big.lineTo(610, 990);
    big.lineTo(720, 1130);
    big.closePath();
    fill(ctx, big, paper);
    hatch(ctx, big, 1.05, 5, ink, 1.1, 0.8);
    hatch(ctx, path([[360, 820], [430, 930], [520, 860], [610, 990], [720, 1130], [440, 1130]], true), -0.4, 4, ink, 1, 0.6);
    stroke(ctx, big, ink, 2.2);
    const small = new Path2D();
    small.moveTo(760, 1130);
    small.lineTo(830, 1000);
    small.lineTo(870, 960);
    small.lineTo(950, 1130);
    small.closePath();
    fill(ctx, small, paper);
    hatch(ctx, small, 1.2, 5, ink, 1.1, 0.75);
    stroke(ctx, small, ink, 2);
    // Stone steps and beehive huts.
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let x = 240;
    let y = 1100;
    while (y > 900) {
      ctx.moveTo(x, y);
      x += 16;
      y -= 9;
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - 9);
      y -= 9;
    }
    ctx.stroke();
    ctx.restore();
    for (const [cx, cy] of [[440, 922], [470, 918], [500, 925]] as Pt[]) {
      const hut = new Path2D();
      hut.ellipse(cx, cy, 13, 16, 0, Math.PI, 0);
      fill(ctx, hut, paper);
      hatch(ctx, hut, 0, 3.5, ink, 1);
      stroke(ctx, hut, ink, 1.4);
    }
    birds(ctx, ink, 21, 22, [700, 820, 1000, 990]);
  },

  aran(ctx, ink, paper) {
    const r = rng(23);
    const horizons = [960, 1040, 1150, 1290];
    horizons.forEach((h, i) => {
      const curve: Pt[] = [];
      for (let x = -20; x <= PW + 20; x += 20) curve.push([x, h + Math.sin(x * 0.004 + i * 1.7) * 16]);
      const field = path([...curve, [PW, h + 160], [0, h + 160]], true);
      fill(ctx, field, paper);
      if (i % 2) hatch(ctx, field, 0.04, 10, ink, 1, 0.25);
      // Dry-stone wall: irregular stones packed along the field edge.
      const size = 8 + i * 3;
      for (let x = -10; x < PW + 10; x += size * (1.5 + r() * 0.5)) {
        const y = h + Math.sin(x * 0.004 + i * 1.7) * 16 - size * 0.7;
        const stone: Pt[] = [];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          stone.push([x + Math.cos(a) * size * (0.7 + r() * 0.4), y + Math.sin(a) * size * (0.5 + r() * 0.3)]);
        }
        const st = path(stone, true);
        fill(ctx, st, paper);
        hatch(ctx, st, 0.8, 3, ink, 0.8, 0.5, [x - size, y - size, x + size, y + size]);
        stroke(ctx, st, ink, 1.4, 0.9);
      }
      if (i === 0) {
        const wall = path([[640, h - 14], [640, h - 84], [800, h - 84], [800, h - 14]], true);
        fill(ctx, wall, paper);
        stroke(ctx, wall, ink, 1.6);
        const roof = new Path2D();
        roof.moveTo(630, h - 80);
        roof.quadraticCurveTo(720, h - 150, 810, h - 80);
        roof.closePath();
        fill(ctx, roof, paper);
        hatch(ctx, roof, Math.PI / 2 - 0.3, 4, ink, 1);
        stroke(ctx, roof, ink, 1.6);
        fill(ctx, path([[700, h - 14], [700, h - 54], [722, h - 54], [722, h - 14]], true), ink, 0.8);
        windows(ctx, 650, h - 70, 40, 30, 1, 1, ink);
        windows(ctx, 750, h - 70, 40, 30, 1, 1, ink);
      }
    });
  },

  howth(ctx, ink, paper) {
    const head = new Path2D();
    head.moveTo(420, 1180);
    head.bezierCurveTo(560, 1010, 800, 960, 1024, 1000);
    head.lineTo(1024, 1180);
    head.closePath();
    fill(ctx, head, paper);
    hatch(ctx, head, 0.45, 6, ink, 1, 0.6);
    stroke(ctx, head, ink, 1.8);
    waves(ctx, 1180, 1400, ink, 91);
    const pier = path([[0, 1172], [380, 1172], [380, 1186], [0, 1186]], true);
    fill(ctx, pier, paper);
    hatch(ctx, pier, Math.PI / 2, 8, ink, 1);
    stroke(ctx, pier, ink, 1.5);
    const lh = path([[330, 1172], [338, 1080], [362, 1080], [370, 1172]], true);
    fill(ctx, lh, paper);
    stroke(ctx, lh, ink, 1.6);
    hatch(ctx, path([[333, 1130], [367, 1130], [369, 1150], [331, 1150]], true), 0, 3, ink, 1);
    stroke(ctx, path([[340, 1080], [340, 1060], [360, 1060], [360, 1080]]), ink, 1.5);
    for (const [x, s] of [[150, 1], [560, 0.7], [250, 0.5]] as Pt[]) {
      const y = 1215 + (1 - s) * 20;
      const sail = path([[x, y - 120 * s], [x, y - 10 * s], [x + 70 * s, y - 10 * s]], true);
      fill(ctx, sail, paper);
      hatch(ctx, sail, Math.PI / 2, 6, ink, 1, 0.6);
      stroke(ctx, sail, ink, 1.4);
      const hull = path([[x - 40 * s, y], [x + 90 * s, y], [x + 70 * s, y + 18 * s], [x - 26 * s, y + 18 * s]], true);
      fill(ctx, hull, paper);
      stroke(ctx, hull, ink, 1.6);
    }
    birds(ctx, ink, 31, 8, [500, 860, 980, 960]);
  },

  contours(ctx, ink) {
    const peaks: [number, number, number][] = [[300, 520, 1], [700, 860, 0.8], [520, 1180, 0.7], [860, 360, 0.6]];
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.42;
    for (const [cx, cy, s] of peaks)
      for (let k = 1; k < 13; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * Math.PI * 2;
          const r = k * 26 * s * (1 + 0.18 * Math.sin(a * 3 + k * 0.5 + cx) + 0.1 * Math.sin(a * 5 + cy));
          const x = cx + Math.cos(a) * r * 1.2;
          const y = cy + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    ctx.restore();
  },
};
