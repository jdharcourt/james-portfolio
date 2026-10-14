# James Harcourt Portfolio

Next.js, TypeScript, React and Three.js. Includes an interactive GlucoBit PCB, live GitHub contribution calendar, plain white styling and a printable résumé at `/resume`.

## Local development

```sh
npm install
npm run dev
```

## Portfolio content

Edit `lib/data.ts` for projects, experience, skills, biography and contact links. The home page and résumé use the same facts. Original content is retained, with updated public GitHub projects and Equilibrium work confirmed by [public LinkedIn posts](https://ie.linkedin.com/company/equilibriumhvac/). The full personal LinkedIn profile was inaccessible during this update; unverified roles and dates have not been added.

Project descriptions were checked against the public READMEs for [CertifyMe](https://github.com/jdharcourt/CertifyMe), [Gate Lab](https://github.com/jdharcourt/gate-lab), [CodePaper](https://github.com/jdharcourt/CodePaper), [ytascii](https://github.com/jdharcourt/ytascii) and [Zana](https://github.com/jdharcourt/zana), on 8 October 2026.

## Chat API

The terminal interface has been removed. The existing `/api/chat` endpoint remains available when configured with `OPENROUTER_API_KEY` in the server environment.

The chat route checks same-origin requests, uses signed CSRF tokens and HttpOnly cookies, validates roles and body size, and times out upstream requests. `proxy.ts` sets a nonce-based CSP and security headers. Next.js generates its own nonce-authorized bootstrap scripts; application code does not add inline scripts. Inline styles remain allowed for React and the Three.js canvas. Production requires HTTPS.

API rate limits apply per server instance. Chat has limits of 6 requests per minute and 60 per hour per IP, plus 200 per hour globally per instance. Deploy behind a proxy that overwrites `X-Forwarded-For`. For multiple replicas, replace the in-memory limiter with a shared store. Use a dedicated OpenRouter key with a spending cap to bound billing across replicas.

## Contributions

`/api/contributions?year=2026` reads the public GitHub calendar for `jdharcourt`, caches it for one hour, and provides daily counts and intensity levels. No GitHub token is needed. Counts follow GitHub's public profile visibility. Select a year and use the activity date field to view daily counts. The activity link follows the selected date. Loading and upstream failures are displayed explicitly, with a retry action.

## PCB

The GlucoBit project includes the interactive circuit board preview.

The existing `public/glucobit-v2.glb` keeps its original materials. Page scroll rotates it; pointer dragging and arrow keys offer manual inspection. Wireframe and reset controls are available. Rendering pauses outside the viewport or in a hidden tab. Reduced-motion preferences disable scroll rotation.

## Validation

```sh
npm test
npm run build
```

The résumé's print button opens the browser print dialog. Choose Save as PDF. Print styles remove navigation and controls and keep individual experience entries together.
