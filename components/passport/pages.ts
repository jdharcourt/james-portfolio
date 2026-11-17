import { awards, education, equilibrium, experience, profile, projects, socials, toolbox, type Project } from "@/lib/data";
import * as A from "./art";
import { FACE_IDS, pageOf } from "./sections";

export type Fonts = { sans: string; mono: string; serif: string; script: string };
export type LinkTarget = { href: string } | { spread: number };
export type Hotspot = { u0: number; v0: number; u1: number; v1: number; target: LinkTarget; label: string };
export type Assets = { fonts: Fonts; photo: HTMLCanvasElement | null };

type Pal = { top: string; bottom: string; art: string; paper: string };
type FaceDef = {
  id: string;
  title: string;
  pal: Pal;
  holo?: boolean;
  /** Faces with the same key share one texture (the blank visa pages). */
  shared?: string;
  draw: (p: Painter) => void;
};

const BLUE = "#2c46a8";
const INK = "#1f2630";
const DOC_NO = "JH202614";

const PAL: Record<string, Pal> = {
  lilac: { top: "#efeaf3", bottom: "#e3e6ef", art: "#7d7fb4", paper: "#ebe8f2" },
  mint: { top: "#eef5ec", bottom: "#dcece2", art: "#4f9478", paper: "#e5f0e7" },
  peach: { top: "#faf0e6", bottom: "#f3dccd", art: "#cf7a5a", paper: "#f7e7dc" },
  sky: { top: "#edf2f7", bottom: "#d9e5f0", art: "#5d86bd", paper: "#e4ecf4" },
  heather: { top: "#f2edf5", bottom: "#e2d9ec", art: "#8a6fb3", paper: "#ebe4f1" },
  gold: { top: "#f8f2e1", bottom: "#eee0c0", art: "#b88a37", paper: "#f3eacf" },
  teal: { top: "#eaf4f2", bottom: "#d2e8e6", art: "#3f8f8c", paper: "#e0efed" },
  sage: { top: "#f1f4e8", bottom: "#e0e8d1", art: "#6f8c4c", paper: "#e9eedd" },
  rose: { top: "#f8ecec", bottom: "#eed7db", art: "#bb6b79", paper: "#f3e3e5" },
  sand: { top: "#f7efe3", bottom: "#ebdac3", art: "#a97f50", paper: "#f1e5d4" },
  blue: { top: "#edf1f8", bottom: "#d6e0ef", art: "#5374b0", paper: "#e3e9f4" },
  moss: { top: "#eef3ea", bottom: "#dbe7d8", art: "#5f8f66", paper: "#e5eee2" },
  data: { top: "#dff0e7", bottom: "#f3eed5", art: "#3c8c62", paper: "#e8f2e6" },
};

const linkText = (href: string) => href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export class Painter {
  links: Hotspot[] = [];
  x0 = 118;
  x1 = 930;
  verso = false;
  pal: Pal = PAL.mint;

  constructor(
    public ctx: CanvasRenderingContext2D,
    public assets: Assets,
  ) {}

  font(weight: number, size: number, family: keyof Fonts) {
    this.ctx.font = `${weight} ${size}px ${this.assets.fonts[family]}`;
  }

  text(
    s: string,
    x: number,
    y: number,
    o: { size: number; weight?: number; family?: keyof Fonts; color?: string; track?: number; align?: CanvasTextAlign; alpha?: number },
  ) {
    const ctx = this.ctx;
    this.font(o.weight ?? 400, o.size, o.family ?? "sans");
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.fillStyle = o.color ?? INK;
    ctx.textBaseline = "alphabetic";
    const track = o.track ?? 0;
    const chars = [...s];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = track ? widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) : ctx.measureText(s).width;
    let cx = o.align === "right" ? x - total : o.align === "center" ? x - total / 2 : x;
    if (!track) {
      ctx.textAlign = "left";
      ctx.fillText(s, cx, y);
    } else {
      ctx.textAlign = "left";
      chars.forEach((c, i) => {
        ctx.fillText(c, cx, y);
        cx += widths[i] + track;
      });
    }
    ctx.restore();
    return total;
  }

  wrap(s: string, max: number, size: number, weight = 400, family: keyof Fonts = "sans") {
    this.font(weight, size, family);
    const out: string[] = [];
    let line = "";
    for (const word of s.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(next).width > max && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  para(s: string, x: number, y: number, max: number, size = 27, color = INK, lead = 1.38, weight = 400, family: keyof Fonts = "sans") {
    const lines = this.wrap(s, max, size, weight, family);
    lines.forEach((l, i) => this.text(l, x, y + i * size * lead, { size, color, weight, family }));
    return y + lines.length * size * lead;
  }

  /** Register a clickable rectangle in the current transform as page UVs. */
  link(x: number, y: number, w: number, h: number, target: LinkTarget, label: string) {
    const m = this.ctx.getTransform();
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => new DOMPoint(px, py).matrixTransform(m));
    const cw = this.ctx.canvas.width;
    const ch = this.ctx.canvas.height;
    const xs = pts.map((p) => p.x / cw);
    const ys = pts.map((p) => p.y / ch);
    this.links.push({ u0: Math.min(...xs), u1: Math.max(...xs), v0: Math.min(...ys), v1: Math.max(...ys), target, label });
  }

  background(seed: number) {
    const { ctx, pal } = this;
    const g = ctx.createLinearGradient(0, 0, A.PW * 0.3, A.PH);
    g.addColorStop(0, pal.top);
    g.addColorStop(1, pal.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, A.PW, A.PH);
    const glow = ctx.createRadialGradient(A.PW * 0.5, A.PH * 0.32, 40, A.PW * 0.5, A.PH * 0.32, A.PW * 0.75);
    glow.addColorStop(0, "rgba(255,255,255,0.55)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, A.PW, A.PH);
    A.guilloche(ctx, pal.art, seed, 0.11);
    A.harp(ctx, A.PW / 2 - 150, 330, 420, pal.art, 0.05);
    A.rosette(ctx, this.verso ? 150 : A.PW - 150, 360, 70, pal.art, 0.28);
    // Microprinted border text.
    this.text("ÉIREIRELANDÉIREIRELANDÉIREIRELANDÉIREIRELANDÉIREIRELANDÉIREIRELANDÉIREIRELAND", A.PW / 2, A.PH - 24, {
      size: 9,
      color: pal.art,
      align: "center",
      alpha: 0.6,
      track: 1,
    });
    A.perforation(ctx, DOC_NO, A.PW / 2, 64, this.verso);
  }

  header(en: string, ga: string, y = 196, no?: string) {
    const { x0, x1 } = this;
    this.text(`${en}  /  ${ga}`.toUpperCase(), x0, y, { size: 17, weight: 500, color: BLUE, track: 3.2, alpha: 0.9 });
    if (no) this.text(no, x1, y, { size: 17, weight: 500, color: BLUE, track: 2, align: "right", alpha: 0.9 });
    const c = this.ctx;
    c.save();
    c.strokeStyle = BLUE;
    c.globalAlpha = 0.45;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x0, y + 16);
    c.lineTo(x1, y + 16);
    c.stroke();
    c.restore();
  }

  label(ga: string, en: string, x: number, y: number) {
    this.text(ga === en ? en : `${ga}/${en}`, x, y, { size: 19, weight: 500, color: BLUE });
  }

  /** Bilingual label above a typewritten value. Returns the next baseline. */
  field(ga: string, en: string, value: string, x: number, y: number, o: { size?: number; link?: LinkTarget; max?: number; family?: keyof Fonts } = {}) {
    this.label(ga, en, x, y);
    const size = o.size ?? 32;
    const fam = o.family ?? "mono";
    const color = o.link ? BLUE : INK;
    const lines = o.max ? this.wrap(value, o.max, size, 500, fam) : [value];
    let w = 0;
    lines.forEach((l, i) => {
      w = Math.max(w, this.text(l, x, y + 40 + i * size * 1.2, { size, weight: 500, family: fam, color, track: fam === "mono" ? 1 : 0 }));
    });
    if (o.link) this.link(x - 6, y + 40 - size, w + 12, size * 1.2 * lines.length + 8, o.link, `${en}: ${value}`);
    return y + 40 + (lines.length - 1) * size * 1.2 + 50;
  }

  mrz(lines: string[], y: number) {
    lines.forEach((l, i) => this.text(l.padEnd(40, "<").slice(0, 40).toUpperCase(), this.x0, y + i * 34, { size: 22, family: "mono", color: "#2a3140", track: 2.6, alpha: 0.85 }));
  }

  footer(no: number, section: string) {
    const y = A.PH - 120;
    const n = String(no);
    const c = this.ctx;
    c.save();
    c.strokeStyle = BLUE;
    c.lineWidth = 1.6;
    c.globalAlpha = 0.8;
    if (this.verso) {
      const w = this.text(n, this.x0 + 30, y, { size: 72, weight: 500, color: BLUE });
      c.beginPath();
      c.moveTo(this.x0 + 50 + w, y - 8);
      c.lineTo(this.x0 + 150 + w, y - 8);
      c.stroke();
      this.text(section.toUpperCase(), this.x0 + 170 + w, y - 8, { size: 22, weight: 500, color: BLUE, track: 6 });
    } else {
      const w = this.text(n, this.x1 - 30, y, { size: 72, weight: 500, color: BLUE, align: "right" });
      c.beginPath();
      c.moveTo(this.x1 - 50 - w, y - 8);
      c.lineTo(this.x1 - 150 - w, y - 8);
      c.stroke();
      this.text(section.toUpperCase(), this.x1 - 170 - w, y - 8, { size: 22, weight: 500, color: BLUE, track: 6, align: "right" });
    }
    c.restore();
  }

  caption(s: string) {
    this.text(s.toUpperCase(), this.verso ? this.x0 + 10 : this.x1 - 10, A.PH - 52, { size: 15, weight: 500, color: this.pal.art, track: 4, align: this.verso ? "left" : "right", alpha: 0.9 });
  }

  scene(name: keyof typeof A.scenes, drop = 0) {
    this.ctx.save();
    this.ctx.translate(0, drop);
    this.ctx.globalAlpha = 0.9;
    A.scenes[name](this.ctx, this.pal.art, this.pal.paper);
    this.ctx.restore();
  }

  stamp(s: Omit<A.StampSpec, "font">) {
    A.stamp(this.ctx, { ...s, font: this.assets.fonts.sans });
  }
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

type ProjectArt = { scene: keyof typeof A.scenes; caption: string; pal: Pal; stamps: Omit<A.StampSpec, "font">[]; status: string };

const PROJECT_ART: Record<string, ProjectArt> = {
  GlucoBit: {
    scene: "cliffs",
    caption: "Cliffs of Moher · Co. Clare",
    pal: PAL.sky,
    status: "Award winner",
    stamps: [
      { x: 300, y: 930, rot: -0.2, color: "#2c46a8", shape: "circle", lines: ["3RD", "YOUNG SCIENTIST · TECHNOLOGY", "JAN 2026"], seed: 3 },
      { x: 700, y: 900, rot: 0.12, color: "#a3323f", shape: "rect", lines: ["MEDTRONIC", "SPECIAL AWARD", "BTYSTE 2026"], seed: 4 },
    ],
  },
  "Pointy R1": {
    scene: "hook",
    caption: "Hook Head · Co. Wexford",
    pal: PAL.heather,
    status: "In build",
    stamps: [{ x: 260, y: 900, rot: -0.14, color: "#2f7a55", shape: "rect", lines: ["LAUNCH", "TVC · TELEMETRY", "2026"], seed: 5 }],
  },
  "Solar Tracker": {
    scene: "newgrange",
    caption: "Brú na Bóinne · Co. Meath",
    pal: PAL.gold,
    status: "Award winner",
    stamps: [{ x: 730, y: 880, rot: 0.16, color: "#2f7a55", shape: "circle", lines: ["AWARD", "SCIFEST · EIRGRID SUSTAINABLE FUTURE", "MAY 2023"], seed: 6 }],
  },
  Wisprsight: {
    scene: "glendalough",
    caption: "Glendalough · Co. Wicklow",
    pal: PAL.sage,
    status: "In development",
    stamps: [{ x: 720, y: 900, rot: 0.14, color: "#7a3a8c", shape: "oval", lines: ["SILENT", "ON-DEVICE · WEBGPU", "2026"], seed: 8, w: 300, h: 210 }],
  },
  UniCAD: {
    scene: "causeway",
    caption: "Giant's Causeway · Co. Antrim",
    pal: PAL.teal,
    status: "Open source",
    stamps: [{ x: 260, y: 900, rot: -0.1, color: "#2c46a8", shape: "rect", lines: ["INTERCHANGE", "SLDPRT · FCSTD · F3D", "2026"], seed: 7, w: 330 }],
  },
};

const FALLBACK_ART: ProjectArt[] = [
  { scene: "skellig", caption: "Sceilg Mhichíl · Co. Kerry", pal: PAL.blue, status: "Project", stamps: [] },
  { scene: "aran", caption: "Inis Mór · Co. Galway", pal: PAL.moss, status: "Project", stamps: [] },
];

function mrzName(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]+/g, "<");
}

function projectFace(project: Project, index: number, pageNo: number): FaceDef {
  const art = PROJECT_ART[project.name] ?? FALLBACK_ART[index % FALLBACK_ART.length];
  return {
    id: `project-${index}`,
    title: project.name,
    pal: art.pal,
    draw(p) {
      p.background(40 + index);
      p.scene(art.scene);
      p.header("Project entry", "Iontráil tionscadail", 196, `Nº ${String(index + 1).padStart(2, "0")}`);
      const { x0, x1 } = p;
      const right = x0 + 470;
      p.label("Ainm", "Name", x0, 262);
      p.text(project.name.toUpperCase(), x0, 318, { size: 50, weight: 500, track: 3 });
      p.field("Stádas", "Status", art.status.toUpperCase(), right, 262, { size: 28 });
      p.field("Catagóir", "Category", project.category.toUpperCase(), x0, 362, { size: 28 });
      p.field("Bliain", "Year", project.year, right, 362, { size: 28 });
      p.label("Faoi", "About", x0, 462);
      let y = p.para(project.summary ?? project.description, x0, 502, x1 - x0, 28);
      y = p.field("Teicneolaíocht", "Stack", project.stack.join(" · "), x0, y + 12, { size: 22, max: x1 - x0, family: "mono" });
      y = p.field("Foinse", "Source", linkText(project.href).toUpperCase(), x0, y - 4, { size: 24, link: { href: project.href } });
      if (project.demo) y = p.field("Taispeántas", "Demo", linkText(project.demo).toUpperCase(), x0, y - 4, { size: 24, link: { href: project.demo } });
      if (project.site) y = p.field("Suíomh", "Website", linkText(project.site).toUpperCase(), x0, y - 4, { size: 24, link: { href: project.site } });
      p.mrz([`PROJECT<<${mrzName(project.name)}<<HARCOURT<<JAMES`, `${mrzName(project.category)}<<${project.year.replace(/\D/g, "")}`], Math.max(y + 10, 770));
      art.stamps.forEach((s) => p.stamp({ ...s, y: Math.max(s.y, y + 170) }));
      p.footer(pageNo, "Projects");
      p.caption(art.caption);
    },
  };
}

function buildFaces(): FaceDef[] {
  const faces: FaceDef[] = [];

  faces.push({ id: "cover", title: "Cover", pal: PAL.mint, draw: () => undefined });

  faces.push({
    id: "inside-front",
    title: "Request",
    pal: PAL.lilac,
    draw(p) {
      p.background(1);
      const c = p.ctx;
      A.harp(c, A.PW / 2 - 52, 150, 150, "#4b6b5c", 0.9);
      p.text("PAS · PASSPORT", A.PW / 2, 370, { size: 40, weight: 600, family: "serif", color: "#2f5d4c", track: 8, align: "center" });
      p.text("ÉIRE · IRELAND · IRLANDE", A.PW / 2, 412, { size: 18, weight: 500, color: "#2f5d4c", track: 6, align: "center", alpha: 0.85 });
      let y = 500;
      for (const l of p.wrap("Iarrann James Harcourt ar gach n-aon lena mbaineann ligean don léitheoir gabháil ar aghaidh gan bhac gan chosc.", 760, 31, 500, "serif")) {
        p.text(l, A.PW / 2, y, { size: 31, weight: 500, family: "serif", color: "#3b4a44", align: "center" });
        y += 42;
      }
      y += 26;
      for (const l of p.wrap(`${profile.name}, ${profile.role.toLowerCase()}, requests all whom it may concern to allow the reader to pass freely and without hindrance through these pages.`, 760, 31, 500, "serif")) {
        p.text(l, A.PW / 2, y, { size: 31, weight: 500, family: "serif", color: "#3b4a44", align: "center" });
        y += 42;
      }
      A.rosette(c, A.PW / 2, y + 90, 60, "#4b6b5c", 0.5, 14);
      p.text("Síniú an tsealbhóra / Signature of bearer", A.PW / 2, A.PH - 250, { size: 17, weight: 500, color: BLUE, align: "center", track: 1 });
      p.text(profile.name, A.PW / 2, A.PH - 300, { size: 92, family: "script", color: "#1d2a5a", align: "center" });
      p.caption("Baile Átha Cliath · Dublin");
    },
  });

  faces.push({
    id: "identity",
    title: "Identity",
    pal: PAL.data,
    holo: true,
    draw(p) {
      const c = p.ctx;
      const LW = A.PH;
      const LH = A.PW;
      c.save();
      // The data page is printed sideways, like a real passport.
      c.translate(0, A.PH);
      c.rotate(-Math.PI / 2);
      const g = c.createLinearGradient(0, 0, LW, LH);
      g.addColorStop(0, "#d7eee4");
      g.addColorStop(0.5, "#e9f2df");
      g.addColorStop(1, "#f6ecd2");
      c.fillStyle = g;
      c.fillRect(0, 0, LW, LH);
      c.save();
      c.strokeStyle = "#3c8c62";
      c.globalAlpha = 0.12;
      c.lineWidth = 1;
      for (let y = -60; y < LH + 60; y += 8) {
        c.beginPath();
        for (let x = 0; x <= LW; x += 12) c.lineTo(x, y + Math.sin(x * 0.006 + y * 0.03) * 26 + Math.sin(x * 0.021) * 5);
        c.stroke();
      }
      c.restore();
      A.rosette(c, 1180, 300, 150, "#3c8c62", 0.18, 22);
      A.harp(c, 920, 260, 420, "#3c8c62", 0.06);
      // Clear machine-readable zone.
      c.fillStyle = "rgba(255,255,255,0.45)";
      c.fillRect(0, 800, LW, LH - 800);

      const GREEN = "#2f7d55";
      A.harp(c, 56, 34, 118, GREEN);
      p.text("Pas", 150, 82, { size: 46, weight: 600, color: GREEN });
      p.text("Passport", 150, 130, { size: 46, weight: 600, color: GREEN });
      A.chip(c, 385, 78, 66, GREEN);
      p.text("ÉIRE - IRELAND", 470, 84, { size: 46, weight: 600, color: GREEN, track: 1 });
      const lab = (s: string, x: number, y: number) => p.text(s.toUpperCase(), x, y, { size: 18, weight: 500, color: GREEN, track: 1.5 });
      const val = (s: string, x: number, y: number, link?: LinkTarget, size = 32) => {
        const w = p.text(s, x, y, { size, weight: 500, family: "mono", color: link ? BLUE : "#17222a", track: 1 });
        if (link) p.link(x - 6, y - size, w + 12, size + 14, link, s);
      };
      lab("Saghas / Type", 470, 128);
      val("PP", 470, 166);
      lab("Tír / Country", 640, 128);
      val("IRL", 640, 166);
      lab("Pas uimhir / Passport no.", 1010, 128);
      val(DOC_NO, 1010, 166);

      // Photo with a soft-edged frame, and the smaller ghost image.
      if (p.assets.photo) {
        c.save();
        c.globalCompositeOperation = "multiply";
        c.drawImage(p.assets.photo, 50, 200, 300, 380);
        c.restore();
        c.save();
        c.globalAlpha = 0.45;
        c.globalCompositeOperation = "multiply";
        c.drawImage(p.assets.photo, 1140, 430, 104, 132);
        c.restore();
      } else {
        c.fillStyle = "rgba(60,80,70,0.15)";
        c.fillRect(50, 200, 300, 380);
      }
      lab("Síniú / Signature", 56, 620);
      p.text(profile.name, 60, 690, { size: 62, family: "script", color: "#1d2a5a" });
      A.triquetra(c, 1330, 250, 46, GREEN, 0.9);
      A.harp(c, 1288, 440, 110, "#6f98ad", 0.55);

      const L = 400;
      const R = 900;
      lab("1. Sloinne / Surname", L, 236);
      val("HARCOURT", L, 274);
      lab("Náisiúntacht / Nationality", R, 236);
      val("ÉIREANNACH/IRISH", R, 274, undefined, 28);
      lab("2. Túsainm / Forename", L, 322);
      val("JAMES", L, 360);
      lab("Eagrán / Edition", R, 322);
      val("11.2026", R, 360, undefined, 28);
      lab("3. Ról / Role", L, 408);
      val(profile.role.toUpperCase(), L, 446, undefined, 30);
      lab("4. Cuideachta / Company", L, 494);
      val(`${equilibrium.name} · ${equilibrium.role}`.toUpperCase(), L, 532, { href: equilibrium.href }, 30);
      lab("5. Lonnaithe / Based in", L, 580);
      val(profile.location.toUpperCase(), L, 618, undefined, 30);
      lab("6. Ríomhphost / Email", L, 666);
      val(profile.email.toUpperCase(), L, 704, { href: `mailto:${profile.email}` }, 28);
      lab("7. GitHub", R, 580);
      val("@JDHARCOURT", R, 618, { href: socials.github }, 28);
      lab("8. LinkedIn", R, 666);
      val("JAMES HARCOURT", R, 704, { href: socials.linkedin }, 28);
      lab("9. Údarás / Authority", L, 752);
      val(profile.site.toUpperCase(), L, 790, { href: `https://${profile.site}` }, 26);

      const mrz = ["P<IRLHARCOURT<<JAMES", `${DOC_NO}<IRL2026<<EQUILIBRIUM<<DUBLIN`];
      mrz.forEach((l, i) => p.text(l.padEnd(44, "<"), 70, 890 + i * 62, { size: 36, family: "mono", color: "#17222a", track: 5.2 }));
      c.restore();
    },
  });


  // The back of the polycarbonate data card: security print only.
  faces.push({
    id: "data-verso",
    title: "Observations",
    pal: PAL.data,
    holo: true,
    draw(p) {
      p.background(5);
      A.harp(p.ctx, A.PW / 2 - 160, 420, 450, p.pal.art, 0.08);
      p.header("Observations", "Nótaí oifigiúla", 196);
      p.para("Tá 34 leathanach sa phas seo. This passport contains 34 pages.", p.x0, 290, p.x1 - p.x0, 26, "#2c3440", 1.4, 500, "serif");
      p.caption("Éire · Ireland");
    },
  });

  faces.push({
    id: "equilibrium",
    title: "Equilibrium",
    pal: PAL.peach,
    draw(p) {
      p.background(4);
      p.scene("poolbeg");
      p.header("Employment", "Fostaíocht", 196, "Nº 01");
      const { x0, x1 } = p;
      const right = x0 + 470;
      p.label("Ainm", "Name", x0, 262);
      p.text(equilibrium.name.toUpperCase(), x0, 318, { size: 50, weight: 500, track: 3 });
      p.field("Stádas", "Status", "CURRENT", right, 262, { size: 28 });
      p.field("Ról", "Role", equilibrium.role.toUpperCase(), x0, 362, { size: 28 });
      p.field("Ó", "Since", equilibrium.period.split("–")[0].trim().toUpperCase(), right, 362, { size: 28 });
      p.label("Faoi", "About", x0, 462);
      let y = p.para(equilibrium.summary, x0, 502, x1 - x0, 27);
      p.field("Sprioc", "Target", `${equilibrium.target.toUpperCase()} HVAC ENERGY`, x0, y + 10, { size: 28 });
      y = p.field("Suíomh", "Website", linkText(equilibrium.href).toUpperCase(), right, y + 10, { size: 28, link: { href: equilibrium.href } });
      p.mrz(["WORK<<EQUILIBRIUM<<HARCOURT<<JAMES", "CEO<<COFOUNDER<<DUBLIN<<2026"], y + 4);
      p.stamp({ x: 280, y: Math.max(1000, y + 200), rot: -0.18, color: "#2c46a8", shape: "circle", lines: ["CURRENT", "CEO & CO-FOUNDER · DUBLIN", "JUL 2026"], seed: 11 });
      p.stamp({ x: 720, y: Math.max(990, y + 190), rot: 0.1, color: "#a3323f", shape: "rect", lines: ["PATCH '26", "DOGPATCH LABS", "FIRST PROTOTYPE"], seed: 12 });
      p.footer(pageOf("equilibrium"), "Equilibrium");
      p.caption("Poolbeg · Dublin Bay");
    },
  });

  projects.forEach((project, i) => faces.push(projectFace(project, i, faces.length)));

  faces.push({
    id: "experience",
    title: "Experience",
    pal: PAL.rose,
    draw(p) {
      p.background(10);
      p.scene("hapenny", 150);
      p.header("Experience", "Taithí", 196);
      let y = 262;
      const { x0, x1 } = p;
      for (const e of experience) {
        p.text(e.period.toUpperCase(), x0, y, { size: 18, weight: 500, family: "mono", color: BLUE, track: 1.5 });
        p.text(e.org.toUpperCase(), x1, y, { size: 18, weight: 500, color: BLUE, track: 2.5, align: "right" });
        p.text(e.title, x0, y + 40, { size: 32, weight: 500 });
        const short = (e.description ?? "").split(/(?<=\.)\s/)[0];
        y = p.para(short, x0, y + 78, x1 - x0, 23, "#3a4250", 1.32) + 36;
      }
      p.footer(pageOf("experience"), "Experience");
      p.caption("Ha'penny Bridge · Dublin");
    },
  });

  faces.push({
    id: "awards",
    title: "Awards & education",
    pal: PAL.sand,
    draw(p) {
      p.background(11);
      p.scene("skellig", 170);
      p.header("Awards", "Gradaim", 196);
      let y = 262;
      const { x0, x1 } = p;
      for (const a of awards) {
        p.text(a.period.toUpperCase(), x0, y, { size: 18, weight: 500, family: "mono", color: BLUE, track: 1.5 });
        y = p.para(a.title, x0, y + 40, x1 - x0, 29, INK, 1.25, 500);
        y = p.para(a.org, x0, y - 4, x1 - x0, 22, "#3a4250", 1.3) + 26;
      }
      p.header("Education", "Oideachas", y + 16);
      y += 82;
      for (const e of education) {
        p.text(`${e.period.toUpperCase()}  ·  ${e.org.toUpperCase()}`, x0, y, { size: 18, weight: 500, family: "mono", color: BLUE, track: 1.2 });
        p.text(e.title, x0, y + 38, { size: 29, weight: 500 });
        y = p.para(e.description ?? "", x0, y + 72, x1 - x0, 22, "#3a4250") + 22;
      }
      p.stamp({ x: 300, y: Math.max(y + 120, 900), rot: -0.16, color: "#a3323f", shape: "circle", lines: ["3RD", "STRIPE YOUNG SCIENTIST", "2026"], seed: 21 });
      p.stamp({ x: 720, y: Math.max(y + 110, 890), rot: 0.12, color: "#2f7a55", shape: "rect", lines: ["NSEA", "MOST COMMERCIAL POTENTIAL", "MAY 2023"], seed: 22, w: 330 });
      p.footer(pageOf("awards"), "Awards");
      p.caption("Sceilg Mhichíl · Co. Kerry");
    },
  });

  faces.push({
    id: "toolbox",
    title: "Toolbox",
    pal: PAL.blue,
    draw(p) {
      p.background(12);
      p.scene("aran", 60);
      p.header("Toolbox", "Uirlisí", 196);
      const { x0, x1, ctx } = p;
      let x = x0;
      let y = 270;
      p.font(500, 24, "mono");
      for (const t of toolbox) {
        const w = ctx.measureText(t.toUpperCase()).width + 36;
        if (x + w > x1) {
          x = x0;
          y += 68;
        }
        ctx.save();
        ctx.strokeStyle = BLUE;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y - 34, w, 50, 25);
        ctx.stroke();
        ctx.restore();
        p.text(t.toUpperCase(), x + 18, y, { size: 24, weight: 500, family: "mono", color: INK });
        x += w + 14;
      }
      y += 110;
      p.label("Cur chuige", "Approach", x0, y);
      y = p.para(profile.approach, x0, y + 40, x1 - x0, 27) + 30;
      p.field("CV", "Résumé", "JAMESHARCOURT.IE/RESUME", x0, y, { size: 28, link: { href: "/resume" } });
      p.footer(pageOf("toolbox"), "Toolbox");
      p.caption("Inis Mór · Co. Galway");
    },
  });

  faces.push({
    id: "contact",
    title: "Contact",
    pal: PAL.lilac,
    draw(p) {
      p.background(15);
      p.scene("howth");
      p.header("In case of emergency", "I gcás éigeandála", 196);
      const { x0, x1 } = p;
      p.text("Contact", x0, 300, { size: 64, family: "serif", weight: 500, color: "#2a2f55" });
      let y = p.para("Open to opportunities and collaborations in hardware, embedded systems, health-tech and smart buildings.", x0, 360, x1 - x0, 28) + 30;
      y = p.field("Ríomhphost", "Email", profile.email.toUpperCase(), x0, y, { size: 32, link: { href: `mailto:${profile.email}` } });
      y = p.field("LinkedIn", "LinkedIn", "IN/JAMES-HARCOURT", x0, y, { size: 32, link: { href: socials.linkedin } });
      y = p.field("GitHub", "GitHub", "GITHUB.COM/JDHARCOURT", x0, y, { size: 32, link: { href: socials.github } });
      y = p.field("Suíomh", "Website", profile.site.toUpperCase(), x0, y, { size: 32, link: { href: `https://${profile.site}` } });
      p.field("Áit", "Location", profile.location.toUpperCase(), x0, y, { size: 32 });
      p.caption("Binn Éadair · Howth");
    },
  });

  // Blank visa pages fill the booklet out to its real thickness. They share
  // one texture per side, so they cost almost nothing to keep.
  while (faces.length < FACE_IDS.length - 1) {
    const id = FACE_IDS[faces.length];
    const verso = faces.length % 2 === 1;
    faces.push({
      id,
      title: "Visas",
      pal: verso ? PAL.lilac : PAL.mint,
      shared: verso ? "visa-verso" : "visa-recto",
      draw(p) {
        p.background(verso ? 21 : 22);
        p.scene("contours");
        p.header("Visas", "Víosaí", 196);
        p.caption(verso ? "Éire" : "Ireland");
      },
    });
  }

  faces.push({
    id: "inside-back",
    title: "Inside back cover",
    pal: PAL.lilac,
    draw(p) {
      p.background(23);
      const c = p.ctx;
      A.harp(c, A.PW / 2 - 52, 220, 150, "#4b6b5c", 0.9);
      let y = 480;
      for (const line of ["Is le James Harcourt an pas seo.", "This passport remains the property of James Harcourt."]) {
        for (const l of p.wrap(line, 760, 34, 500, "serif")) {
          p.text(l, A.PW / 2, y, { size: 34, weight: 500, family: "serif", color: "#3b4a44", align: "center" });
          y += 46;
        }
        y += 14;
      }
      A.rosette(c, A.PW / 2, y + 80, 60, "#4b6b5c", 0.5, 14);
      y += 250;
      p.text("Má aimsítear é / If found, please contact".toUpperCase(), A.PW / 2, y, { size: 18, weight: 500, color: BLUE, track: 2, align: "center" });
      const w = p.text(profile.email.toUpperCase(), A.PW / 2, y + 56, { size: 34, weight: 500, family: "mono", color: BLUE, track: 1, align: "center" });
      p.link(A.PW / 2 - w / 2 - 8, y + 20, w + 16, 50, { href: "mailto:" + profile.email }, profile.email);
      p.caption("Baile Átha Cliath · Dublin");
    },
  });

  return faces;
}

export const FACES = buildFaces();
if (FACES.map((f) => f.id).join() !== FACE_IDS.join()) throw new Error("Passport page order is out of sync with sections.ts");
export { LAST_SPREAD, LEAVES } from "./sections";

/** Texture cache key: shared for blank visa pages, otherwise the face itself. */
export function textureKey(face: number) {
  return FACES[face]?.shared ?? String(face);
}

/** Where the holographic OVD sits on the data page, in page UV (u, v) and cm radius. */
export const DATA_OVD = { u: 495 / A.PW, v: (A.PH - 1327) / A.PH, r: 0.75 };

/** The small ghost portrait on the data page, in page UV. */
export const DATA_GHOST = { u0: 430 / A.PW, u1: 562 / A.PW, v0: (A.PH - 1244) / A.PH, v1: (A.PH - 1140) / A.PH };

export function tintOf(face: number) {
  return FACES[face]?.pal.top ?? "#efe9dc";
}

export function isHolo(face: number) {
  return !!FACES[face]?.holo;
}

/** Paint one interior face. Returns its clickable regions. */
export function paintFace(ctx: CanvasRenderingContext2D, face: number, assets: Assets, scale: number) {
  const def = FACES[face];
  const p = new Painter(ctx, assets);
  p.verso = face % 2 === 1;
  p.x0 = p.verso ? 92 : 124;
  p.x1 = p.verso ? 900 : 932;
  p.pal = def.pal;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, A.PW, A.PH);
  def.draw(p);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return p.links;
}

/** Gold-foil mask for the front cover (white = foil). */
export function paintCover(ctx: CanvasRenderingContext2D, fonts: Fonts, w: number, h: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const s = w / 1024;
  ctx.scale(s, s);
  const H = h / s;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const serif = (size: number, weight = 500) => (ctx.font = `${weight} ${size}px ${fonts.serif}`);
  const tracked = (t: string, y: number, size: number, track: number) => {
    serif(size, 600);
    const chars = [...t];
    const widths = chars.map((c) => ctx.measureText(c).width);
    let x = 512 - (widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1)) / 2;
    ctx.textAlign = "left";
    chars.forEach((c, i) => {
      ctx.fillText(c, x, y);
      x += widths[i] + track;
    });
    ctx.textAlign = "center";
  };
  serif(78);
  ctx.fillText("An tAontas Eorpach", 512, H * 0.128);
  ctx.fillText("European Union", 512, H * 0.19);
  tracked("ÉIRE", H * 0.338, 84, 10);
  tracked("IRELAND", H * 0.4, 84, 10);
  A.harp(ctx, 512 - 116, H * 0.44, 330, "#fff");
  serif(80);
  ctx.fillText("Pas", 512, H * 0.8);
  ctx.fillText("Passport", 512, H * 0.855);
  A.chip(ctx, 512, H * 0.915, 118, "#fff");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
