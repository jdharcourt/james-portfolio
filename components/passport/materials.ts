import * as THREE from "three";
import { rng } from "./art";

// Materials, generated textures and the reflected room for the passport.
// Everything is drawn at load; nothing is downloaded.

export type Hover = { rect: { value: THREE.Vector4 }; on: { value: number } };

// --- Generated textures ------------------------------------------------------

function wrapDraw(size: number, x: number, y: number, reach: number, draw: (x: number, y: number) => void) {
  for (const dx of [-size, 0, size])
    for (const dy of [-size, 0, size]) {
      const px = x + dx;
      const py = y + dy;
      if (px > -reach && px < size + reach && py > -reach && py < size + reach) draw(px, py);
    }
}

/** Height field to a tangent-space normal map (RGBA bytes). */
function heightToNormal(h: Float32Array, size: number, strength: number) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)];
      const r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x];
      const d = h[((y + 1) % size) * size + x];
      let nx = (l - r) * strength;
      let ny = (u - d) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nz * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  return out;
}

function dataTexture(data: Uint8Array, size: number, srgb: boolean, aniso: number) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Seamless wool felt: colour and normal tiles drawn from one height canvas. */
export function feltTextures(aniso: number, size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const r = rng(77);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  // Soft mottling.
  for (let i = 0; i < 260; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 20 + r() * 70;
    const light = r() > 0.5;
    wrapDraw(size, x, y, rad, (px, py) => {
      const grad = g.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)");
      grad.addColorStop(1, "rgba(128,128,128,0)");
      g.fillStyle = grad;
      g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
  // Short curly fibres, matted in every direction.
  g.lineCap = "round";
  for (let i = 0; i < 5200; i++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI * 2;
    const len = 5 + r() * 22;
    const bend = (r() - 0.5) * len * 0.9;
    const light = r() > 0.42;
    g.strokeStyle = light ? `rgba(255,255,255,${0.1 + r() * 0.16})` : `rgba(0,0,0,${0.08 + r() * 0.14})`;
    g.lineWidth = 0.6 + r() * 1.2;
    wrapDraw(size, x, y, len, (px, py) => {
      const ex = px + Math.cos(a) * len;
      const ey = py + Math.sin(a) * len;
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo((px + ex) / 2 - Math.sin(a) * bend, (py + ey) / 2 + Math.cos(a) * bend, ex, ey);
      g.stroke();
    });
  }
  const px = g.getImageData(0, 0, size, size).data;
  c.width = c.height = 1;
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = px[i * 4] / 255;
  const col = new Uint8Array(size * size * 4);
  for (let i = 0; i < h.length; i++) {
    const v = h[i];
    // Warm grey-brown wool; raised fibres catch a little more light.
    col[i * 4] = 74 + (v - 0.5) * 46;
    col[i * 4 + 1] = 67 + (v - 0.5) * 42;
    col[i * 4 + 2] = 60 + (v - 0.5) * 38;
    col[i * 4 + 3] = 255;
  }
  return { map: dataTexture(col, size, true, aniso), normal: dataTexture(heightToNormal(h, size, 1.6), size, false, aniso) };
}

/** Faint paper tooth for the page normal maps. */
export function paperNormal(aniso: number, size = 256) {
  const r = rng(91);
  const h = new Float32Array(size * size);
  // Value noise at two scales plus fibre streaks along the grain.
  const grid = (n: number) => {
    const v = new Float32Array(n * n).map(() => r());
    return (x: number, y: number) => {
      const fx = (x / size) * n;
      const fy = (y / size) * n;
      const x0 = Math.floor(fx) % n;
      const y0 = Math.floor(fy) % n;
      const x1 = (x0 + 1) % n;
      const y1 = (y0 + 1) % n;
      const tx = fx - Math.floor(fx);
      const ty = fy - Math.floor(fy);
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const a = v[y0 * n + x0] + (v[y0 * n + x1] - v[y0 * n + x0]) * sx;
      const b = v[y1 * n + x0] + (v[y1 * n + x1] - v[y1 * n + x0]) * sx;
      return a + (b - a) * sy;
    };
  };
  const n1 = grid(64);
  const n2 = grid(16);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = n1(x, y) * 0.6 + n2(x, y) * 0.4;
  return dataTexture(heightToNormal(h, size, 1.6), size, false, aniso);
}

/** Soft contact shadow under the book: a blurred rounded rectangle. */
export function contactShadow() {
  const w = 256;
  const h = 320;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.filter = "blur(18px)";
  g.fillStyle = "#000";
  g.beginPath();
  g.roundRect(44, 44, w - 88, h - 88, 18);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** A blank 1x1 texture so page materials keep the same shader before their art loads. */
export function blankTexture() {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Where the data page's laminate shows its rainbow film. */
export function hologramMask(ovd: { u: number; v: number; r: number }, ghost: { u0: number; v0: number; u1: number; v1: number }, pageW: number, pageH: number) {
  const w = 96;
  const h = Math.round((w * pageH) / pageW);
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      const d = Math.hypot((u - ovd.u) * pageW, (v - ovd.v) * pageH);
      const disc = 1 - Math.min(1, Math.max(0, (d - ovd.r * 0.55) / (ovd.r * 0.45)));
      const inGhost = u > ghost.u0 && u < ghost.u1 && v > ghost.v0 && v < ghost.v1 ? 0.55 : 0;
      // A faint film over the whole laminate, strong over the OVD and ghost image.
      const m = Math.min(1, 0.16 + disc + inGhost);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = m * 255;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, w, h);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// --- The room the book reflects ----------------------------------------------

/** Direction of the key light, shared with the reflected room so glints line up. */
export const KEY_DIR = new THREE.Vector3(-0.42, 0.82, -0.4).normalize();

export function roomEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const glow = (hex: number, k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide });
  const R = 30;
  const put = (mesh: THREE.Object3D, dir: THREE.Vector3, roll = 0) => {
    mesh.position.copy(dir).normalize().multiplyScalar(R);
    mesh.lookAt(0, 0, 0);
    mesh.rotateZ(roll);
    scene.add(mesh);
  };
  // A dim, warm study.
  const shell = new THREE.Mesh(new THREE.BoxGeometry(84, 56, 84), glow(0x6a6058, 0.22));
  (shell.material as THREE.MeshBasicMaterial).side = THREE.BackSide;
  scene.add(shell);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(84, 84), glow(0x7a6650, 0.3));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -27;
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(46, 36), glow(0xfff0dc, 0.34));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 27.5;
  scene.add(ceiling);
  // The window the key light comes through, with glazing bars.
  const win = new THREE.Group();
  win.add(new THREE.Mesh(new THREE.PlaneGeometry(9, 12), glow(0xfff6ea, 3.2)));
  const bars = glow(0x2c2621, 0.25);
  const v = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 12.4), bars);
  v.position.z = 0.05;
  const hb = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 0.3), bars);
  hb.position.set(0, 1.6, 0.05);
  win.add(v, hb);
  put(win, KEY_DIR.clone());
  // A tall gap in the curtains: a hard highlight for the foil.
  put(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 26), glow(0xfff4e4, 60)), new THREE.Vector3(0.62, 0.66, -0.42), 0.4);
  // A long strip light that sweeps across the laminate as the book tilts.
  put(new THREE.Mesh(new THREE.PlaneGeometry(64, 0.45), glow(0xf2f6ff, 6)), new THREE.Vector3(0.05, 0.58, -0.81), 0.7);
  // A warm lamp on the right and a cool wall on the left.
  put(new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), glow(0xffd29a, 7)), new THREE.Vector3(0.9, 0.25, 0.35));
  put(new THREE.Mesh(new THREE.PlaneGeometry(34, 30), glow(0xc6d0de, 0.55)), new THREE.Vector3(-1, 0.05, 0.15));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02, 0.1, 200, { size: 256 });
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
  return target;
}

// --- Shader additions --------------------------------------------------------

const noiseGlsl = /* glsl */ `
float pp_hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float pp_noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pp_hash(i), pp_hash(i + vec2(1, 0)), u.x), mix(pp_hash(i + vec2(0, 1)), pp_hash(i + vec2(1, 1)), u.x), u.y);
}
// Bump a shading normal by a height field using screen-space derivatives.
vec3 pp_bump(vec3 pos, vec3 n, vec2 dh, float facing) {
  vec3 sx = dFdx(pos);
  vec3 sy = dFdy(pos);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1) * facing;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * n - grad);
}
`;

/**
 * Pebbled leather with hot-foil gold. The foil mask decides where the surface
 * turns to metal and is pressed slightly into the leather.
 */
export function leatherMaterial(opts: { color: string; foil: THREE.Texture | null; size: [number, number]; gold?: string }) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color,
    roughness: 0.58,
    metalness: 0,
    sheen: 0.45,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color("#8a4552"),
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
  });
  m.defines = { USE_UV: "" };
  const uniforms = {
    uFoil: { value: opts.foil },
    uFoilOn: { value: opts.foil ? 1 : 0 },
    uSize: { value: new THREE.Vector2(...opts.size) },
    uGold: { value: new THREE.Color(opts.gold ?? "#e2b04a") },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uFoil;
uniform float uFoilOn;
uniform vec2 uSize;
uniform vec3 uGold;
${noiseGlsl}
float pp_pebble(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(pp_hash(i + g), pp_hash(i + g + 17.3));
      d = min(d, length(g + o - f));
    }
  return 1.0 - smoothstep(0.0, 0.85, d);
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
vec2 ppCm = vUv * uSize;
vec2 ppGp = ppCm * 9.0;
// Fade the pebbles out before they shrink below a couple of pixels.
float ppRelief = 1.0 - smoothstep(0.3, 0.8, length(fwidth(ppGp)));
float ppPebble = pp_pebble(ppGp) * ppRelief;
float ppFoil = uFoilOn > 0.5 ? texture2D(uFoil, vUv).r : 0.0;
float ppHeight = ppPebble * 0.006 - ppFoil * 0.012;
diffuseColor.rgb *= 0.9 + 0.18 * pp_noise(ppCm * 1.3) + 0.06 * ppPebble;
diffuseColor.rgb = mix(diffuseColor.rgb, uGold * (0.92 + 0.12 * pp_noise(ppCm * 30.0)), ppFoil);`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 1.0, ppFoil);
roughnessFactor = mix(roughnessFactor, 0.26, ppFoil);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
normal = pp_bump(-vViewPosition, normal, vec2(dFdx(ppHeight), dFdy(ppHeight)), faceDirection);`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
material.sheenColor *= 1.0 - ppFoil;`,
      );
  };
  m.customProgramCacheKey = () => "pp-leather";
  return m;
}

function pageHook(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms) {
  const d = this.userData as { hover: Hover; spine: { value: number } };
  shader.uniforms.uHover = d.hover.rect;
  shader.uniforms.uHoverOn = d.hover.on;
  shader.uniforms.uSpine = d.spine;
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
uniform vec4 uHover;
uniform float uHoverOn;
uniform float uSpine;`,
    )
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
// A hovered link gets a faint blue ink bloom rather than an underline.
if (uHoverOn > 0.5 && vMapUv.x > uHover.x && vMapUv.x < uHover.z && vMapUv.y > uHover.y && vMapUv.y < uHover.w) diffuseColor.rgb *= vec3(0.8, 0.87, 1.06);
// Light struggles into the gutter.
diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.0, 0.14, abs(vMapUv.x - uSpine)));`,
    );
}

/** A printed page: matte paper or, for the data card, laminated polycarbonate. */
export function pageMaterial(opts: { blank: THREE.Texture; paper: THREE.Texture; spine: number; laminate?: { iridescence: THREE.Texture } }) {
  const common = { map: opts.blank, normalMap: opts.paper, normalScale: new THREE.Vector2(0.22, 0.22) };
  const m = opts.laminate
    ? new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.62,
        // Satin rather than mirror gloss, so the room's light panels read as a sheen instead of a hotspot.
        clearcoat: 0.4,
        clearcoatRoughness: 0.32,
        iridescence: 0.9,
        iridescenceIOR: 1.4,
        iridescenceThicknessRange: [260, 640],
        iridescenceMap: opts.laminate.iridescence,
      })
    : new THREE.MeshStandardMaterial({ ...common, roughness: 0.84, metalness: 0 });
  m.userData = { hover: { rect: { value: new THREE.Vector4(-1, -1, -1, -1) }, on: { value: 0 } } satisfies Hover, spine: { value: opts.spine } };
  m.onBeforeCompile = pageHook;
  return m;
}

/** Page-block edges: one faint line where each leaf meets the next. */
export function edgeMaterial(color: string, roughness = 0.94) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  m.defines = { USE_UV: "" };
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
float ppW = fwidth(vUv.y);
float ppLine = smoothstep(0.55, 1.0, abs(vUv.y - 0.5) * 2.0 + ppW);
// Once a leaf is thinner than a pixel, settle on the average tone instead of shimmering.
diffuseColor.rgb *= mix(1.0 - 0.22 * ppLine, 0.92, smoothstep(0.3, 0.9, ppW));`,
    );
  };
  m.customProgramCacheKey = () => "pp-edge";
  return m;
}

/**
 * The felt desk. Texture detail is blurred with distance from the passport
 * (a mip bias), which reads as a shallow depth of field without a post pass.
 */
export function deskMaterial(felt: { map: THREE.Texture; normal: THREE.Texture }) {
  const m = new THREE.MeshStandardMaterial({ map: felt.map, normalMap: felt.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 1, metalness: 0 });
  const uniforms = { uFocus: { value: new THREE.Vector2() }, uSharp: { value: new THREE.Vector2(7, 26) } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vDesk;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDesk = position.xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vDesk;\nuniform vec2 uFocus;\nuniform vec2 uSharp;")
      .replace(
        "#include <map_fragment>",
        `float ppBlur = smoothstep(uSharp.x, uSharp.y, length(vDesk - uFocus)) * 3.2;
#include <map_fragment>`,
      )
      .replace("texture2D( map, vMapUv )", "texture2D( map, vMapUv, ppBlur )")
      .replace("texture2D( normalMap, vNormalMapUv )", "texture2D( normalMap, vNormalMapUv, ppBlur )");
  };
  m.customProgramCacheKey = () => "pp-desk";
  return { material: m, uniforms };
}
