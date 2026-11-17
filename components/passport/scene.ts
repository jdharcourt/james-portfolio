import * as THREE from "three";
import { PH, PW, feltTile } from "./art";
import { DATA_OVD, FACES, LAST_SPREAD, LEAVES, isHolo, paintCover, paintFace, textureKey, tintOf, type Assets, type Fonts, type Hotspot } from "./pages";
import * as S from "./shaders";

// Scene units are centimetres. Pages are 88 x 125 mm, like a real passport.
const W = 8.8;
const H = 12.5;
const TC = 0.055; // cover board
const TP = 0.011; // one paper leaf
const GAP = 0.006;
const CX0 = -0.05;
const CW = W + 0.2;
const CH = H + 0.3;
const PAGE_RADIUS = 0.42;
const COVER_RADIUS = 0.5;
const HOVER = 0.7; // the passport floats this far above the desk
const CACHE = 6; // page textures kept on the GPU at once
const FOV = 24;
const BEND = 1.1; // how far paper curls while it turns
const EPS = 0.002;
const PI = Math.PI;

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

type Leaf = {
  i: number;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  /** 0 for a rigid board, small for the polycarbonate data card, 1 for paper. */
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

function roundedRect(s: THREE.Shape, x: number, y: number, w: number, h: number, r: number) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
}

/** A page as a grid whose outer corners follow the rounded die-cut, so edges stay smooth. */
function leafGeometry() {
  const r = PAGE_RADIUS;
  const cols: number[] = [];
  const main = 60;
  for (let i = 0; i <= main; i++) cols.push((W - r) * Math.pow(i / main, 1.12));
  const corner = 14;
  for (let i = 1; i <= corner; i++) cols.push(W - r + r * Math.sin((i / corner) * (PI / 2)));
  const rows = 18;
  const pos: number[] = [];
  const idx: number[] = [];
  for (const s of cols) {
    const zmax = s <= W - r ? H / 2 : H / 2 - r + Math.sqrt(Math.max(0, r * r - (s - (W - r)) ** 2));
    for (let j = 0; j <= rows; j++) pos.push(s, 0, -zmax + (2 * zmax * j) / rows);
  }
  for (let i = 0; i < cols.length - 1; i++)
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = a + 1;
      const c = a + rows + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function blockGeometry() {
  const s = new THREE.Shape();
  const r = PAGE_RADIUS;
  s.moveTo(0, -H / 2);
  s.lineTo(W - r, -H / 2);
  s.quadraticCurveTo(W, -H / 2, W, -H / 2 + r);
  s.lineTo(W, H / 2 - r);
  s.quadraticCurveTo(W, H / 2, W - r, H / 2);
  s.lineTo(0, H / 2);
  s.lineTo(0, -H / 2);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 20 });
}

function coverGeometry() {
  const s = new THREE.Shape();
  roundedRect(s, CX0, -CH / 2, CW, CH, COVER_RADIUS);
  const b = 0.018;
  const g = new THREE.ExtrudeGeometry(s, { depth: TC - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 24 });
  g.rotateX(-PI / 2);
  g.translate(0, b, 0);
  return g;
}

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
  const specs = [
    `400 20px ${fonts.sans}`,
    `500 20px ${fonts.sans}`,
    `600 20px ${fonts.sans}`,
    `500 20px ${fonts.mono}`,
    `500 20px ${fonts.serif}`,
    `600 20px ${fonts.serif}`,
    `400 20px ${fonts.script}`,
  ];
  await Promise.race([Promise.allSettled(specs.map((f) => document.fonts.load(f, "AÉé0"))), new Promise((r) => setTimeout(r, 4000))]);
}

const idle = () =>
  new Promise<void>((r) => ("requestIdleCallback" in window ? window.requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 16)));

export async function createPassport(canvas: HTMLCanvasElement, fonts: Fonts, events: PassportEvents, signal: AbortSignal): Promise<PassportHandle> {
  const [photo] = await Promise.all([loadPhoto(), loadFonts(fonts)]);
  if (signal.aborted) throw new DOMException("aborted", "AbortError");
  const assets: Assets = { fonts, photo };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x16120e, 1);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 4, 400);
  // pose floats the passport and tilts it in screen space, spin turns it on
  // the desk, and book shifts it so the part being read sits on the pivot.
  const pose = new THREE.Group();
  const spin = new THREE.Group();
  const book = new THREE.Group();
  pose.add(spin);
  spin.add(book);
  scene.add(pose);

  const shared = {
    uLightDir: { value: new THREE.Vector3(-0.45, 0.85, 0.42).normalize() },
    uLightCol: { value: new THREE.Color(1.0, 0.95, 0.88) },
    uArch: { value: 0 },
    uW: { value: W },
    uH: { value: H },
    uTurn: { value: new THREE.Vector4() },
    uHover: { value: new THREE.Vector4(-1, -1, -1, -1) },
    uHoverFace: { value: -1 },
    uOvd: { value: new THREE.Vector3(DATA_OVD.u, DATA_OVD.v, DATA_OVD.r) },
  };
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);

  // --- Cover foil mask (single channel keeps it to ~2 MB on the GPU) -------
  const coverW = 1024;
  const coverH = Math.round((coverW * CH) / CW);
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
  foil.anisotropy = maxAniso;
  foil.needsUpdate = true;

  const coverMat = (foilOn: boolean) =>
    track(
      new THREE.ShaderMaterial({
        vertexShader: S.COVER_VS,
        fragmentShader: S.COVER_FS,
        uniforms: {
          uLightDir: shared.uLightDir,
          uLightCol: shared.uLightCol,
          uFoil: { value: foil },
          uFoilOn: { value: foilOn ? 1 : 0 },
          uRect: { value: new THREE.Vector4(CX0, -CH / 2, CW, CH) },
          uTexel: { value: new THREE.Vector2(1 / coverW, 1 / coverH) },
        },
      }),
    );

  const coverGeo = track(coverGeometry());
  const coverPivot = new THREE.Group();
  coverPivot.add(new THREE.Mesh(coverGeo, coverMat(true)));
  book.add(coverPivot);
  const backCover = new THREE.Mesh(coverGeo, coverMat(false));
  book.add(backCover);

  const spineGeo = track(new THREE.CylinderGeometry(1, 1, CH - 2 * COVER_RADIUS * 0.4, 32, 1, true, PI, PI));
  spineGeo.rotateX(PI / 2);
  const spine = new THREE.Mesh(spineGeo, coverMat(false));
  book.add(spine);

  // --- Leaves -------------------------------------------------------------
  const leafGeo = track(leafGeometry());
  const leafMat = (front: number, back: number, rest: number, lift: number) =>
    track(
      new THREE.ShaderMaterial({
        vertexShader: S.LEAF_VS,
        fragmentShader: S.PAGE_FS,
        side: THREE.DoubleSide,
        uniforms: {
          ...shared,
          uP: { value: 0 },
          uBend: { value: 0 },
          uTwist: { value: 0 },
          uHinge: { value: 0 },
          uLift: { value: lift },
          uRest: { value: rest },
          uSelf: { value: 0 },
          uFront: { value: null },
          uBack: { value: null },
          uHasFront: { value: 0 },
          uHasBack: { value: 0 },
          uTintFront: { value: new THREE.Color(tintOf(front)) },
          uTintBack: { value: new THREE.Color(tintOf(back)) },
          uHoloFront: { value: isHolo(front) ? 1 : 0 },
          uHoloBack: { value: isHolo(back) ? 1 : 0 },
          uFaceFront: { value: front },
          uFaceBack: { value: back },
        },
      }),
    );

  const leaves: Leaf[] = [];
  for (let i = 0; i <= LEAVES; i++) {
    // Leaf 0 is the paper glued inside the front cover; it turns with the board.
    const mat = i === 0 ? leafMat(-1, 1, 0, -0.004) : leafMat(2 * i, 2 * i + 1, 1, 0);
    const mesh = new THREE.Mesh(leafGeo, mat);
    mesh.frustumCulled = false;
    book.add(mesh);
    leaves.push({
      i,
      mesh,
      mat,
      stiff: i === 0 ? 0 : i === 1 ? 0.12 : 1,
      base: 0,
      mode: "rest",
      p: 0,
      v: 0,
      bend: 0,
      twist: 0,
      from: 0,
      to: 0,
      t0: 0,
      dur: 1,
      dir: 1,
      twist0: 0,
      peel: 0,
      peelGoal: 0,
      peelZ: 0,
    });
  }
  const lastFace = FACES.length - 1;
  const backPaper = leafMat(lastFace, -1, 0, 0);
  const backMesh = new THREE.Mesh(leafGeo, backPaper);
  backMesh.frustumCulled = false;
  backPaper.uniforms.uHinge.value = TC + 0.004;
  book.add(backMesh);

  const blockGeo = track(blockGeometry());
  const blockMat = (side: number) =>
    track(
      new THREE.ShaderMaterial({
        vertexShader: S.BLOCK_VS,
        fragmentShader: S.BLOCK_FS,
        side: THREE.DoubleSide,
        uniforms: { ...shared, uSide: { value: side }, uY0: { value: TC }, uY1: { value: TC + 0.1 }, uLeaf: { value: TP } },
      }),
    );
  const rightBlock = new THREE.Mesh(blockGeo, blockMat(1));
  const leftBlock = new THREE.Mesh(blockGeo, blockMat(-1));
  rightBlock.frustumCulled = leftBlock.frustumCulled = false;
  book.add(rightBlock, leftBlock);

  // --- Desk ---------------------------------------------------------------
  const felt = track(new THREE.DataTexture(feltTile(512), 512, 512, THREE.RedFormat, THREE.UnsignedByteType));
  felt.wrapS = felt.wrapT = THREE.RepeatWrapping;
  felt.generateMipmaps = true;
  felt.minFilter = THREE.LinearMipmapLinearFilter;
  felt.magFilter = THREE.LinearFilter;
  felt.anisotropy = maxAniso;
  felt.needsUpdate = true;
  const deskMat = track(
    new THREE.ShaderMaterial({
      vertexShader: S.DESK_VS,
      fragmentShader: S.DESK_FS,
      uniforms: {
        uLightDir: shared.uLightDir,
        uLightCol: shared.uLightCol,
        uFelt: { value: felt },
        uBookInv: { value: new THREE.Matrix4() },
        uFoot: { value: new THREE.Vector4() },
        uHover: { value: HOVER },
      },
    }),
  );
  const deskGeo = track(new THREE.PlaneGeometry(160, 160));
  deskGeo.rotateX(-PI / 2);
  scene.add(new THREE.Mesh(deskGeo, deskMat));

  // --- Page textures ------------------------------------------------------
  const quality = Math.min(window.innerWidth, window.innerHeight) < 600 ? 768 : 1024;
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = quality;
  paintCanvas.height = Math.round((quality * PH) / PW);
  const pctx = paintCanvas.getContext("2d")!;
  const cache = new Map<string, { tex: THREE.Texture; links: Hotspot[] }>();

  function slotOf(face: number): [THREE.ShaderMaterial, "Front" | "Back"] | null {
    if (face === 1) return [leaves[0].mat, "Back"];
    if (face === lastFace) return [backPaper, "Front"];
    if (face < 2 || face > lastFace) return null;
    const leaf = leaves[Math.floor(face / 2)];
    return leaf ? [leaf.mat, face % 2 === 0 ? "Front" : "Back"] : null;
  }

  function syncTextures() {
    for (let f = 1; f <= lastFace; f++) {
      const slot = slotOf(f);
      if (!slot) continue;
      const tex = cache.get(textureKey(f))?.tex ?? null;
      const [mat, side] = slot;
      mat.uniforms[`u${side}`].value = tex;
      mat.uniforms[`uHas${side}`].value = tex ? 1 : 0;
    }
  }

  let spread = 0;
  let focus: "L" | "R" = "R";
  let painting = false;
  let disposed = false;

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
  const moving = () => !!drag || leaves.some((l) => l.mode === "tween" || l.mode === "spring");

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
    const key = textureKey(face);
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
    tex.anisotropy = maxAniso;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    cache.set(key, { tex, links });
    // Evict the pages furthest from where the reader is.
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

  // --- Pose, camera and input state ---------------------------------------
  let width = 1;
  let height = 1;
  const portrait = () => width / height < 0.85;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, on: false };
  const orient = { on: false, asked: false, x: 0, y: 0, sx: 0, sy: 0, t: 0, base: null as null | { x: number; y: number } };
  let openness = 0;
  let readAmt = 1;
  let lastTurn = -1e9;
  const lightGoal = shared.uLightDir.value.clone();
  const view = { spin: 0, fx: 0, dist: 60, theta: 0.6 };

  type Goal = { spin: number; fx: number; w: number; h: number; read: number; turn: number };
  function poseGoal(): Goal {
    const phone = portrait();
    if (spread === 0) return { spin: phone ? -0.14 : -0.24, fx: CX0 + CW / 2, w: CW + 0.6, h: CH + 0.6, read: phone ? 0.48 : 0.6, turn: phone ? 0.48 : 0.6 };
    if (spread === 1) return { spin: -PI / 2 + 0.06, fx: W / 2, w: W + 1.8, h: H + 1.4, read: phone ? 0.28 : 0.32, turn: phone ? 0.42 : 0.52 };
    if (phone) return { spin: 0.02, fx: focus === "L" ? -W / 2 : W / 2, w: W + 0.5, h: H + 0.8, read: 0.28, turn: 0.44 };
    return { spin: 0.035, fx: 0, w: 2 * W + 1, h: H + 1, read: 0.36, turn: 0.62 };
  }

  function fitDistance(g: Goal) {
    const c = Math.abs(Math.cos(g.spin));
    const s = Math.abs(Math.sin(g.spin));
    const sw = g.w * c + g.h * s;
    const sh = (g.w * s + g.h * c) * Math.cos(g.read);
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // The near edge is closer to the lens, so allow for perspective growth.
    return Math.max(sh / (2 * t), sw / (2 * t * camera.aspect)) * (1 + 0.3 * Math.sin(g.read));
  }

  function snapView() {
    const g = poseGoal();
    view.spin = g.spin;
    view.fx = g.fx;
    view.theta = g.read + (reduced ? 0 : 0.12);
    view.dist = fitDistance(g) * (reduced ? 1 : 1.18);
  }

  // --- Layout --------------------------------------------------------------
  function layout() {
    const n = LEAVES;
    let rightAll = 0;
    for (let j = 1; j <= n; j++) rightAll += 1 - leaves[j].p;
    const p0 = leaves[0].p;
    // Front cover board and its endpaper.
    const inner = TC + GAP + TP * rightAll + 0.004;
    const hinge0 = THREE.MathUtils.lerp(inner, TC, p0);
    coverPivot.position.y = hinge0;
    coverPivot.rotation.z = PI * p0;
    const m0 = leaves[0].mat.uniforms;
    m0.uP.value = p0;
    m0.uHinge.value = hinge0;
    // Paper leaves stack on whichever side they rest.
    let below = rightAll;
    let left = 0;
    let topR = -1;
    let topL = -1;
    let restR = 0;
    let restL = 0;
    for (let i = 1; i <= n; i++) {
      const l = leaves[i];
      below -= 1 - l.p;
      const r = TC + GAP + TP * below;
      const lh = TC + GAP + TP * left;
      left += l.p;
      const u = l.mat.uniforms;
      u.uP.value = l.p;
      u.uHinge.value = THREE.MathUtils.lerp(r, lh, l.p);
      u.uBend.value = l.bend;
      u.uTwist.value = l.twist;
      if (l.p <= EPS) {
        restR++;
        if (topR < 0) topR = i;
      }
      if (l.p >= 1 - EPS) {
        restL++;
        topL = i;
      }
    }
    // Only the top resting leaf on each side and any moving leaf are drawn; the
    // page blocks stand in for the rest, so 16 leaves cost about as much as 2.
    for (let i = 1; i <= n; i++) {
      const l = leaves[i];
      l.mesh.visible = (l.p > EPS && l.p < 1 - EPS) || i === topR || i === topL;
    }
    const rb = rightBlock.material as THREE.ShaderMaterial;
    rb.uniforms.uY1.value = TC + GAP + TP * (restR - 1) - 0.003;
    rightBlock.visible = restR > 1;
    const lb = leftBlock.material as THREE.ShaderMaterial;
    lb.uniforms.uY1.value = TC + GAP + TP * (restL - 1) - 0.003;
    leftBlock.visible = restL > 1;

    const top = hinge0 + TC;
    const closed = 1 - p0;
    spine.visible = closed > 0.02;
    spine.scale.set((top / 2) * Math.max(closed, 0.001), top / 2, 1);
    spine.position.set(0, top / 2, 0);

    shared.uArch.value = 0.07 * smooth(openness);

    // Shadow from the page that is currently lifted highest.
    let best = -1;
    let lift = 0;
    leaves.forEach((l, i) => {
      const s = Math.sin(PI * l.p);
      if (s > lift + 1e-3) {
        lift = s;
        best = i;
      }
      l.mat.uniforms.uSelf.value = 0;
    });
    if (best >= 0 && lift > 0.01) {
      leaves[best].mat.uniforms.uSelf.value = 1;
      shared.uTurn.value.set(leaves[best].p, 1, 0, 0);
    } else shared.uTurn.value.set(0, 0, 0, 0);

    const xmin = THREE.MathUtils.lerp(CX0, -(CX0 + CW), p0);
    deskMat.uniforms.uFoot.value.set(xmin, CX0 + CW, -CH / 2, CH / 2);
  }

  // --- Page physics -------------------------------------------------------
  type Drag = { leaf: Leaf; dir: 1 | -1; s0: number; p0: number; zn: number; pT: number; hist: [number, number][] };
  let drag: Drag | null = null;

  function settle(l: Leaf) {
    l.p = l.to;
    l.base = l.to as 0 | 1;
    l.mode = "rest";
    l.v = 0;
    l.bend = 0;
    l.twist = 0;
    l.peel = 0;
  }

  /** Curl for a page in flight: leads with its edge, then lets it trail as it lands. */
  function flightBend(l: Leaf, a: number) {
    const sp = Math.min(1, Math.abs(l.v) / 2.5);
    return l.dir * l.stiff * BEND * Math.sin(PI * a) * (0.35 + 0.55 * sp) * (1 - 1.55 * a);
  }

  function tween(l: Leaf, to: 0 | 1, delay: number) {
    if (l.mode === "rest" && l.base === to && l.peel < 1e-3) return;
    l.mode = "tween";
    l.from = l.p;
    l.to = to;
    l.base = to;
    l.dir = to > l.p ? 1 : -1;
    l.t0 = performance.now() + delay;
    l.dur = (reduced ? 280 : l.i === 0 ? 1100 : 900) * Math.max(0.4, Math.abs(to - l.p));
    l.peel = l.peelGoal = 0;
  }

  function spring(l: Leaf, to: 0 | 1, v0: number) {
    l.mode = "spring";
    l.from = l.p;
    l.to = to;
    l.base = to;
    l.v = clamp(v0, -6, 6);
    l.dir = Math.sign(to - l.p) || l.dir;
    l.twist0 = l.twist;
    l.peel = l.peelGoal = 0;
  }

  function updateLeaves(now: number, dt: number) {
    let busy = false;
    if (drag) {
      const l = drag.leaf;
      const prev = l.p;
      l.p += (drag.pT - l.p) * Math.min(1, dt * (reduced ? 40 : 20));
      l.v += ((l.p - prev) / Math.max(dt, 1e-3) - l.v) * Math.min(1, dt * 12);
      const a = drag.dir > 0 ? l.p : 1 - l.p;
      const sp = Math.min(1, Math.abs(l.v) / 2.5);
      l.bend = drag.dir * l.stiff * BEND * Math.sin(PI * a) * (0.78 + 0.32 * sp);
      // Grabbing near a corner lets that corner lead the page over.
      l.twist = drag.dir * l.stiff * 0.55 * drag.zn * Math.sin(PI * Math.min(1, a * 1.3));
      busy = true;
    }
    for (const l of leaves) {
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
        if (now < l.t0) continue;
        const r = clamp((now - l.t0) / l.dur);
        const np = l.from + (l.to - l.from) * ease(r);
        l.v = (np - l.p) / Math.max(dt, 1e-3);
        l.p = np;
        const a = l.dir > 0 ? l.p : 1 - l.p;
        l.bend += (flightBend(l, a) - l.bend) * Math.min(1, dt * 10);
        l.twist = 0;
        if (r >= 1) settle(l);
      } else {
        // At rest, a page lifts its corner towards a nearby pointer.
        const before = l.peel;
        l.peel = damp(l.peel, l.peelGoal, 9, dt);
        if (Math.abs(l.peel - l.peelGoal) < 1e-4) l.peel = l.peelGoal;
        if (l.peel !== before) busy = true;
        const sgn = l.base === 0 ? 1 : -1;
        l.p = l.base + sgn * (l.i === 0 ? 0.035 : 0.05) * l.peel;
        l.bend = sgn * l.stiff * 0.32 * l.peel;
        l.twist = sgn * l.stiff * 0.3 * l.peel * l.peelZ;
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
    const step = ids.length > 3 ? 90 : 150;
    ids.forEach((i, k) => tween(leaves[i], fwd ? 1 : 0, k * step));
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

  // --- Picking ------------------------------------------------------------
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
    plane.constant = -(spread === 0 ? 2 * TC + GAP + TP * LEAVES : TC + GAP + (TP * LEAVES) / 2);
    const out = new THREE.Vector3();
    return localRay.intersectPlane(plane, out) ? out : null;
  }

  function pick(cx: number, cy: number): Hit {
    const pt = localPoint(cx, cy);
    if (!pt) return null;
    if (spread === 0) {
      return pt.x > CX0 && pt.x < CX0 + CW && Math.abs(pt.z) < CH / 2 ? { side: "cover", face: 0, u: (pt.x - CX0) / CW, v: (pt.z + CH / 2) / CH, pt } : null;
    }
    if (Math.abs(pt.z) > H / 2 || Math.abs(pt.x) > W) return null;
    const side = pt.x >= 0 ? "R" : "L";
    const face = side === "R" ? 2 * spread : 2 * spread - 1;
    const u = side === "R" ? pt.x / W : 1 + pt.x / W;
    const v = (pt.z + H / 2) / H;
    const link = cache.get(textureKey(face))?.links.find((h) => u >= h.u0 && u <= h.u1 && v >= h.v0 && v <= h.v1);
    return { side, face, u, v, link, pt };
  }

  function follow(link: Hotspot) {
    const t = link.target;
    if ("spread" in t) goTo(t.spread);
    else if (t.href.startsWith("mailto:") || t.href.startsWith("/")) window.location.href = t.href;
    else window.open(t.href, "_blank", "noopener,noreferrer");
  }

  function hover(hit: Hit) {
    for (const l of leaves) l.peelGoal = 0;
    if (!reduced && hit && !hit.link) {
      if (hit.side === "cover") {
        leaves[0].peelGoal = 0.35 + 0.65 * smooth(clamp((hit.u - 0.55) / 0.4));
      } else if (hit.side === "R" && spread < LAST_SPREAD) {
        const l = leaves[spread];
        if (l.mode === "rest") {
          l.peelGoal = smooth(clamp((hit.u - 0.62) / 0.36));
          l.peelZ = 2 * hit.v - 1;
        }
      } else if (hit.side === "L" && spread > 0) {
        const l = leaves[spread - 1];
        if (l.mode === "rest") {
          l.peelGoal = smooth(clamp((0.38 - hit.u) / 0.36));
          l.peelZ = 2 * hit.v - 1;
        }
      }
    }
    const link = hit?.link;
    if (link) {
      shared.uHover.value.set(link.u0, link.v0, link.u1, link.v1);
      shared.uHoverFace.value = hit!.face;
    } else shared.uHoverFace.value = -1;
    canvas.style.cursor = link || hit?.side === "cover" ? "pointer" : hit && !portrait() ? "grab" : "default";
    invalidate();
  }

  // --- Pointer input --------------------------------------------------------
  let down: null | { id: number; x: number; y: number; hit: Hit; lp: THREE.Vector3 | null; touch: boolean; moved: boolean } = null;

  function startDrag(l: Leaf, dir: 1 | -1, lp: THREE.Vector3) {
    if (l.mode !== "rest" || reduced) return false;
    const s0 = Math.max(0.5, dir * lp.x);
    l.mode = "drag";
    l.dir = dir;
    l.peel = l.peelGoal = 0;
    drag = { leaf: l, dir, s0, p0: l.p, zn: clamp(lp.z / (H / 2), -1, 1), pT: l.p, hist: [[performance.now(), l.p]] };
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
          if (down.hit?.side === "cover" || down.touch) startDrag(leaves[0], 1, lp);
        } else if (portrait()) {
          // One page on screen: swiping it turns it, swiping towards it pans.
          const fwd = dx < 0;
          if (fwd && (focus === "R" || spread === 1) && spread < LAST_SPREAD) startDrag(leaves[spread], 1, new THREE.Vector3(Math.max(lp.x, W * 0.7), 0, lp.z));
          else if (!fwd && focus === "L" && spread > 1) startDrag(leaves[spread - 1], -1, new THREE.Vector3(Math.min(lp.x, -W * 0.7), 0, lp.z));
        } else {
          const side = down.hit?.side ?? (lp.x >= 0 ? "R" : "L");
          if (side === "R" && spread < LAST_SPREAD) startDrag(leaves[spread], 1, lp);
          else if (side === "L" && spread > 0) startDrag(leaves[spread - 1], -1, lp);
        }
      }
    }
    if (drag) {
      const pt = localPoint(e.clientX, e.clientY);
      if (!pt) return;
      const { dir, s0 } = drag;
      // Treat the grab point as riding a circle about the spine, as paper does.
      const l = Math.max(s0, W * 0.6);
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
      const { leaf: l, dir, hist } = drag;
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
        spread = dir > 0 ? l.i + 1 : l.i;
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

  // --- Frame loop -----------------------------------------------------------
  let raf = 0;
  let last = 0;
  let lastActive = performance.now();
  let skip = false;

  function invalidate() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  function update(now: number, dt: number) {
    let busy = updateLeaves(now, dt);

    pointer.sx = damp(pointer.sx, pointer.on ? pointer.x : 0, 3, dt);
    pointer.sy = damp(pointer.sy, pointer.on ? pointer.y : 0, 3, dt);
    orient.sx = damp(orient.sx, orient.x, 6, dt);
    orient.sy = damp(orient.sy, orient.y, 6, dt);
    if (Math.abs(pointer.sx - (pointer.on ? pointer.x : 0)) + Math.abs(pointer.sy - (pointer.on ? pointer.y : 0)) > 1e-3) busy = true;

    const openGoal = spread > 0 ? 1 : 0;
    openness = damp(openness, openGoal, 2.6, dt);
    if (Math.abs(openGoal - openness) < 1e-4) openness = openGoal;
    else busy = true;

    // Tip the passport towards the reader while a page is in flight, then settle back.
    const turning = !!drag || leaves.some((l) => (l.mode === "tween" || l.mode === "spring") && l.p > 0.04 && l.p < 0.96);
    if (turning) lastTurn = now;
    const readGoal = now - lastTurn < 350 ? 0 : 1;
    readAmt = damp(readAmt, readGoal, readGoal > readAmt ? 1.3 : 3.4, dt);
    if (Math.abs(readAmt - readGoal) > 1e-3) busy = true;

    const g = poseGoal();
    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.8);
    view.spin += (g.spin - view.spin) * k;
    view.fx += (g.fx - view.fx) * (reduced ? 1 : 1 - Math.exp(-dt * 3.2));
    view.dist += (fitDistance(g) - view.dist) * k;
    const theta = THREE.MathUtils.lerp(g.turn, g.read, smooth(readAmt));
    view.theta += (theta - view.theta) * (reduced ? 1 : 1 - Math.exp(-dt * 3.5));
    if (Math.abs(g.spin - view.spin) + Math.abs(g.fx - view.fx) + Math.abs(theta - view.theta) > 1e-4 || Math.abs(fitDistance(g) - view.dist) > 1e-3) busy = true;

    const t = now / 1000;
    const sway = reduced ? 0 : 1;
    const px = pointer.sx * 0.07 + orient.sx * 0.12;
    const py = pointer.sy * 0.05 + orient.sy * 0.1;
    pose.rotation.set(sway * (0.016 * Math.sin(t * 0.53) + 0.008 * Math.sin(t * 1.31 + 2)) - py * sway, 0, sway * (0.02 * Math.sin(t * 0.41 + 1) + 0.007 * Math.sin(t * 1.07)) - px * sway);
    pose.position.set(0, HOVER + sway * 0.05 * Math.sin(t * 0.7), 0);
    spin.rotation.y = view.spin + sway * 0.006 * Math.sin(t * 0.37 + 4);
    book.position.set(-view.fx, 0, 0);

    camera.position.set(0, HOVER + view.dist * Math.cos(view.theta), view.dist * Math.sin(view.theta));
    camera.up.set(0, 0, -1);
    camera.lookAt(0, HOVER, 0);

    const L = shared.uLightDir.value;
    lightGoal.set(-0.45 + pointer.sx * 0.45, 0.85, 0.42 - pointer.sy * 0.35).normalize();
    L.lerp(lightGoal, 1 - Math.exp(-dt * 5)).normalize();

    layout();
    scene.updateMatrixWorld();
    deskMat.uniforms.uBookInv.value.copy(book.matrixWorld).invert();
    deskMat.uniforms.uHover.value = pose.position.y;
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
    if (!reduced || busy) invalidate();
    else last = 0;
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    // Keep the multisampled drawing buffer near 2.6 MP however dense the screen is.
    const dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.6e6 / (width * height))));
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
    foil.needsUpdate = true;
    felt.needsUpdate = true;
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
  snapView();
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
      leaves.forEach((l) => l.mat.dispose());
      backPaper.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
