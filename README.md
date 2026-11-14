# James Harcourt Portfolio

Next.js, TypeScript, React, Tailwind CSS, Notra UI and Three.js. Includes an Equilibrium overview, an interactive GlucoBit PCB, a GitHub contribution calendar that can include private repositories, and a printable résumé at `/resume`.

## Local development

```sh
npm install
npm run dev
```

## Portfolio content

Edit `lib/data.ts` for Equilibrium, projects, experience, awards, education, skills and contact links. The home page and résumé use the same facts; set `resume: true` on a project to list it on the résumé. The November 2026 update drew on James's public LinkedIn headline and posts, [equilibrium.ie](https://equilibrium.ie) and Castleknock College's Young Scientist announcement. LinkedIn blocks automated access to the full profile, so roles and dates not confirmed by those sources were not added. The résumé lists only substantive projects; smaller GitHub experiments stay off it.

Project descriptions were checked against the public READMEs for [CertifyMe](https://github.com/jdharcourt/CertifyMe), [Gate Lab](https://github.com/jdharcourt/gate-lab), [CodePaper](https://github.com/jdharcourt/CodePaper), [ytascii](https://github.com/jdharcourt/ytascii) and [Zana](https://github.com/jdharcourt/zana), on 8 October 2026.

## Chat API

The terminal interface has been removed. The existing `/api/chat` endpoint remains available when configured with `OPENROUTER_API_KEY` in the server environment.

The chat route checks same-origin requests, uses signed CSRF tokens and HttpOnly cookies, validates roles and body size, and times out upstream requests. `proxy.ts` sets a nonce-based CSP and security headers. Next.js generates its own nonce-authorized bootstrap scripts; application code does not add inline scripts. Inline styles remain allowed for React and the Three.js canvas. Production requires HTTPS.

API rate limits apply per server instance. Chat has limits of 6 requests per minute and 60 per hour per IP, plus 200 per hour globally per instance. Deploy behind a proxy that overwrites `X-Forwarded-For`. For multiple replicas, replace the in-memory limiter with a shared store. Use a dedicated OpenRouter key with a spending cap to bound billing across replicas.

## Contributions

`/api/contributions?year=2026` returns daily counts, intensity levels and summary stats (active days, longest streak, best day), cached for one hour.

To include private work, set `GITHUB_TOKEN` in the server environment (for example in Vercel project settings) to a token owned by `jdharcourt`: a classic token with the `read:user` and `repo` scopes, or a fine-grained token with read access to all repositories. The route then uses GitHub's GraphQL API, which counts private contributions and reports how many were to private repositories. Only counts are shown, never repository names. Without a token, or if the API fails, it falls back to the public profile calendar. That calendar also includes private counts if "Include private contributions on my profile" is turned on in GitHub settings.

Hover a day for a tooltip, or focus the grid and use the arrow keys. Loading and upstream failures are shown with a retry action. The card header says where the numbers came from: "Public + private repos" (API) or "Public profile" (fallback). If the live site shows "Public profile", `GITHUB_TOKEN` is missing or invalid in the deployment, and you need to redeploy after adding it.

## Design and UI

The retro "lab notebook" design (paper, ink, signal orange; Instrument Serif, IBM Plex Sans and Mono) was drafted in Paper first. Styling uses Tailwind CSS v4 with [Notra UI](https://ui.usenotra.com) components installed through the shadcn registry: `components/button`, `components/select` and `components/tooltip`. Their colours come from the CSS variables at the top of `app/globals.css`.

## PCB

The GlucoBit project includes the interactive circuit board preview, using the original materials in `public/glucobit-v2.glb`. When idle it turns slowly on a turntable. Dragging rotates it with eased inertia, the arrow keys also rotate it, and tilt is clamped. Reset eases back to the front view, and wireframe mode is available. The turntable pauses on hover and stays off when reduced motion is preferred. Rendering stops outside the viewport, in hidden tabs, and whenever the board is still.

## Validation

```sh
npm test
npm run build
```

The résumé's print button opens the browser print dialog. Choose Save as PDF. Print styles remove navigation and controls and keep individual experience entries together.
