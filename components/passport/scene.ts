import * as THREE from "three";
import { PH, PW } from "./art";
import { DATA_OVD, FACES, LAST_SPREAD, LEAVES, isHolo, paintCover, paintFace, tintOf, type Assets, type Fonts, type Hotspot } from "./pages";
import * as S from "./shaders";

// Scene units are centimetres. A passport page is 88 x 125 mm.
const W = 8.8;
const H = 12.5;
const TC = 0.07; // cover board
const TP = 0.03; // one paper leaf
const GAP = 0.012;
const CX0 = -0.06;
const CW = W + 0.22;
const CH = H + 0.32;
const PAGE_RADIUS = 0.42;
const CACHE = 6; // page textures kept on the GPU at once

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
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  p: number;
  from: number;
  to: number;
  t0: number;
  dur: number;
  dir: number;
  curl: number;
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

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

function leafGeometry(segX = 44, segZ = 10) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segZ; j++)
    for (let i = 0; i <= segX; i++) pos.push(W * Math.pow(i / segX, 1.3), 0, -H / 2 + (H * j) / segZ);
  for (let j = 0; j < segZ; j++)
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i;
      const b = a + 1;
      const c = a + segX + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
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
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 });
}

function coverGeometry() {
  const s = new THREE.Shape();
  roundedRect(s, CX0, -CH / 2, CW, CH, 0.46);
  const b = 0.014;
  const g = new THREE.ExtrudeGeometry(s, { depth: TC - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
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

  const dpr0 = window.devicePixelRatio || 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr0 < 1.5, alpha: false, stencil: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x16120e, 1);
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 300);
  const book = new THREE.Group();
  scene.add(book);

  const shared = {
    uLightDir: { value: new THREE.Vector3(-0.45, 0.85, 0.42).normalize() },
    uLightCol: { value: new THREE.Color(1.0, 0.95, 0.88) },
    uArch: { value: 0 },
    uW: { value: W },
    uH: { value: H },
    uRadius: { value: PAGE_RADIUS },
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
  const frontCover = new THREE.Mesh(coverGeo, coverMat(true));
  coverPivot.add(frontCover);
  book.add(coverPivot);
  const backCover = new THREE.Mesh(coverGeo, coverMat(false));
  book.add(backCover);

  const spineGeo = track(new THREE.CylinderGeometry(1, 1, CH - 0.24, 24, 1, true, Math.PI, Math.PI));
  spineGeo.rotateX(Math.PI / 2);
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
          uCurl: { value: 0 },
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
    leaves.push({ mesh, mat, p: 0, from: 0, to: 0, t0: 0, dur: 1, dir: 1, curl: i === 0 ? 0 : 1.15 });
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
        uniforms: { ...shared, uSide: { value: side }, uY0: { value: TC }, uY1: { value: TC + 0.1 } },
      }),
    );
  const rightBlock = new THREE.Mesh(blockGeo, blockMat(1));
  const leftBlock = new THREE.Mesh(blockGeo, blockMat(-1));
  rightBlock.frustumCulled = leftBlock.frustumCulled = false;
  book.add(rightBlock, leftBlock);

  const deskMat = track(
    new THREE.ShaderMaterial({
      vertexShader: S.DESK_VS,
      fragmentShader: S.DESK_FS,
      uniforms: {
        uLightDir: shared.uLightDir,
        uLightCol: shared.uLightCol,
        uBookInv: { value: new THREE.Matrix4() },
        uFoot: { value: new THREE.Vector4() },
        uLiftShadow: { value: 0 },
      },
    }),
  );
  const deskGeo = track(new THREE.PlaneGeometry(140, 140));
  deskGeo.rotateX(-Math.PI / 2);
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.y = -0.002;
  scene.add(desk);

  // --- Page textures ------------------------------------------------------
  const quality = Math.min(window.innerWidth, window.innerHeight) < 600 ? 768 : 1024;
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = quality;
  paintCanvas.height = Math.round((quality * PH) / PW);
  const pctx = paintCanvas.getContext("2d")!;
  const cache = new Map<number, { tex: THREE.Texture; links: Hotspot[] }>();

  function slotOf(face: number): [THREE.ShaderMaterial, "Front" | "Back"] | null {
    if (face === 1) return [leaves[0].mat, "Back"];
    if (face === lastFace) return [backPaper, "Front"];
    if (face < 2 || face > lastFace) return null;
    const leaf = leaves[Math.floor(face / 2)];
    return leaf ? [leaf.mat, face % 2 === 0 ? "Front" : "Back"] : null;
  }

  function assign(face: number, tex: THREE.Texture | null) {
    const slot = slotOf(face);
    if (!slot) return;
    const [mat, side] = slot;
    mat.uniforms[`u${side}`].value = tex;
    mat.uniforms[`uHas${side}`].value = tex ? 1 : 0;
  }

  let spread = 0;
  let focus: "L" | "R" = "R";
  let painting = false;
  let disposed = false;

  const wanted = () => {
    const s = spread;
    return [2 * s - 1, 2 * s, 2 * s + 1, 2 * s + 2, 2 * s - 3, 2 * s - 2].filter((f) => f >= 1 && f <= lastFace);
  };

  async function pump() {
    if (painting || disposed) return;
    const want = wanted();
    const face = want.find((f) => !cache.has(f));
    if (face === undefined) return;
    // Painting takes tens of milliseconds; keep it out of page turns unless the page is on show.
    const onShow = face === 2 * spread || face === 2 * spread - 1;
    if (!onShow && (dragging || leaves.some((l) => l.p !== l.to))) {
      setTimeout(pump, 150);
      return;
    }
    painting = true;
    await idle();
    if (disposed) return;
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
    cache.set(face, { tex, links });
    assign(face, tex);
    // Evict the pages furthest from where the reader is.
    const keep = wanted();
    const extra = [...cache.keys()].filter((f) => !keep.includes(f)).sort((a, b) => Math.abs(b - 2 * spread) - Math.abs(a - 2 * spread));
    while (cache.size > CACHE && extra.length) {
      const f = extra.shift()!;
      cache.get(f)!.tex.dispose();
      cache.delete(f);
      assign(f, null);
    }
    painting = false;
    invalidate();
    pump();
  }

  // --- State, layout and camera -------------------------------------------
  let openness = 0;
  const lightGoal = shared.uLightDir.value.clone();
  const cam = { pos: new THREE.Vector3(0, 30, 20), target: new THREE.Vector3(), up: new THREE.Vector3(0, 0, -1) };
  const goal = { pos: new THREE.Vector3(), target: new THREE.Vector3(), up: new THREE.Vector3() };
  let width = 1;
  let height = 1;

  const portrait = () => width / height < 0.85;

  function computeGoal() {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const a = width / height;
    let target: THREE.Vector3;
    let dir: THREE.Vector3;
    let up: THREE.Vector3;
    let w: number;
    let h: number;
    if (spread === 0) {
      target = new THREE.Vector3(0, 0.2, 0.1);
      dir = new THREE.Vector3(0, 0.83, 0.56).normalize();
      up = new THREE.Vector3(0, 0, -1);
      w = CW * (portrait() ? 1.3 : 1.85);
      h = CH * 1.22;
    } else if (spread === 1) {
      // Turn the book so the sideways data page reads naturally.
      target = new THREE.Vector3(W / 2, 0.25, 0);
      dir = new THREE.Vector3(0.3, 0.95, 0).normalize();
      up = new THREE.Vector3(-1, 0, 0);
      w = H + 1.3;
      h = W + 1.6;
    } else if (portrait()) {
      target = new THREE.Vector3(focus === "L" ? -W / 2 : W / 2, 0.25, 0.25);
      dir = new THREE.Vector3(0, 0.95, 0.3).normalize();
      up = new THREE.Vector3(0, 0, -1);
      w = W + 0.6;
      h = H + 0.9;
    } else {
      target = new THREE.Vector3(0, 0.25, 0.35);
      dir = new THREE.Vector3(0, 0.93, 0.36).normalize();
      up = new THREE.Vector3(0, 0, -1);
      w = 2 * W + 1.3;
      h = H + 1.4;
    }
    const dist = Math.max(h / 2 / t, w / 2 / (t * a));
    goal.target.copy(target);
    goal.up.copy(up);
    goal.pos.copy(target).addScaledVector(dir, dist);
  }

  function layout() {
    const n = LEAVES;
    const p = leaves.map((l) => l.p);
    let rightAll = 0;
    let leftAll = 0;
    for (let j = 1; j <= n; j++) {
      rightAll += 1 - p[j];
      leftAll += p[j];
    }
    // Front cover board and its endpaper.
    const inner = TC + GAP + TP * rightAll + 0.006;
    const hinge0 = THREE.MathUtils.lerp(inner, TC, p[0]);
    coverPivot.position.y = hinge0;
    coverPivot.rotation.z = Math.PI * p[0];
    const m0 = leaves[0].mat.uniforms;
    m0.uP.value = p[0];
    m0.uHinge.value = hinge0;
    // Paper leaves stack on whichever side they rest.
    let below = rightAll;
    let left = 0;
    for (let i = 1; i <= n; i++) {
      below -= 1 - p[i];
      const r = TC + GAP + TP * below;
      const l = TC + GAP + TP * left;
      left += p[i];
      const u = leaves[i].mat.uniforms;
      u.uP.value = p[i];
      u.uHinge.value = THREE.MathUtils.lerp(r, l, p[i]);
      u.uCurl.value = leaves[i].curl * leaves[i].dir;
      u.uTwist.value = 0.16 * leaves[i].dir;
    }
    // Blocks only stand in for leaves fully at rest, so a lifting page never shows them.
    let restRight = 0;
    let restLeft = 0;
    for (let j = 1; j <= n; j++) {
      if (p[j] <= 1e-3) restRight++;
      if (p[j] >= 1 - 1e-3) restLeft++;
    }
    const rb = rightBlock.material as THREE.ShaderMaterial;
    rb.uniforms.uY1.value = TC + GAP + TP * (restRight - 1) - 0.004;
    rightBlock.visible = restRight > 1;
    const lb = leftBlock.material as THREE.ShaderMaterial;
    lb.uniforms.uY1.value = TC + GAP + TP * (restLeft - 1) - 0.004;
    leftBlock.visible = restLeft > 1;

    const top = hinge0 + TC;
    const closed = 1 - p[0];
    spine.visible = closed > 0.02;
    spine.scale.set((top / 2) * Math.max(closed, 0.001), top / 2, 1);
    spine.position.set(0, top / 2, 0);

    shared.uArch.value = 0.07 * smooth(openness);

    // Shadow from the page that is currently lifted highest.
    let best = -1;
    let lift = 0;
    leaves.forEach((l, i) => {
      const s = Math.sin(Math.PI * l.p);
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

    // The closed book sits angled on the desk; it squares up as it opens.
    const c = 1 - smooth(openness);
    const yaw = -0.22 * c;
    // Keep the closed book centred on the origin while it is angled.
    const cx = (CX0 + CW / 2) * c;
    book.position.set(-cx * Math.cos(yaw), 0, cx * Math.sin(yaw));
    book.rotation.y = yaw;
    book.updateMatrixWorld(true);
    deskMat.uniforms.uBookInv.value.copy(book.matrixWorld).invert();
    const xmin = THREE.MathUtils.lerp(CX0, -(CX0 + CW), p[0]);
    deskMat.uniforms.uFoot.value.set(xmin, CX0 + CW, -CH / 2, CH / 2);
    deskMat.uniforms.uLiftShadow.value = lift * 0.6;
  }

  // --- Animation ----------------------------------------------------------
  let raf = 0;
  let last = 0;
  let dragging: null | { leaf: number; forward: boolean; a0: number; samples: [number, number][] } = null;

  function invalidate() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  function update(now: number, dt: number) {
    let busy = !!dragging;
    for (const l of leaves) {
      if (l === leaves[dragging?.leaf ?? -1]) continue;
      if (l.p !== l.to) {
        const t = clamp((now - l.t0) / l.dur);
        if (now < l.t0) busy = true;
        else {
          l.p = t >= 1 ? l.to : l.from + (l.to - l.from) * ease(t);
          busy = true;
        }
      }
    }
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.4);
    const openGoal = spread > 0 ? 1 : 0;
    openness += (openGoal - openness) * (reduced ? 1 : 1 - Math.exp(-dt * 2.6));
    if (Math.abs(openGoal - openness) < 1e-4) openness = openGoal;
    else busy = true;

    const L = shared.uLightDir.value;
    L.lerp(lightGoal, 1 - Math.exp(-dt * 5)).normalize();
    if (L.distanceTo(lightGoal) > 1e-4) busy = true;

    computeGoal();
    cam.pos.lerp(goal.pos, k);
    cam.target.lerp(goal.target, k);
    cam.up.lerp(goal.up, k).normalize();
    if (cam.pos.distanceTo(goal.pos) + cam.target.distanceTo(goal.target) + cam.up.distanceTo(goal.up) > 1e-3) busy = true;
    camera.position.copy(cam.pos);
    camera.up.copy(cam.up);
    camera.lookAt(cam.target);

    layout();
    return busy;
  }

  function frame(t: number) {
    raf = 0;
    const dt = last ? Math.min((t - last) / 1000, 0.1) : 1 / 60;
    last = t;
    const busy = update(t, dt);
    renderer.render(scene, camera);
    if (busy) invalidate();
    else last = 0;
  }

  function turn(i: number, to: number, delay: number) {
    const l = leaves[i];
    if (l.p === to && l.to === to) return;
    l.from = l.p;
    l.to = to;
    l.dir = to > l.p ? 1 : -1;
    l.t0 = performance.now() + delay;
    const base = reduced ? 260 : i === 0 ? 1150 : 950;
    l.dur = base * Math.max(0.35, Math.abs(to - l.p));
  }

  function goTo(target: number, keepFocus = false) {
    const s = clamp(Math.round(target), 0, LAST_SPREAD);
    if (s === spread) return;
    const forward = s > spread;
    const ids = forward ? [...Array(s - spread)].map((_, k) => spread + k) : [...Array(spread - s)].map((_, k) => spread - 1 - k);
    const step = ids.length > 2 ? 110 : 160;
    ids.forEach((i, k) => turn(i, forward ? 1 : 0, k * step));
    spread = s;
    if (!keepFocus) focus = forward ? "L" : "R";
    events.onSpread?.(spread);
    invalidate();
    pump();
  }

  function next() {
    if (portrait() && spread >= 2 && focus === "L") {
      focus = "R";
      invalidate();
      events.onSpread?.(spread);
    } else if (spread < LAST_SPREAD) goTo(spread + 1);
  }

  function prev() {
    if (portrait() && spread >= 2 && focus === "R") {
      focus = "L";
      invalidate();
      events.onSpread?.(spread);
    } else if (spread > 0) goTo(spread - 1);
  }

  // --- Picking ------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25);
  const hitV = new THREE.Vector3();

  function localPoint(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hitV)) return null;
    return book.worldToLocal(hitV.clone());
  }

  type Hit = { side: "cover" | "L" | "R"; face: number; u: number; v: number; link?: Hotspot } | null;

  function pick(e: PointerEvent): Hit {
    const pt = localPoint(e);
    if (!pt) return null;
    if (spread === 0) {
      return pt.x > CX0 && pt.x < CX0 + CW && Math.abs(pt.z) < CH / 2 ? { side: "cover", face: 0, u: 0, v: 0 } : null;
    }
    if (Math.abs(pt.z) > H / 2 || Math.abs(pt.x) > W) return null;
    const side = pt.x >= 0 ? "R" : "L";
    const face = side === "R" ? 2 * spread : 2 * spread - 1;
    const u = side === "R" ? pt.x / W : 1 + pt.x / W;
    const v = (pt.z + H / 2) / H;
    const link = cache.get(face)?.links.find((h) => u >= h.u0 && u <= h.u1 && v >= h.v0 && v <= h.v1);
    return { side, face, u, v, link };
  }

  function follow(link: Hotspot) {
    const t = link.target;
    if ("spread" in t) goTo(t.spread);
    else if (t.href.startsWith("mailto:") || t.href.startsWith("/")) window.location.href = t.href;
    else window.open(t.href, "_blank", "noopener,noreferrer");
  }

  let down: null | { x: number; y: number; hit: Hit; moved: boolean } = null;
  const dragAngle = (x: number) => Math.acos(clamp(x / W, -1, 1));

  function setHover(hit: Hit) {
    const link = hit?.link;
    if (link) {
      shared.uHover.value.set(link.u0, link.v0, link.u1, link.v1);
      shared.uHoverFace.value = hit!.face;
    } else shared.uHoverFace.value = -1;
    canvas.style.cursor = link || hit?.side === "cover" ? "pointer" : hit && !portrait() ? "grab" : "default";
    invalidate();
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, hit: pick(e), moved: false };
    canvas.setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent) {
    if (e.pointerType === "mouse" && !down) {
      const r = canvas.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      lightGoal.set(-0.45 + px * 0.4, 0.85, 0.42 + py * 0.35).normalize();
      setHover(pick(e));
      return;
    }
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 7) {
      down.moved = true;
      const hit = down.hit;
      if (hit && !portrait() && !reduced) {
        const pt = localPoint(e);
        if (hit.side !== "L" && spread < LAST_SPREAD && pt) {
          const leaf = spread;
          dragging = { leaf, forward: true, a0: dragAngle(Math.max(0, pt.x)), samples: [] };
        } else if (hit.side === "L" && spread > 0 && pt) {
          const leaf = spread - 1;
          dragging = { leaf, forward: false, a0: dragAngle(Math.max(0, -pt.x)), samples: [] };
        }
        if (dragging) {
          leaves[dragging.leaf].dir = dragging.forward ? 1 : -1;
          canvas.style.cursor = "grabbing";
        }
      }
    }
    if (dragging) {
      const pt = localPoint(e);
      if (!pt) return;
      const { a0, forward } = dragging;
      const x = forward ? pt.x : -pt.x;
      const q = clamp((dragAngle(x) - a0) / Math.max(0.2, Math.PI - a0));
      leaves[dragging.leaf].p = forward ? q : 1 - q;
      leaves[dragging.leaf].to = leaves[dragging.leaf].p;
      dragging.samples.push([performance.now(), pt.x]);
      if (dragging.samples.length > 6) dragging.samples.shift();
      invalidate();
    }
  }

  function onUp(e: PointerEvent) {
    if (!down) return;
    const d = down;
    down = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (dragging) {
      const { leaf, forward, samples } = dragging;
      dragging = null;
      const [t0, x0] = samples[0] ?? [0, 0];
      const [t1, x1] = samples[samples.length - 1] ?? [1, 0];
      const vx = (x1 - x0) / Math.max(0.016, (t1 - t0) / 1000);
      const p = leaves[leaf].p;
      if (forward) {
        const done = p > 0.4 || vx < -12;
        turn(leaf, done ? 1 : 0, 0);
        leaves[leaf].dir = 1;
        if (done) {
          spread = leaf + 1;
          focus = "L";
          events.onSpread?.(spread);
          pump();
        }
      } else {
        const done = p < 0.6 || vx > 12;
        turn(leaf, done ? 0 : 1, 0);
        leaves[leaf].dir = -1;
        if (done) {
          spread = leaf;
          focus = "R";
          events.onSpread?.(spread);
          pump();
        }
      }
      setHover(pick(e));
      invalidate();
      return;
    }
    const dx = e.clientX - d.x;
    if (d.moved) {
      if (Math.abs(dx) > 30) (dx < 0 ? next : prev)();
      return;
    }
    const hit = pick(e);
    if (hit?.link) follow(hit.link);
    else if (hit?.side === "cover" || hit?.side === "R") next();
    else if (hit?.side === "L") prev();
  }

  function onLeave() {
    if (down) return;
    shared.uHoverFace.value = -1;
    invalidate();
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

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    // Keep the drawing buffer near 3 MP however dense the screen is.
    const dpr = Math.max(1, Math.min(dpr0, 2, Math.sqrt(3.2e6 / (width * height))));
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
    for (const [f, entry] of cache) {
      entry.tex.dispose();
      assign(f, null);
    }
    cache.clear();
    foil.needsUpdate = true;
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
  computeGoal();
  cam.pos.copy(goal.pos);
  cam.target.copy(goal.target);
  cam.up.copy(goal.up);
  update(performance.now(), 1 / 60);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  events.onReady?.();
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
      for (const { tex } of cache.values()) tex.dispose();
      cache.clear();
      leaves.forEach((l) => l.mat.dispose());
      backPaper.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
