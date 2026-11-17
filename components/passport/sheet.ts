import * as THREE from "three";

/**
 * A passport sheet (paper leaf, data card or cover board) as a thin solid.
 *
 * The sheet is described by its tangent angle along the arc length s from the
 * stitch line: it climbs out of the gutter over `ramp`, then follows the base
 * angle plus any bend. Each row along the spine integrates its own profile so a
 * twist lets one corner lead. Positions are rebuilt on the CPU only when the
 * pose changes, so lighting and shadow maps see real geometry.
 */

export type SheetShape = {
  /** Arc length from the stitch line to the fore-edge (cm). */
  length: number;
  /** Size along the spine (cm). */
  height: number;
  /** Fore-edge corner radius (cm). */
  radius: number;
  thickness: number;
  /** Arc length over which the sheet climbs out of the gutter. */
  ramp: number;
  /** Fraction of the length that stays stiff before bending starts. */
  flex: number;
  /** Texture u for each surface as a function of arc length. */
  uFront: (s: number) => number;
  uBack: (s: number) => number;
  /** Height of the paper's natural waviness (cm). */
  cockle?: number;
  seed?: number;
};

export type SheetPose = {
  ox: number;
  oy: number;
  /** Angle of the sheet beyond the gutter: 0 lies to the right, PI to the left. */
  base: number;
  /** Extra angle at the stitch, fading out over the ramp. */
  lift: number;
  /** Extra angle reached at the fore-edge. */
  bend: number;
  /** Extra angle at the top corner relative to the middle. */
  twist: number;
  /** Gutter lift of the stacks either side; the sheet never dips into them. */
  lo: number;
  hi: number;
};

const COLS_RAMP = 12;
const COLS_MID = 24;
const COLS_CORNER = 8;
const ROWS = 16;

export class Sheet {
  readonly geometry = new THREE.BufferGeometry();
  readonly shape: SheetShape;
  private readonly s: Float32Array;
  private readonly zmax: Float32Array;
  private readonly K: number;
  private readonly J = ROWS;
  private readonly mid: Float32Array;
  private readonly nrm: Float32Array;
  private readonly pos: THREE.BufferAttribute;
  private readonly nor: THREE.BufferAttribute;
  private readonly loop: [number, number][];
  private last = "";

  constructor(shape: SheetShape) {
    this.shape = shape;
    const { length: L, radius: r, ramp } = shape;
    const cols: number[] = [];
    for (let i = 0; i <= COLS_RAMP; i++) cols.push(ramp * Math.pow(i / COLS_RAMP, 1.6));
    for (let i = 1; i <= COLS_MID; i++) cols.push(ramp + (L - r - ramp) * (i / COLS_MID));
    for (let i = 1; i <= COLS_CORNER; i++) cols.push(L - r + r * Math.sin((i / COLS_CORNER) * (Math.PI / 2)));
    this.s = new Float32Array(cols);
    this.K = cols.length - 1;
    this.zmax = new Float32Array(cols.map((s) => (s <= L - r ? shape.height / 2 : shape.height / 2 - r + Math.sqrt(Math.max(0, r * r - (s - (L - r)) ** 2)))));

    const K = this.K;
    const J = this.J;
    const V = (K + 1) * (J + 1);
    // Boundary loop around the sheet: bottom edge, fore-edge, top edge, spine.
    const loop: [number, number][] = [];
    for (let k = 0; k <= K; k++) loop.push([k, 0]);
    for (let j = 1; j <= J; j++) loop.push([K, j]);
    for (let k = K - 1; k >= 0; k--) loop.push([k, J]);
    for (let j = J - 1; j >= 0; j--) loop.push([0, j]);
    this.loop = loop;
    const E = loop.length;

    this.mid = new Float32Array(V * 3);
    this.nrm = new Float32Array(V * 3);
    const total = 2 * V + 2 * E;
    this.pos = new THREE.BufferAttribute(new Float32Array(total * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.nor = new THREE.BufferAttribute(new Float32Array(total * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const uv = new Float32Array(total * 2);
    for (let k = 0; k <= K; k++)
      for (let j = 0; j <= J; j++) {
        const i = k * (J + 1) + j;
        const z = -this.zmax[k] + (2 * this.zmax[k] * j) / J;
        const v = (z + shape.height / 2) / shape.height;
        uv[i * 2] = shape.uFront(this.s[k]);
        uv[i * 2 + 1] = v;
        uv[(V + i) * 2] = shape.uBack(this.s[k]);
        uv[(V + i) * 2 + 1] = v;
      }
    for (let e = 0; e < E; e++) {
      // u runs around the edge; v is 1 on the front face and 0 on the back.
      uv[(2 * V + e) * 2] = e / E;
      uv[(2 * V + e) * 2 + 1] = 1;
      uv[(2 * V + E + e) * 2] = e / E;
      uv[(2 * V + E + e) * 2 + 1] = 0;
    }

    const front: number[] = [];
    const back: number[] = [];
    for (let k = 0; k < K; k++)
      for (let j = 0; j < J; j++) {
        const a = k * (J + 1) + j;
        const b = a + 1;
        const c = a + J + 1;
        const d = c + 1;
        front.push(a, b, c, b, d, c);
        back.push(V + a, V + c, V + b, V + b, V + c, V + d);
      }
    const edge: number[] = [];
    for (let e = 0; e < E; e++) {
      const n = (e + 1) % E;
      const t0 = 2 * V + e;
      const t1 = 2 * V + n;
      const b0 = 2 * V + E + e;
      const b1 = 2 * V + E + n;
      edge.push(t0, t1, b0, b0, t1, b1);
    }
    this.geometry.setAttribute("position", this.pos);
    this.geometry.setAttribute("normal", this.nor);
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    this.geometry.setIndex([...front, ...back, ...edge]);
    this.geometry.addGroup(0, front.length, 0);
    this.geometry.addGroup(front.length, back.length, 1);
    this.geometry.addGroup(front.length + back.length, edge.length, 2);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  }

  /** Rebuild the solid for a pose. Returns false when nothing changed. */
  update(p: SheetPose) {
    const key = `${p.ox.toFixed(5)},${p.oy.toFixed(5)},${p.base.toFixed(5)},${p.lift.toFixed(5)},${p.bend.toFixed(5)},${p.twist.toFixed(5)},${p.lo.toFixed(4)},${p.hi.toFixed(4)}`;
    if (key === this.last) return false;
    this.last = key;

    const { length: L, ramp, flex, thickness: t } = this.shape;
    const K = this.K;
    const J = this.J;
    const s = this.s;
    const mid = this.mid;
    const sf = flex * L;
    const cockle = this.shape.cockle ?? 0;
    const seed = this.shape.seed ?? 0;

    for (let j = 0; j <= J; j++) {
      const zn = (2 * j) / J - 1;
      let x = p.ox;
      let y = p.oy;
      let phiPrev = 0;
      for (let k = 0; k <= K; k++) {
        const i = (k * (J + 1) + j) * 3;
        if (k > 0) {
          const sm = 0.5 * (s[k] + s[k - 1]);
          const phi = this.angle(sm, zn, p, L, ramp, sf);
          const ds = s[k] - s[k - 1];
          x += Math.cos(phi) * ds;
          y += Math.sin(phi) * ds;
          phiPrev = phi;
        } else phiPrev = this.angle(0, zn, p, L, ramp, sf);
        const z = -this.zmax[k] + (2 * this.zmax[k] * j) / J;
        let dx = 0;
        let dy = 0;
        if (cockle > 0 && s[k] > ramp * 0.5) {
          // Paper is never perfectly flat: a faint ripple that only lifts.
          const w = Math.sin(s[k] * 1.7 + z * 0.55 + seed) * Math.sin(z * 1.1 - s[k] * 0.45 + seed * 1.3);
          const d = cockle * (0.5 + 0.5 * w) * Math.min(1, (s[k] - ramp * 0.5) / ramp);
          dx = -Math.sin(phiPrev) * d;
          dy = Math.cos(phiPrev) * d;
        }
        mid[i] = x + dx;
        mid[i + 1] = y + dy;
        mid[i + 2] = z;
      }
    }

    // Surface normals from the grid.
    const nrm = this.nrm;
    const at = (k: number, j: number) => (k * (J + 1) + j) * 3;
    for (let k = 0; k <= K; k++)
      for (let j = 0; j <= J; j++) {
        const a = at(Math.min(K, k + 1), j);
        const b = at(Math.max(0, k - 1), j);
        const c = at(k, Math.min(J, j + 1));
        const d = at(k, Math.max(0, j - 1));
        const sx = mid[a] - mid[b];
        const sy = mid[a + 1] - mid[b + 1];
        const sz = mid[a + 2] - mid[b + 2];
        const zx = mid[c] - mid[d];
        const zy = mid[c + 1] - mid[d + 1];
        const zz = mid[c + 2] - mid[d + 2];
        let nx = zy * sz - zz * sy;
        let ny = zz * sx - zx * sz;
        let nz = zx * sy - zy * sx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        const i = at(k, j);
        nrm[i] = nx;
        nrm[i + 1] = ny;
        nrm[i + 2] = nz;
      }

    const P = this.pos.array as Float32Array;
    const N = this.nor.array as Float32Array;
    const V = (K + 1) * (J + 1);
    const h = t / 2;
    for (let v = 0; v < V; v++) {
      const i = v * 3;
      const o = (V + v) * 3;
      P[i] = mid[i] + nrm[i] * h;
      P[i + 1] = mid[i + 1] + nrm[i + 1] * h;
      P[i + 2] = mid[i + 2] + nrm[i + 2] * h;
      N[i] = nrm[i];
      N[i + 1] = nrm[i + 1];
      N[i + 2] = nrm[i + 2];
      P[o] = mid[i] - nrm[i] * h;
      P[o + 1] = mid[i + 1] - nrm[i + 1] * h;
      P[o + 2] = mid[i + 2] - nrm[i + 2] * h;
      N[o] = -nrm[i];
      N[o + 1] = -nrm[i + 1];
      N[o + 2] = -nrm[i + 2];
    }

    // Edge band: outward normals lie in the sheet's plane, across the boundary.
    const loop = this.loop;
    const E = loop.length;
    for (let e = 0; e < E; e++) {
      const [k, j] = loop[e];
      const [kp, jp] = loop[(e - 1 + E) % E];
      const [kn, jn] = loop[(e + 1) % E];
      const i = at(k, j);
      const a = at(kn, jn);
      const b = at(kp, jp);
      const tx = mid[a] - mid[b];
      const ty = mid[a + 1] - mid[b + 1];
      const tz = mid[a + 2] - mid[b + 2];
      const nx = nrm[i];
      const ny = nrm[i + 1];
      const nz = nrm[i + 2];
      // The loop runs the same way round every sheet, so normal x tangent points outward.
      let ox = ny * tz - nz * ty;
      let oy = nz * tx - nx * tz;
      let oz = nx * ty - ny * tx;
      const l = Math.hypot(ox, oy, oz) || 1;
      ox /= l;
      oy /= l;
      oz /= l;
      for (const [slot, sign] of [[2 * V + e, 1], [2 * V + E + e, -1]] as const) {
        const q = slot * 3;
        P[q] = mid[i] + nx * h * sign;
        P[q + 1] = mid[i + 1] + ny * h * sign;
        P[q + 2] = mid[i + 2] + nz * h * sign;
        N[q] = ox;
        N[q + 1] = oy;
        N[q + 2] = oz;
      }
    }
    this.pos.needsUpdate = true;
    this.nor.needsUpdate = true;
    return true;
  }

  /** Tangent angle at arc length s for a row at normalised height zn. */
  private angle(s: number, zn: number, p: SheetPose, L: number, ramp: number, sf: number) {
    const r = s < ramp ? (1 - s / ramp) ** 2 : 0;
    const u = s <= sf ? 0 : Math.min(1, (s - sf) / (L - sf));
    // A sheet held by its edge curves most near the hinge, like a cantilever.
    const g = u * (2 - u);
    let phi = p.base + p.lift * r + (p.bend + p.twist * zn) * g;
    const lo = p.lo * r;
    const hi = Math.PI - p.hi * r;
    if (phi < lo) phi = lo;
    if (phi > hi) phi = hi;
    return phi;
  }

  dispose() {
    this.geometry.dispose();
  }
}

/** Angle at the stitch that makes a sheet climb `rise` over `ramp` (the r(s) profile above). */
export function gutterLift(rise: number, ramp: number) {
  if (rise <= 0) return 0;
  const climb = (a: number) => {
    let sum = 0;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const u = 1 - (i + 0.5) / n;
      sum += Math.sin(a * u * u);
    }
    return (sum / n) * ramp;
  };
  // Small rises are nearly linear; steep ones (the cover wrapping the spine) need solving.
  let a = (3 * rise) / ramp;
  if (a < 0.3) return a;
  let lo = 0;
  let hi = 2.6;
  for (let i = 0; i < 28; i++) {
    a = (lo + hi) / 2;
    if (climb(a) < rise) lo = a;
    else hi = a;
  }
  return a;
}

/** Horizontal distance a sheet covers while climbing the gutter with lift a. */
export function gutterRun(a: number, ramp: number) {
  let sum = 0;
  const n = 24;
  for (let i = 0; i < n; i++) {
    const u = 1 - (i + 0.5) / n;
    sum += Math.cos(a * u * u);
  }
  return (sum / n) * ramp;
}
