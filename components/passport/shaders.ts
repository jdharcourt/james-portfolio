// GLSL for the passport scene. Everything is lit by hand (one key light plus a
// sky/ground ambient) so no environment maps or shadow maps are allocated.

const noise = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
`;

const lightPars = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uLightCol;
vec3 ambient(vec3 n) {
  return mix(vec3(0.16, 0.14, 0.13), vec3(0.34, 0.34, 0.36), n.y * 0.5 + 0.5);
}
`;

const archPars = /* glsl */ `
uniform float uArch;
uniform float uW;
uniform float uH;
// Pages rise out of the gutter and flatten towards the fore-edge.
float archY(float s) {
  return uArch * sin(clamp(s / (uW * 0.34), 0.0, 1.0) * 1.5707963);
}
`;

export const LEAF_VS = /* glsl */ `
uniform float uP;     // 0 = resting on the right, 1 = resting on the left
uniform float uBend;  // total curl across the page, radians
uniform float uTwist; // extra turn of the top edge over the bottom edge, radians
uniform float uHinge;
uniform float uLift;
uniform float uRest;
${archPars}
varying vec2 vUv;
varying vec3 vN;
varying vec3 vPos;
varying float vBookX;

vec3 leaf(float s, float z) {
  float k = uBend / uW;
  // Never let the hinge end dip into the stack it is leaving or landing on.
  float th0 = clamp(3.14159265 * uP - 0.5 * uBend + uTwist * (z / uH), 0.0, 3.14159265);
  float th = th0 + k * s;
  vec2 c = abs(k) < 1e-4 ? vec2(s * cos(th0), s * sin(th0))
                         : vec2(sin(th) - sin(th0), cos(th0) - cos(th)) / k;
  vec3 p = vec3(c.x, c.y + uHinge, z);
  p.y += archY(s) * (1.0 - sin(3.14159265 * uP)) * uRest;
  return p;
}

void main() {
  float s = position.x;
  float z = position.z;
  vec3 p = leaf(s, z);
  float e = 0.02;
  vec3 ds = leaf(s + e, z) - leaf(max(s - e, 0.0), z);
  vec3 dz = leaf(s, z + e) - leaf(s, z - e);
  vec3 n = normalize(cross(dz, ds));
  p += n * uLift;
  vUv = vec2(s / uW, (z + uH * 0.5) / uH);
  vBookX = p.x;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const PAGE_FS = /* glsl */ `
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform float uHasFront;
uniform float uHasBack;
uniform vec3 uTintFront;
uniform vec3 uTintBack;
uniform float uHoloFront;
uniform float uHoloBack;
uniform float uFaceFront;
uniform float uFaceBack;
uniform float uSelf;
uniform float uW;
uniform float uH;
uniform vec4 uTurn;
uniform vec4 uHover;
uniform float uHoverFace;
uniform vec3 uOvd;
${lightPars}
${noise}
varying vec2 vUv;
varying vec3 vN;
varying vec3 vPos;
varying float vBookX;

void main() {
  vec2 q = vec2(vUv.x * uW, vUv.y * uH);
  bool front = gl_FrontFacing;
  vec2 uv = front ? vUv : vec2(1.0 - vUv.x, vUv.y);
  vec3 alb = front
    ? (uHasFront > 0.5 ? texture2D(uFront, uv).rgb : uTintFront)
    : (uHasBack > 0.5 ? texture2D(uBack, uv).rgb : uTintBack);
  float face = front ? uFaceFront : uFaceBack;
  float holo = front ? uHoloFront : uHoloBack;

  vec3 n = normalize(vN) * (front ? 1.0 : -1.0);
  vec3 V = normalize(cameraPosition - vPos);
  vec3 L = normalize(uLightDir);

  // Paper fibre and tooth; the finest layer fades out before it can shimmer.
  float fw = length(fwidth(q));
  float tooth = mix(vnoise(q * 90.0), 0.5, smoothstep(0.004, 0.012, fw));
  float fib = fbm(q * vec2(26.0, 9.0)) * 0.6 + tooth * 0.4;
  alb *= 0.955 + 0.07 * fib;

  // Hovered link: a faint ink bloom instead of an underline.
  if (abs(face - uHoverFace) < 0.5 && uv.x > uHover.x && uv.x < uHover.z && uv.y > uHover.y && uv.y < uHover.w) {
    alb = mix(alb, alb * vec3(0.78, 0.86, 1.08), 0.55);
  }

  float ndl = dot(n, L);
  float diff = clamp((ndl + 0.25) / 1.25, 0.0, 1.0);
  float ao = mix(0.58, 1.0, smoothstep(0.0, 0.16, vUv.x)) * mix(0.86, 1.0, smoothstep(0.0, 0.025, 1.0 - vUv.x));
  vec3 col = alb * (ambient(n) * 1.25 + uLightCol * diff * 0.95) * ao;
  vec3 hv = normalize(L + V);
  // Soft satin sheen that slides across the paper as the passport tilts.
  col += uLightCol * 0.05 * pow(max(dot(n, hv), 0.0), 18.0);

  // Laminated data page: thin-film rainbow that shifts with the view and light.
  if (holo > 0.5) {
    vec2 hp = q;
    float pat = sin(hp.x * 7.0 + sin(hp.y * 5.0) * 1.7) * sin(hp.y * 9.0 + cos(hp.x * 4.0) * 1.3);
    float phase = dot(V, vec3(1.7, 0.6, 1.3)) + L.x * 0.9 + L.z * 0.6 + pat * 0.22 + hp.y * 0.05;
    vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));
    float glint = pow(max(dot(n, hv), 0.0), 6.0);
    float ovd = 1.0 - smoothstep(uOvd.z * 0.6, uOvd.z, length((uv - uOvd.xy) * vec2(uW, uH)));
    float amt = (0.05 + 0.1 * smoothstep(0.1, 0.9, pat * 0.5 + 0.5)) * (0.4 + glint) + ovd * (0.16 + 0.5 * glint);
    col += rainbow * amt * 0.42;
    col += uLightCol * 0.06 * pow(max(dot(n, hv), 0.0), 60.0);
  }

  // Soft shadow from a page that is mid-turn above this one.
  if (uSelf < 0.5 && uTurn.y > 0.0) {
    float c = cos(3.14159265 * uTurn.x);
    float lift = sin(3.14159265 * uTurn.x);
    float side = c >= 0.0 ? 1.0 : -1.0;
    float bx = vBookX * side;
    if (bx > 0.0) {
      float d = bx - abs(c) * uW;
      float sh = (1.0 - smoothstep(-0.3, 0.5 + 2.2 * lift, d)) * lift;
      col *= 1.0 - 0.38 * sh * uTurn.y;
    }
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const COVER_VS = /* glsl */ `
varying vec3 vLocal;
varying vec3 vLN;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
void main() {
  vLocal = position;
  vLN = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * normal);
  vT = normalize(m * vec3(1.0, 0.0, 0.0));
  vB = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const COVER_FS = /* glsl */ `
uniform sampler2D uFoil;
uniform float uFoilOn;
uniform vec4 uRect;
uniform vec2 uTexel;
${lightPars}
${noise}
varying vec3 vLocal;
varying vec3 vLN;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;

// Pebbled leather: smooth cellular bumps.
float grain(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(hash12(i + g), hash12(i + g + 19.7));
      d = min(d, length(g + o - f));
    }
  return 1.0 - smoothstep(0.0, 0.9, d);
}

void main() {
  vec2 uv = vec2((vLocal.x - uRect.x) / uRect.z, (vLocal.z - uRect.y) / uRect.w);
  vec3 n = normalize(vN);
  vec3 V = normalize(cameraPosition - vPos);
  vec3 L = normalize(uLightDir);
  bool cap = abs(vLN.y) > 0.5;
  float capSign = sign(vLN.y);

  vec2 gp = vec2(vLocal.x, vLocal.z) * 11.0;
  // Fade the pebble relief once a cell is smaller than a couple of pixels.
  float relief = 1.0 - smoothstep(0.25, 0.6, length(fwidth(gp)));
  float g0 = grain(gp);
  float mottling = fbm(gp * 0.12);
  vec3 tint = vec3(0.078, 0.0115, 0.024) * (0.9 + 0.22 * mottling);
  if (cap) {
    float e = 0.08;
    float gx = grain(gp + vec2(e, 0.0)) - g0;
    float gz = grain(gp + vec2(0.0, e)) - g0;
    n = normalize(n - (vT * gx + vB * gz) * 1.6 * capSign * relief);
  }

  float foil = 0.0;
  if (cap && capSign > 0.0 && uFoilOn > 0.5) {
    foil = texture2D(uFoil, uv).r;
    float hx = texture2D(uFoil, uv + vec2(uTexel.x * 2.5, 0.0)).r - texture2D(uFoil, uv - vec2(uTexel.x * 2.5, 0.0)).r;
    float hz = texture2D(uFoil, uv + vec2(0.0, uTexel.y * 2.5)).r - texture2D(uFoil, uv - vec2(0.0, uTexel.y * 2.5)).r;
    // Hot-foil stamping presses the gold slightly into the leather.
    n = normalize(n + (vT * hx + vB * hz) * 0.9);
  }

  vec3 hv = normalize(L + V);
  float ndl = dot(n, L);
  float ndh = max(dot(n, hv), 0.0);
  float diff = clamp((ndl + 0.2) / 1.2, 0.0, 1.0);
  vec3 leather = tint * (ambient(n) * 1.6 + uLightCol * diff * 1.15);
  leather += uLightCol * (0.05 + 0.05 * g0 * relief) * pow(ndh, 14.0);
  leather += vec3(0.02, 0.006, 0.01) * pow(1.0 - max(dot(n, V), 0.0), 3.0);
  // Board edges: the leather turns over a rounded edge and darkens slightly.
  if (!cap) leather *= 0.78;

  vec3 col = leather;
  if (foil > 0.002) {
    vec3 R = reflect(-V, n);
    float env = smoothstep(-0.2, 0.9, R.y * 0.55 + dot(R, normalize(vec3(-0.5, 0.45, -0.7))) * 0.75);
    vec3 gold = vec3(0.98, 0.66, 0.26);
    vec3 metal = gold * (0.1 + 0.75 * env + 0.45 * diff)
               + vec3(1.0, 0.86, 0.6) * pow(ndh, 70.0) * 2.6
               + gold * pow(ndh, 9.0) * 0.45;
    metal *= 0.9 + 0.12 * vnoise(gp * 3.0);
    col = mix(leather, metal, foil);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const BLOCK_VS = /* glsl */ `
uniform float uSide;
uniform float uY0;
uniform float uY1;
${archPars}
varying vec3 vPos;
varying vec3 vN;
varying float vT;
void main() {
  float s = position.x;
  float t = position.z;
  vec3 p = vec3(uSide * s, mix(uY0, uY1, t), position.y);
  if (t > 0.5) p.y += archY(s);
  vT = t;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * vec3(uSide * normal.x, normal.z, normal.y));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const BLOCK_FS = /* glsl */ `
uniform float uY0;
uniform float uY1;
uniform float uLeaf;
${lightPars}
varying vec3 vPos;
varying vec3 vN;
varying float vT;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(uLightDir);
  // One fine line per leaf, blended to an even tone once lines get sub-pixel.
  float leaves = max((uY1 - uY0) / uLeaf, 1.0);
  float f = vT * leaves;
  float w = fwidth(f);
  float e = abs(fract(f) - 0.5) * 2.0; // 0 mid-leaf, 1 at the seam between leaves
  float line = smoothstep(0.55 - w, 1.0, e);
  float stripe = mix(1.0 - 0.16 * line, 0.94, smoothstep(0.35, 0.9, w));
  vec3 paper = vec3(0.8, 0.77, 0.7) * stripe;
  float diff = clamp((dot(n, L) + 0.3) / 1.3, 0.0, 1.0);
  vec3 col = paper * (ambient(n) * 1.3 + uLightCol * diff * 0.8);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const DESK_VS = /* glsl */ `
varying vec3 vPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const DESK_FS = /* glsl */ `
uniform sampler2D uFelt;
uniform mat4 uBookInv;
uniform vec4 uFoot;
uniform float uHover;
${lightPars}
${noise}
varying vec3 vPos;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vPos.xz;
  // Felt: a pre-baked fibre tile at two scales, plus broad mottling.
  float fine = texture2D(uFelt, p / 5.0).r;
  float coarse = texture2D(uFelt, p / 13.0 + 0.37).r;
  float broad = vnoise(p * 0.3) * 0.6 + vnoise(p * 0.9 + 3.1) * 0.4;
  vec3 base = vec3(0.05, 0.042, 0.034) * (0.78 + 0.32 * broad) * (0.72 + 0.56 * mix(fine, coarse, 0.35));

  // Warm pool of light falling off towards the edges of the frame.
  float d = length(p - vec2(-2.5, -4.0));
  float pool = 0.5 + 1.05 * exp(-d * d / 320.0);

  // Follow the light up to the floating passport to find its shadow.
  vec3 L = normalize(uLightDir);
  vec3 hit = vPos + L * (uHover / max(L.y, 0.2));
  vec3 b = (uBookInv * vec4(hit, 1.0)).xyz;
  vec2 c = vec2(uFoot.x + uFoot.y, uFoot.z + uFoot.w) * 0.5;
  vec2 hs = vec2(uFoot.y - uFoot.x, uFoot.w - uFoot.z) * 0.5;
  float sd = sdRoundBox(b.xz - c, hs, 0.45);
  float blur = 0.6 + uHover * 2.2;
  float soft = 1.0 - smoothstep(-blur * 0.6, blur, sd);
  float shade = 1.0 - (0.62 - 0.12 * clamp(uHover, 0.0, 1.0)) * soft;

  vec3 col = base * pool * shade * (vec3(0.9, 0.86, 0.8) + uLightCol * 0.25);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
