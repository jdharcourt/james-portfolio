import * as THREE from "three";
import { PH, PW } from "./art";
import { blankTexture, contactShadow, deskMaterial, edgeMaterial, feltTextures, hologramMask, KEY_DIR, leatherMaterial, pageMaterial, paperNormal, roomEnvironment, type Hover } from "./materials";
import { DATA_GHOST, DATA_OVD, FACES, LAST_SPREAD, LEAVES, paintCover, paintFace, textureKey, tintOf, type Assets, type Fonts, type Hotspot } from "./pages";
import { Sheet, gutterLift, gutterRun, type SheetPose } from "./sheet";

// Scene units are centimetres. An Irish passport is 88 x 125 mm.
const COVER_W = 8.8;
const COVER_H = 12.5;
const COVER_R = 0.45;
const TC = 0.07; // cover board
const LEAF_W = 8.58;
const LEAF_H = 12.2;
const LEAF_R = 0.36;
const TP = 0.016; // paper leaf
const TD = 0.06; // polycarbonate data card
const GAP = 0.004;
const OX = -0.09; // the covers fold just outside the stitch line
const RAMP = 2.4; // paper climbs out of the gutter over this distance
const RAMP_CARD = 1.1;
const RAMP_COVER = 1.1; // the cover wraps the spine over this distance
const CACHE = 6; // page textures kept on the GPU at once
const FOV = 26;
const PI = Math.PI;

// Viewing angles, measured from looking straight down at the desk.
const POSE = {
  desk: { closed: 0.7, open: 0.76, read: 0.42, turned: 0.62, readTurned: 0.36, spinClosed: -0.24, spinOpen: 0.04, spinTurned: 0.08 },
  phone: { closed: 0.6, open: 0.56, read: 0.25, turned: 0.5, readTurned: 0.19, spinClosed: -0.16, spinOpen: 0.04, spinTurned: 0.08 },
};

export type PassportEvents = {
  onReady?: () => void;
  onSpread?: (spread: number) => void;
};

export type PassportHandle = {
  goTo: (spread: number) => void;
  next: () => void;
  prev: () => void;
  dispose: () => void;
};

type Turnable = {
  /** 0 is the front cover, 1 the data card, then the paper leaves. */
  k: number;
  sheet: Sheet;
  mesh: THREE.Mesh;
  front: THREE.Material;
  back: THREE.Material;
  thick: number;
  ramp: number;
  /** How readily the sheet curls: 1 for paper, small for card and board. */
  stiff: number;
  base: 0 | 1;
  mode: "rest" | "tween" | "spring" | "drag";
  p: number;
  v: number;
  bend: number;
  twist: number;
  from: number;
  to: number;
  t0: number;
  dur: number;
  dir: number;
  twist0: number;
  peel: number;
  peelGoal: number;
  peelZ: number;
};

type Hit = { side: "cover" | "L" | "R"; face: number; u: number; v: number; link?: Hotspot; pt: THREE.Vector3 } | null;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const damp = (a: number, b: number, rate: number, dt: number) => a + (b - a) * (1 - Math.exp(-rate * dt));

async function loadPhoto(): Promise<HTMLCanvasElement | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = "/headshot.webp";
    await img.decode();
    const w = 300;
    const h = 380;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    g.drawImage(img, (w - img.naturalWidth * scale) / 2, (h - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
    // Data-page portraits are laser-engraved in greyscale.
    const d = g.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const l = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2];
      const v = Math.min(255, Math.max(0, (l - 128) * 1.12 + 136));
      d.data[i] = v;
      d.data[i + 1] = v * 1.01;
      d.data[i + 2] = v * 1.02;
    }
    g.putImageData(d, 0, 0);
    g.globalCompositeOperation = "destination-in";
    const fade = g.createRadialGradient(w / 2, h * 0.45, h * 0.32, w / 2, h * 0.5, h * 0.62);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
    return c;
  } catch {
    return null;
  }
}

async function loadFonts(fonts: Fonts) {
  if (!document.fonts) return;
  const specs = [`400 20px ${fonts.sans}`, `500 20px ${fonts.sans}`, `600 20px ${fonts.sans}`, `500 20px ${fonts.mono}`, `500 20px ${fonts.serif}`, `600 20px ${fonts.serif}`, `400 20px ${fonts.script}`];
  await Promise.race([Promise.allSettled(specs.map((f) => document.fonts.load(f, "AÉé0"))), new Promise((r) => setTimeout(r, 4000))]);
}

const idle = () => new Promise<void>((r) => ("requestIdleCallback" in window ? window.requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 16)));

export async function createPassport(canvas: HTMLCanvasElement, fonts: Fonts, events: PassportEvents, signal: AbortSignal): Promise<PassportHandle> {
  const [photo] = await Promise.all([loadPhoto(), loadFonts(fonts)]);
  if (signal.aborted) throw new DOMException("aborted", "AbortError");
  const assets: Assets = { fonts, photo };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x120e0b, 1);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const env = roomEnvironment(renderer);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 4, 400);

  // One warm key light that throws real shadows, a little sky/desk bounce and
  // a cool window off to the left.
  const key = new THREE.SpotLight(0xffeedb, 9, 0, 0.36, 1, 0);
  const keyBase = KEY_DIR.clone().multiplyScalar(60);
  key.position.copy(keyBase);
  key.target.position.set(-5, 0, -5);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 110;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 4;
  key.shadow.intensity = 0.9;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0xe8ecf2, 0x8a6a50, 0.3));
  const windowLight = new THREE.SpotLight(0xdde8ff, 1.3, 0, 0.9, 1, 0);
  windowLight.position.set(-66, 42, -28);
  windowLight.target.position.set(0, 0, -6);
  scene.add(windowLight, windowLight.target);

  // world sways and tilts with the cursor; spin turns the passport on the desk;
  // book shifts so the part being read sits on the pivot.
  const world = new THREE.Group();
  const spin = new THREE.Group();
  const book = new THREE.Group();
  world.add(spin);
  spin.add(book);
  scene.add(world);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);
  track(env);

  // --- Desk -------------------------------------------------------------------
  const felt = feltTextures(aniso);
  felt.map.repeat.set(34, 34);
  felt.normal.repeat.set(34, 34);
  track(felt.map);
  track(felt.normal);
  const desk = deskMaterial(felt);
  track(desk.material);
  const deskGeo = track(new THREE.PlaneGeometry(200, 200));
  deskGeo.rotateX(-PI / 2);
  const deskMesh = new THREE.Mesh(deskGeo, desk.material);
  deskMesh.position.y = -0.002;
  deskMesh.receiveShadow = true;
  world.add(deskMesh);

  const shadowTex = track(contactShadow());
  const shadowMat = track(new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: shadowTex, transparent: true, opacity: 0.55, depthWrite: false }));
  const shadowGeo = track(new THREE.PlaneGeometry(1, 1));
  shadowGeo.rotateX(-PI / 2);
  const contact = new THREE.Mesh(shadowGeo, shadowMat);
  contact.position.y = 0.004;
  contact.renderOrder = 1;
  book.add(contact);

  // --- Cover ------------------------------------------------------------------
  const coverW = 1024;
  const coverH = Math.round((coverW * COVER_H) / COVER_W);
  const coverCanvas = document.createElement("canvas");
  coverCanvas.width = coverW;
  coverCanvas.height = coverH;
  const cctx = coverCanvas.getContext("2d", { willReadFrequently: true })!;
  paintCover(cctx, fonts, coverW, coverH);
  const rgba = cctx.getImageData(0, 0, coverW, coverH).data;
  const red = new Uint8Array(coverW * coverH);
  for (let i = 0; i < red.length; i++) red[i] = rgba[i * 4];
  coverCanvas.width = coverCanvas.height = 1;
  const foil = track(new THREE.DataTexture(red, coverW, coverH, THREE.RedFormat, THREE.UnsignedByteType));
  foil.generateMipmaps = true;
  foil.minFilter = THREE.LinearMipmapLinearFilter;
  foil.magFilter = THREE.LinearFilter;
  foil.anisotropy = aniso;
  foil.needsUpdate = true;

  const BURGUNDY = "#4c0f1d";
  const leatherFront = track(leatherMaterial({ color: BURGUNDY, foil, size: [COVER_W, COVER_H] }));
  const leatherBack = track(leatherMaterial({ color: BURGUNDY, foil: null, size: [COVER_W, COVER_H] }));
  const leatherEdge = track(new THREE.MeshStandardMaterial({ color: "#3a0a15", roughness: 0.66 }));
  const paperEdge = track(edgeMaterial("#ebe3d2"));
  const cardEdge = track(new THREE.MeshPhysicalMaterial({ color: "#e3e8e3", roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }));
  const blank = track(blankTexture());
  const paper = track(paperNormal(aniso));
  paper.repeat.set(5, 7);

  // The closed cover wraps the spine; it is a little longer than the back board.
  const stackAll = TD + TP * (LEAVES - 1);
  const closedRise = TC + GAP + stackAll + GAP;
  const allowance = RAMP_COVER - gutterRun(gutterLift(closedRise, RAMP_COVER), RAMP_COVER);
  const frontLen = COVER_W + allowance;

  const frontSheet = new Sheet({
    length: frontLen,
    height: COVER_H,
    radius: COVER_R,
    thickness: TC,
    ramp: RAMP_COVER,
    flex: RAMP_COVER / frontLen,
    // Outside: the foil mask covers the flat board, not the spine wrap.
    uFront: (s) => (s - allowance) / COVER_W,
    uBack: (s) => 1 - s / frontLen,
  });
  const backSheet = new Sheet({ length: COVER_W, height: COVER_H, radius: COVER_R, thickness: TC, ramp: 0.5, flex: 0.2, uFront: (s) => s / COVER_W, uBack: (s) => s / COVER_W });
  track(frontSheet);
  track(backSheet);

  const pageMat = (face: number, spine: number, laminate = false) => {
    const m = pageMaterial({
      blank,
      paper,
      spine,
      laminate: laminate ? { iridescence: track(hologramMask(DATA_OVD, DATA_GHOST, LEAF_W, LEAF_H)) } : undefined,
    });
    (m as THREE.MeshStandardMaterial).color.set(tintOf(face));
    return track(m);
  };

  const lastFace = FACES.length - 1;
  const insideFront = pageMat(1, 1);
  const insideBack = pageMat(lastFace, 0);
  const frontMesh = new THREE.Mesh(frontSheet.geometry, [leatherFront, insideFront, leatherEdge]);
  const backMesh = new THREE.Mesh(backSheet.geometry, [insideBack, leatherBack, leatherEdge]);
  for (const m of [frontMesh, backMesh]) {
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    book.add(m);
  }
  backSheet.update({ ox: OX, oy: TC / 2, base: 0, lift: 0, bend: 0, twist: 0, lo: 0, hi: 0 });

  // --- Leaves -------------------------------------------------------------------
  const make = (k: number, sheet: Sheet, front: THREE.Material, back: THREE.Material, edge: THREE.Material, thick: number, ramp: number, stiff: number): Turnable => {
    const mesh = new THREE.Mesh(sheet.geometry, [front, back, edge]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    book.add(mesh);
    return { k, sheet, mesh, front, back, thick, ramp, stiff, base: 0, mode: "rest", p: 0, v: 0, bend: 0, twist: 0, from: 0, to: 0, t0: 0, dur: 1, dir: 1, twist0: 0, peel: 0, peelGoal: 0, peelZ: 0 };
  };
  const turnables: Turnable[] = [make(0, frontSheet, leatherFront, insideFront, leatherEdge, TC, RAMP_COVER, 0.05)];
  for (let i = 1; i <= LEAVES; i++) {
    const card = i === 1;
    const sheet = track(
      new Sheet({
        length: LEAF_W,
        height: LEAF_H,
        radius: LEAF_R,
        thickness: card ? TD : TP,
        ramp: card ? RAMP_CARD : RAMP,
        // The card flexes only along its hinge strip.
        flex: card ? 0.14 : 0.2,
        uFront: (s) => s / LEAF_W,
        uBack: (s) => 1 - s / LEAF_W,
        cockle: card ? 0 : 0.012,
        seed: i * 1.7,
      }),
    );
    turnables.push(make(i, sheet, pageMat(2 * i, 0, card), pageMat(2 * i + 1, 1, card), card ? cardEdge : paperEdge, card ? TD : TP, card ? RAMP_CARD : RAMP, card ? 0.12 : 1));
  }
  const leaves = turnables.slice(1);

  // --- Page textures ------------------------------------------------------------
  const quality = small ? 768 : 1024;
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = quality;
  paintCanvas.height = Math.round((quality * PH) / PW);
  const pctx = paintCanvas.getContext("2d")!;
  const cache = new Map<string, { tex: THREE.Texture; links: Hotspot[] }>();

  function slotOf(face: number): THREE.MeshStandardMaterial | null {
    if (face === 1) return insideFront as THREE.MeshStandardMaterial;
    if (face === lastFace) return insideBack as THREE.MeshStandardMaterial;
    if (face < 2 || face > lastFace) return null;
    const t = turnables[Math.floor(face / 2)];
    if (!t) return null;
    return (face % 2 === 0 ? t.front : t.back) as THREE.MeshStandardMaterial;
  }

  function syncTextures() {
    for (let f = 1; f <= lastFace; f++) {
      const m = slotOf(f);
      if (!m) continue;
      const tex = cache.get(textureKey(f))?.tex ?? null;
      m.map = tex ?? blank;
      m.color.set(tex ? 0xffffff : tintOf(f));
    }
  }

  let spread = 0;
  let focus: "L" | "R" = "R";
  let painting = false;
  let disposed = false;
  let width = 1;
  let height = 1;
  const portrait = () => width / height < 0.85;

  const onShow = () => {
    const s = spread;
    if (s === 0) return [1, 2];
    if (portrait() && s >= 2) return focus === "L" ? [2 * s - 1, 2 * s] : [2 * s, 2 * s - 1];
    return [2 * s, 2 * s - 1];
  };
  const wantedFaces = () => {
    const s = spread;
    return [...onShow(), 2 * s + 1, 2 * s + 2, 2 * s - 2, 2 * s - 3].filter((f, k, all) => f >= 1 && f <= lastFace && all.indexOf(f) === k);
  };
  const moving = () => !!drag || turnables.some((l) => l.mode === "tween" || l.mode === "spring");

  async function pump() {
    if (painting || disposed) return;
    const show = onShow();
    const face = wantedFaces().find((f) => !cache.has(textureKey(f)));
    if (face === undefined) return;
    // Painting takes tens of milliseconds; keep it out of page turns unless the page is on show.
    if (!show.includes(face) && moving()) {
      setTimeout(pump, 150);
      return;
    }
    painting = true;
    await idle();
    if (disposed) return;
    const keyName = textureKey(face);
    const links = paintFace(pctx, face, assets, paintCanvas.width / PW);
    let tex: THREE.Texture;
    if ("createImageBitmap" in window) {
      const bmp = await createImageBitmap(paintCanvas);
      tex = new THREE.Texture(bmp);
      // Free the CPU copy as soon as it is on the GPU.
      tex.onUpdate = () => bmp.close();
    } else {
      const copy = document.createElement("canvas");
      copy.width = paintCanvas.width;
      copy.height = paintCanvas.height;
      copy.getContext("2d")!.drawImage(paintCanvas, 0, 0);
      tex = new THREE.CanvasTexture(copy);
    }
    if (disposed) {
      tex.dispose();
      return;
    }
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    cache.set(keyName, { tex, links });
    const keep = new Set(wantedFaces().map(textureKey));
    const extra = [...cache.keys()].filter((k) => !keep.has(k));
    while (cache.size > CACHE && extra.length) {
      const k = extra.shift()!;
      cache.get(k)!.tex.dispose();
      cache.delete(k);
    }
    syncTextures();
    painting = false;
    invalidate();
    pump();
  }

  // --- Book layout ----------------------------------------------------------------
  const pose: SheetPose = { ox: 0, oy: 0, base: 0, lift: 0, bend: 0, twist: 0, lo: 0, hi: 0 };
  function layout() {
    const n = LEAVES;
    // Stack heights: what lies under each leaf on either side.
    const right = new Float32Array(n + 2);
    for (let i = n; i >= 1; i--) right[i] = right[i + 1] + (1 - leaves[i - 1].p) * leaves[i - 1].thick;
    let left = 0;
    for (let i = 1; i <= n; i++) {
      const l = leaves[i - 1];
      const oy = TC + GAP + l.thick / 2;
      const hR = TC + GAP + right[i + 1] + l.thick / 2;
      const hL = TC + GAP + left + l.thick / 2;
      left += l.p * l.thick;
      const liftR = gutterLift(hR - oy, l.ramp);
      const liftL = gutterLift(hL - oy, l.ramp);
      pose.ox = 0;
      pose.oy = oy;
      pose.base = PI * l.p;
      pose.lift = (1 - l.p) * liftR - l.p * liftL;
      pose.bend = l.bend;
      pose.twist = l.twist;
      pose.lo = liftR;
      pose.hi = liftL;
      l.sheet.update(pose);
    }
    // The front board climbs the spine to sit on the right-hand stack.
    const c = turnables[0];
    const rise = TC + GAP + right[1] + GAP;
    pose.ox = OX;
    pose.oy = TC / 2;
    pose.base = PI * c.p;
    pose.lift = (1 - c.p) * gutterLift(rise, RAMP_COVER);
    pose.bend = c.bend;
    pose.twist = c.twist;
    pose.lo = 0;
    pose.hi = 0;
    frontSheet.update(pose);

    // Contact shadow follows the footprint of whatever lies on the desk.
    const xmin = THREE.MathUtils.lerp(OX, OX - frontLen, smooth(c.p));
    const xmax = OX + COVER_W;
    contact.scale.set((xmax - xmin) * 1.28, 1, COVER_H * 1.22);
    contact.position.x = (xmin + xmax) / 2;
  }

  // --- Page physics -----------------------------------------------------------------
  type Drag = { t: Turnable; dir: 1 | -1; s0: number; p0: number; zn: number; pT: number; hist: [number, number][] };
  let drag: Drag | null = null;
  let clock = 0;
  let clockRate = 1;

  function settle(l: Turnable) {
    l.p = l.to;
    l.base = l.to as 0 | 1;
    l.mode = "rest";
    l.v = 0;
    l.bend = 0;
    l.twist = 0;
    l.peel = 0;
  }

  /** Curl in flight: the free edge leads, then trails as the sheet lands. */
  function flightBend(l: Turnable, a: number) {
    const sp = Math.min(1, Math.abs(l.v) / 2.5);
    return l.dir * l.stiff * Math.sin(PI * a) * (0.35 + 0.6 * sp) * (1 - 1.55 * a);
  }

  function tween(l: Turnable, to: 0 | 1, delay: number) {
    if (l.mode === "rest" && l.base === to && l.peel < 1e-3) return;
    l.mode = "tween";
    l.from = l.p;
    l.to = to;
    l.base = to;
    l.dir = to > l.p ? 1 : -1;
    l.t0 = clock + delay;
    const full = reduced ? 0.4 : l.k === 0 ? 1.15 : portrait() ? 0.75 : 0.9;
    l.dur = full * Math.max(0.35, Math.abs(to - l.p));
    l.peel = l.peelGoal = 0;
  }

  function spring(l: Turnable, to: 0 | 1, v0: number) {
    l.mode = "spring";
    l.from = l.p;
    l.to = to;
    l.base = to;
    l.v = clamp(v0, -6, 6);
    l.dir = Math.sign(to - l.p) || l.dir;
    l.twist0 = l.twist;
    l.peel = l.peelGoal = 0;
  }

  function updateTurns(dt: number) {
    // Several pages turning at once speed up a little, as a riffle does.
    const flying = turnables.filter((l) => l.mode === "tween" && clock >= l.t0).length;
    clockRate = damp(clockRate, reduced ? 1 : 1 + 0.32 * Math.min(3, Math.max(0, flying - 1)), 7, dt);
    clock += dt * clockRate;
    let busy = false;
    if (drag) {
      const l = drag.t;
      const prev = l.p;
      l.p += (drag.pT - l.p) * Math.min(1, dt * (reduced ? 40 : 20));
      l.v += ((l.p - prev) / Math.max(dt, 1e-3) - l.v) * Math.min(1, dt * 12);
      const a = drag.dir > 0 ? l.p : 1 - l.p;
      const sp = Math.min(1, Math.abs(l.v) / 2.5);
      l.bend = drag.dir * l.stiff * Math.sin(PI * a) * (0.8 + 0.32 * sp);
      // Grabbing near a corner lets that corner lead the page over.
      l.twist = drag.dir * l.stiff * 0.42 * drag.zn * Math.sin(PI * Math.min(1, a * 1.3));
      busy = true;
    }
    for (const l of turnables) {
      if (l.mode === "drag") continue;
      if (l.mode === "spring") {
        const w = reduced ? 16 : 9.5;
        for (let k = 0; k < 2; k++) {
          const h = dt / 2;
          l.v += (w * w * (l.to - l.p) - 2 * w * l.v) * h;
          l.p += l.v * h;
        }
        if (l.p < 0 || l.p > 1) {
          l.p = clamp(l.p);
          l.v = 0;
        }
        const a = l.dir > 0 ? l.p : 1 - l.p;
        l.bend += (flightBend(l, a) - l.bend) * Math.min(1, dt * 10);
        l.twist = l.twist0 * clamp(Math.abs(l.to - l.p) / Math.max(0.001, Math.abs(l.to - l.from)));
        if (Math.abs(l.to - l.p) < 0.0015 && Math.abs(l.v) < 0.03) settle(l);
        busy = true;
      } else if (l.mode === "tween") {
        busy = true;
        if (clock < l.t0) continue;
        const r = clamp((clock - l.t0) / l.dur);
        const np = l.from + (l.to - l.from) * ease(r);
        l.v = (np - l.p) / Math.max(dt, 1e-3);
        l.p = np;
        const a = l.dir > 0 ? l.p : 1 - l.p;
        l.bend += (flightBend(l, a) - l.bend) * Math.min(1, dt * 10);
        l.twist = 0;
        if (r >= 1) settle(l);
      } else {
        // At rest, a page lifts its corner towards a nearby cursor.
        const before = l.peel;
        l.peel = damp(l.peel, l.peelGoal, 9, dt);
        if (Math.abs(l.peel - l.peelGoal) < 1e-4) l.peel = l.peelGoal;
        if (l.peel !== before) busy = true;
        const sgn = l.base === 0 ? 1 : -1;
        l.p = l.base + sgn * (l.k === 0 ? 0.03 : 0.045) * l.peel;
        l.bend = sgn * Math.max(l.stiff, 0.1) * 0.3 * l.peel;
        l.twist = sgn * l.stiff * 0.28 * l.peel * l.peelZ;
        l.v = 0;
      }
    }
    return busy;
  }

  function goTo(target: number) {
    const s = clamp(Math.round(target), 0, LAST_SPREAD);
    if (s === spread || drag) return;
    const fwd = s > spread;
    const ids = fwd ? [...Array(s - spread)].map((_, k) => spread + k) : [...Array(spread - s)].map((_, k) => spread - 1 - k);
    const step = reduced ? 0.08 : 0.16;
    ids.forEach((i, k) => tween(turnables[i], fwd ? 1 : 0, k * step));
    spread = s;
    focus = fwd ? "L" : "R";
    events.onSpread?.(spread);
    invalidate();
    pump();
  }

  function next() {
    if (portrait() && spread >= 2 && focus === "L") {
      focus = "R";
      events.onSpread?.(spread);
      invalidate();
      pump();
    } else if (spread < LAST_SPREAD) goTo(spread + 1);
  }

  function prev() {
    if (portrait() && spread >= 2 && focus === "R") {
      focus = "L";
      events.onSpread?.(spread);
      invalidate();
      pump();
    } else if (spread > 0) goTo(spread - 1);
  }

  // --- Camera and pose ----------------------------------------------------------------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, on: false };
  const orient = { on: false, asked: false, x: 0, y: 0, sx: 0, sy: 0, t: 0, base: null as null | { x: number; y: number } };
  let resting = 1;
  const view = { dist: 60, tilt: 0.7, cx: 0, cz: 0 };

  /** -PI/2 while the data page is up, so it reads the right way round. */
  function turnAngle() {
    const q = turnables[0].p + turnables[1].p;
    if (q <= 1) return (-PI / 2) * smooth(q);
    if (q <= 2) return (-PI / 2) * (1 - smooth(q - 1));
    return 0;
  }

  function frame0() {
    const P = portrait() ? POSE.phone : POSE.desk;
    const t = turnAngle();
    const n = Math.abs(t) / (PI / 2);
    const r = Math.min(1, turnables[0].p * 1.5);
    const tilt = (P.closed + (P.open - P.closed) * r) * (1 - n) + P.turned * n;
    const spinA = (P.spinClosed + (P.spinOpen - P.spinClosed) * r) * (1 - n) + P.spinTurned * n;
    const read = n > 0.5 ? P.readTurned : P.read;
    // What needs to fit on screen, in book coordinates.
    const closedC = OX + COVER_W / 2;
    let cx = THREE.MathUtils.lerp(closedC, 0, smooth(r));
    let w = THREE.MathUtils.lerp(COVER_W, 2 * COVER_W, smooth(r)) + 0.8;
    let h = COVER_H + 0.8;
    if (portrait() && spread >= 2) {
      cx = focus === "L" ? -LEAF_W / 2 : LEAF_W / 2;
      w = LEAF_W + 0.5;
      h = LEAF_H + 0.7;
    }
    // While the data page is up, frame it on its own.
    cx = THREE.MathUtils.lerp(cx, LEAF_W / 2, n);
    w = THREE.MathUtils.lerp(w, LEAF_W + 1.2, n);
    h = THREE.MathUtils.lerp(h, LEAF_H + 1.2, n);
    return { t, spin: t + spinA, tilt, read, r, cx, w, h };
  }

  function fitDistance(spinAngle: number, tilt: number, w: number, h: number) {
    const c = Math.abs(Math.cos(spinAngle));
    const s = Math.abs(Math.sin(spinAngle));
    const sw = w * c + h * s;
    const sh = (w * s + h * c) * Math.cos(tilt);
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // The near edge sits closer to the lens, so allow for perspective growth.
    return Math.max(sh / (2 * t), sw / (2 * t * camera.aspect)) * (1 + 0.32 * Math.sin(tilt));
  }

  // --- Picking --------------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const localRay = new THREE.Ray();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const inv = new THREE.Matrix4();

  function localPoint(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    inv.copy(book.matrixWorld).invert();
    localRay.copy(ray.ray).applyMatrix4(inv);
    plane.constant = -(spread === 0 ? 2 * TC + 2 * GAP + stackAll : TC + GAP + stackAll / 2);
    const out = new THREE.Vector3();
    return localRay.intersectPlane(plane, out) ? out : null;
  }

  function pick(cx: number, cy: number): Hit {
    const pt = localPoint(cx, cy);
    if (!pt) return null;
    if (spread === 0) {
      return pt.x > OX && pt.x < OX + COVER_W && Math.abs(pt.z) < COVER_H / 2 ? { side: "cover", face: 0, u: (pt.x - OX) / COVER_W, v: (pt.z + COVER_H / 2) / COVER_H, pt } : null;
    }
    if (Math.abs(pt.z) > LEAF_H / 2 || Math.abs(pt.x) > LEAF_W) return null;
    const side = pt.x >= 0 ? "R" : "L";
    const face = side === "R" ? 2 * spread : 2 * spread - 1;
    const u = side === "R" ? pt.x / LEAF_W : 1 + pt.x / LEAF_W;
    const v = (pt.z + LEAF_H / 2) / LEAF_H;
    const link = cache.get(textureKey(face))?.links.find((h) => u >= h.u0 && u <= h.u1 && v >= h.v0 && v <= h.v1);
    return { side, face, u, v, link, pt };
  }

  function follow(link: Hotspot) {
    const t = link.target;
    if ("spread" in t) goTo(t.spread);
    else if (t.href.startsWith("mailto:") || t.href.startsWith("/")) window.location.href = t.href;
    else window.open(t.href, "_blank", "noopener,noreferrer");
  }

  let hovered: THREE.Material | null = null;
  function hover(hit: Hit) {
    for (const l of turnables) l.peelGoal = 0;
    if (!reduced && hit && !hit.link) {
      if (hit.side === "cover") {
        turnables[0].peelGoal = 0.35 + 0.65 * smooth(clamp((hit.u - 0.55) / 0.4));
      } else if (hit.side === "R" && spread < LAST_SPREAD) {
        const l = turnables[spread];
        if (l.mode === "rest") {
          l.peelGoal = smooth(clamp((hit.u - 0.62) / 0.36));
          l.peelZ = 2 * hit.v - 1;
        }
      } else if (hit.side === "L" && spread > 0) {
        const l = turnables[spread - 1];
        if (l.mode === "rest") {
          l.peelGoal = smooth(clamp((0.38 - hit.u) / 0.36));
          l.peelZ = 2 * hit.v - 1;
        }
      }
    }
    const link = hit?.link;
    const mat = link ? slotOf(hit!.face) : null;
    if (hovered && hovered !== mat) (hovered.userData.hover as Hover).on.value = 0;
    if (mat && link) {
      const h = mat.userData.hover as Hover;
      h.rect.value.set(link.u0, link.v0, link.u1, link.v1);
      h.on.value = 1;
    }
    hovered = mat;
    canvas.style.cursor = link || hit?.side === "cover" ? "pointer" : hit && !portrait() ? "grab" : "default";
    invalidate();
  }

  // --- Pointer input ------------------------------------------------------------------
  let down: null | { id: number; x: number; y: number; hit: Hit; lp: THREE.Vector3 | null; touch: boolean; moved: boolean } = null;

  function startDrag(l: Turnable, dir: 1 | -1, lp: THREE.Vector3) {
    if (l.mode !== "rest" || reduced) return false;
    const s0 = Math.max(0.5, dir * lp.x);
    l.mode = "drag";
    l.dir = dir;
    l.peel = l.peelGoal = 0;
    drag = { t: l, dir, s0, p0: l.p, zn: clamp(lp.z / (LEAF_H / 2), -1, 1), pT: l.p, hist: [[performance.now(), l.p]] };
    canvas.style.cursor = "grabbing";
    return true;
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0 || down) return;
    const hit = pick(e.clientX, e.clientY);
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, hit, lp: hit?.pt ?? localPoint(e.clientX, e.clientY), touch: e.pointerType !== "mouse", moved: false };
    canvas.setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent) {
    if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.on = true;
      invalidate();
      if (!down) {
        hover(pick(e.clientX, e.clientY));
        return;
      }
    }
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > (down.touch ? 10 : 6)) {
      down.moved = true;
      const lp = down.lp;
      const horizontal = Math.abs(dx) > Math.abs(dy) * 0.8;
      if (lp && (!down.touch || horizontal)) {
        if (spread === 0) {
          if (down.hit?.side === "cover" || down.touch) startDrag(turnables[0], 1, lp);
        } else if (portrait()) {
          // One page on screen: swiping it turns it.
          const fwd = dx < 0;
          if (fwd && (focus === "R" || spread === 1) && spread < LAST_SPREAD) startDrag(turnables[spread], 1, new THREE.Vector3(Math.max(lp.x, LEAF_W * 0.7), 0, lp.z));
          else if (!fwd && focus === "L" && spread > 1) startDrag(turnables[spread - 1], -1, new THREE.Vector3(Math.min(lp.x, -LEAF_W * 0.7), 0, lp.z));
        } else {
          const side = down.hit?.side ?? (lp.x >= 0 ? "R" : "L");
          if (side === "R" && spread < LAST_SPREAD) startDrag(turnables[spread], 1, lp);
          else if (side === "L" && spread > 0) startDrag(turnables[spread - 1], -1, lp);
        }
      }
    }
    if (drag) {
      const pt = localPoint(e.clientX, e.clientY);
      if (!pt) return;
      const { dir, s0 } = drag;
      // The grab point rides a circle about the spine, as paper does.
      const l = Math.max(s0, LEAF_W * 0.6);
      const u = Math.acos(clamp((dir * pt.x - s0 + l) / l, -1, 1)) / PI;
      drag.pT = clamp(dir > 0 ? drag.p0 + u : drag.p0 - u);
      drag.hist.push([performance.now(), drag.pT]);
      if (drag.hist.length > 6) drag.hist.shift();
      invalidate();
    }
  }

  function onUp(e: PointerEvent) {
    if (!down || e.pointerId !== down.id) return;
    const d = down;
    down = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (d.touch) enableOrientation(true);
    if (drag) {
      const { t: l, dir, hist } = drag;
      drag = null;
      let vel = 0;
      if (hist.length > 1) {
        const [t0, p0] = hist[0];
        const [t1, p1] = hist[hist.length - 1];
        vel = ((p1 - p0) / Math.max(1, t1 - t0)) * 1000;
      }
      const a = dir > 0 ? l.p : 1 - l.p;
      const along = dir * vel;
      // A flick turns the page even from a short drag; a flick back cancels it.
      const commit = (a > 0.32 && along > -0.6) || along > 1.1;
      const forwardSide = dir > 0 ? commit : !commit;
      spring(l, forwardSide ? 1 : 0, vel);
      if (commit) {
        spread = dir > 0 ? l.k + 1 : l.k;
        focus = dir > 0 ? "L" : "R";
        events.onSpread?.(spread);
        pump();
      }
      if (!d.touch) hover(pick(e.clientX, e.clientY));
      invalidate();
      return;
    }
    if (d.moved) {
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(e.clientY - d.y)) (dx < 0 ? next : prev)();
      return;
    }
    const hit = pick(e.clientX, e.clientY);
    if (hit?.link) follow(hit.link);
    else if (spread === 0) {
      if (hit || d.touch) next();
    } else if (portrait()) (e.clientX > width / 2 ? next : prev)();
    else if (hit?.side === "R") next();
    else if (hit?.side === "L") prev();
  }

  function onLeave() {
    pointer.on = false;
    if (down) return;
    hover(null);
  }

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const map: Record<string, () => void> = {
      ArrowRight: next,
      ArrowDown: next,
      PageDown: next,
      ArrowLeft: prev,
      ArrowUp: prev,
      PageUp: prev,
      Home: () => goTo(0),
      End: () => goTo(LAST_SPREAD),
      Escape: () => goTo(0),
    };
    const fn = map[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  }

  // Phones tilt the passport with the device instead of a cursor.
  function onOrient(e: DeviceOrientationEvent) {
    if (e.beta == null || e.gamma == null) return;
    const angle = screen.orientation?.angle ?? 0;
    let x = e.gamma;
    let y = e.beta;
    if (angle === 90) [x, y] = [e.beta, -e.gamma];
    else if (angle === 270 || angle === -90) [x, y] = [-e.beta, e.gamma];
    else if (angle === 180) [x, y] = [-e.gamma, -e.beta];
    const now = performance.now();
    const dt = Math.min(0.2, (now - (orient.t || now)) / 1000);
    orient.t = now;
    orient.base ??= { x, y };
    // The resting angle drifts back to neutral so holding the phone still is level.
    const k = 1 - Math.exp(-dt / 3.5);
    orient.base.x += (x - orient.base.x) * k;
    orient.base.y += (y - orient.base.y) * k;
    orient.x = clamp((x - orient.base.x) / 22, -1, 1);
    orient.y = clamp(-(y - orient.base.y) / 22, -1, 1);
    invalidate();
  }

  function enableOrientation(fromGesture: boolean) {
    if (orient.on || orient.asked || reduced || !coarse || !("DeviceOrientationEvent" in window)) return;
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    const start = () => {
      orient.on = true;
      window.addEventListener("deviceorientation", onOrient);
    };
    if (typeof D.requestPermission === "function") {
      // iOS only allows the prompt from a tap.
      if (!fromGesture) return;
      orient.asked = true;
      D.requestPermission()
        .then((r) => r === "granted" && start())
        .catch(() => {});
    } else {
      orient.asked = true;
      start();
    }
  }

  // --- Frame loop ---------------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let lastActive = performance.now();
  let skip = false;
  // Adaptive resolution: if frames keep running long, render fewer pixels.
  let renderScale = 1;
  let frames = 0;
  let slowFrames = 0;
  let warmup = 40;

  function invalidate() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  function update(now: number, dt: number) {
    let busy = updateTurns(dt);
    layout();

    pointer.sx = damp(pointer.sx, pointer.on ? pointer.x : 0, 3, dt);
    pointer.sy = damp(pointer.sy, pointer.on ? pointer.y : 0, 3, dt);
    orient.sx = damp(orient.sx, orient.x, 6, dt);
    orient.sy = damp(orient.sy, orient.y, 6, dt);

    // Once nothing is in flight, lean back to a reading angle; tip forward again on a turn.
    const inFlight = !!drag || turnables.some((l) => l.mode !== "rest" || (l.p > 0.06 && l.p < 0.94));
    const restGoal = inFlight ? 0 : 1;
    resting = reduced ? restGoal : resting + (restGoal - resting) * Math.min(1, dt * (restGoal > resting ? 1 : 3.4));

    const f = frame0();
    const readAmt = smooth(resting) * f.r;
    const tiltGoal = f.tilt + (f.read - f.tilt) * readAmt;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3);
    view.tilt += (tiltGoal - view.tilt) * k;
    view.cx += (f.cx - view.cx) * (reduced ? 1 : 1 - Math.exp(-dt * 3.4));
    const distGoal = fitDistance(f.spin, view.tilt, f.w, f.h);
    view.dist += (distGoal - view.dist) * k;
    if (Math.abs(tiltGoal - view.tilt) + Math.abs(f.cx - view.cx) > 1e-4 || Math.abs(distGoal - view.dist) > 1e-3) busy = true;

    const t = now / 1000;
    const sway = reduced ? 0 : 1;
    const px = pointer.sx * 0.07 + orient.sx * 0.12;
    const py = pointer.sy * 0.05 + orient.sy * 0.1;
    // A slow breathing sway, plus a lean towards the cursor or the phone's tilt.
    world.rotation.x = sway * (0.016 * Math.sin(t * 0.53) + 0.008 * Math.sin(t * 1.31 + 2) - py);
    world.rotation.z = sway * (-0.02 * Math.sin(t * 0.41 + 1) - 0.007 * Math.sin(t * 1.07) - px);
    world.position.y = sway * 0.05 * Math.sin(t * 0.7);
    spin.rotation.y = f.spin + 0.035 + sway * 0.006 * Math.sin(t * 0.37 + 4);
    book.position.x = -view.cx;

    camera.position.set(0, view.dist * Math.cos(view.tilt), view.dist * Math.sin(view.tilt));
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    // The key light follows the cursor a little, so glare slides over foil and laminate.
    key.position.set(keyBase.x + (pointer.sx * 9 + orient.sx * 12), keyBase.y, keyBase.z - (pointer.sy * 7 + orient.sy * 9));
    return busy;
  }

  function frame(t: number) {
    raf = 0;
    if (disposed) return;
    const dt = last ? Math.min((t - last) / 1000, 0.1) : 1 / 60;
    last = t;
    const busy = update(t, dt);
    if (busy) lastActive = t;
    // When nothing is happening the sway is slow, so half the frame rate is enough.
    skip = t - lastActive > 2500 ? !skip : false;
    if (!skip) renderer.render(scene, camera);
    if (warmup > 0) warmup--;
    else if (!skip && !painting && dt < 0.5) {
      frames++;
      if (dt > 0.034) slowFrames++;
      if (frames >= 45) {
        if (slowFrames > 30 && renderScale > 0.55) {
          renderScale *= 0.8;
          resize();
        }
        frames = slowFrames = 0;
      }
    }
    if (!reduced || busy) invalidate();
    else last = 0;
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    // Keep the multisampled drawing buffer near 2.2 MP however dense the screen is.
    const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.2e6 / (width * height))) * renderScale);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  }

  function onLost(e: Event) {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function onRestored() {
    for (const entry of cache.values()) entry.tex.dispose();
    cache.clear();
    syncTextures();
    pump();
    invalidate();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", resize);

  resize();
  layout();
  {
    const f = frame0();
    view.tilt = f.tilt;
    view.cx = f.cx;
    view.dist = fitDistance(f.spin, f.tilt, f.w, f.h);
  }
  enableOrientation(false);
  update(performance.now(), 1 / 60);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  events.onReady?.();
  invalidate();
  pump();

  return {
    goTo: (s) => goTo(s),
    next,
    prev,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", resize);
      window.removeEventListener("deviceorientation", onOrient);
      for (const { tex } of cache.values()) tex.dispose();
      cache.clear();
      disposables.forEach((d) => d.dispose());
      key.shadow.dispose();
      renderer.dispose();
    },
  };
}
