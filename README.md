# James Harcourt Portfolio

Next.js, TypeScript, React, Tailwind CSS, Notra UI and Three.js. The home page is an Irish passport rendered in WebGL that you open and page through; the printable résumé is at `/resume`.

## Local development

```sh
npm install
npm run dev
```

## Portfolio content

Edit `lib/data.ts` for Equilibrium, projects, experience, awards, education, skills and contact links. The home page and résumé use the same facts; set `resume: true` on a project to list it on the résumé. The November 2026 update drew on James's public LinkedIn headline and posts, [equilibrium.ie](https://equilibrium.ie) and Castleknock College's Young Scientist announcement. LinkedIn blocks automated access to the full profile, so roles and dates not confirmed by those sources were not added. The résumé lists only substantive projects; smaller GitHub experiments stay off it.

Project descriptions were checked against the public READMEs for [Gate Lab](https://github.com/jdharcourt/gate-lab), [CodePaper](https://github.com/jdharcourt/CodePaper), [ytascii](https://github.com/jdharcourt/ytascii) and [Zana](https://github.com/jdharcourt/zana), on 8 October 2026.

## Chat API

The terminal interface has been removed. The existing `/api/chat` endpoint remains available when configured with `OPENROUTER_API_KEY` in the server environment.

The chat route checks same-origin requests, uses signed CSRF tokens and HttpOnly cookies, validates roles and body size, and times out upstream requests. `proxy.ts` sets a nonce-based CSP and security headers. Next.js generates its own nonce-authorized bootstrap scripts; application code does not add inline scripts. Inline styles remain allowed for React and the Three.js canvas. Production requires HTTPS.

API rate limits apply per server instance. Chat has limits of 6 requests per minute and 60 per hour per IP, plus 200 per hour globally per instance. Deploy behind a proxy that overwrites `X-Forwarded-For`. For multiple replicas, replace the in-memory limiter with a shared store. Use a dedicated OpenRouter key with a spending cap to bound billing across replicas.

## Contributions

`/api/contributions?year=2026` returns daily counts, intensity levels and summary stats (active days, longest streak, best day), cached for one hour.

To include private work, set `GITHUB_TOKEN` in the server environment (for example in Vercel project settings) to a token owned by `jdharcourt`: a classic token with the `read:user` and `repo` scopes, or a fine-grained token with read access to all repositories. The route then uses GitHub's GraphQL API, which counts private contributions and reports how many were to private repositories. Only counts are shown, never repository names. Without a token, or if the API fails, it falls back to the public profile calendar. That calendar also includes private counts if "Include private contributions on my profile" is turned on in GitHub settings.

The home page no longer shows the contribution calendar; the endpoint is kept for future use.

## Design and UI

The home page follows the idea of [emad.gg](https://emad.gg): a passport on a desk that opens into a portfolio. Here it is an Irish passport, with a burgundy pebbled-leather cover, gold-foil harp and lettering, a sideways data page with a holographic laminate, perforated document number, bilingual Irish/English labels, rubber stamps and engraved Irish landmarks on every page.

- `components/passport/scene.ts` builds the book in Three.js: covers, page leaves, page-block edges and desk. Pages bend in a vertex shader; leather, foil, paper, laminate and desk are hand-written fragment shaders, so there are no environment or shadow maps.
- `components/passport/pages.ts` lays out each page from `lib/data.ts` and draws it with Canvas 2D (`art.ts` holds the harp, stamps and illustrations). Links are hit-tested on the page itself and tinted on hover rather than underlined.
- Rendering is on demand: nothing is drawn while the passport is idle. Only the six page textures nearest the open spread are kept on the GPU (768 px wide on small screens, 1024 px otherwise), the cover foil is a single-channel texture, and the drawing buffer is capped at about 3 megapixels.
- Click or tap to open, drag or swipe to turn, arrow keys, Home, End and Escape also work. Phones show one page at a time. Section shortcuts appear on keyboard focus, and the same content is in the page as plain HTML for screen readers and for browsers without WebGL.

The résumé keeps the earlier "lab notebook" look (Instrument Serif, IBM Plex Sans and Mono) with [Notra UI](https://ui.usenotra.com) components installed through the shadcn registry.

## Validation

```sh
npm test
npm run build
```

The résumé's print button opens the browser print dialog. Choose Save as PDF. Print styles remove navigation and controls and keep individual experience entries together.
