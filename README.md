# James Harcourt Portfolio

Next.js, TypeScript, React, Tailwind CSS, Notra UI and Three.js. The home page is an Irish passport rendered in WebGL that you open and page through; the one-page résumé, with a PDF download, is at `/resume`.

## Local development

```sh
npm install
npm run dev
```

## Portfolio content

Edit `lib/data.ts` for Equilibrium, projects, experience, awards, education, skills and contact links. The home page and résumé use the same facts; set `resume: true` on a project to list it on the résumé. The November 2026 update drew on James's public LinkedIn headline and posts, [equilibrium.ie](https://equilibrium.ie) and Castleknock College's Young Scientist announcement. LinkedIn blocks automated access to the full profile, so roles and dates not confirmed by those sources were not added. The résumé lists only substantive projects; smaller GitHub experiments stay off it.

Project descriptions were checked against the public READMEs for [Wisprsight](https://github.com/jdharcourt/wisprsight) and [UniCAD Kit](https://github.com/TryUniCAD/Kit) on 17 November 2026.

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

- `components/passport/scene.ts` builds the book in Three.js: covers, the polycarbonate data card and 16 paper leaves of a real 34-page booklet, page-block edges and a felt desk. Every leaf is a thin solid (`sheet.ts`) whose vertices are re-bent each frame, so pages lift at the gutter, curl and twist as they turn. `materials.ts` holds physically based leather with gold foil, matte paper, a satin laminate with a holographic patch, and the felt, all lit by a generated room environment and one warm spotlight that casts real soft shadows onto the pages and desk.
- `components/passport/pages.ts` lays out each page from `lib/data.ts` and draws it with Canvas 2D (`art.ts` holds the harp, stamps and illustrations). Content pages come first; the rest of the booklet is blank visa pages that share one texture per side. `components/passport/sections.ts` sets the page order. Links are hit-tested on the page itself and tinted on hover rather than underlined.
- The passport lies on the desk, tilts towards the cursor (or a phone's gyroscope) and sways slightly when idle. Idle frames render at half rate, and the resolution steps down automatically on slow GPUs. With reduced motion, the sway and tilt are off and frames are only drawn on change.
- Only the six page textures nearest the open spread are kept on the GPU (768 px wide on small screens, 1024 px otherwise), the shadow map drops to 1024 px on small screens, and the drawing buffer is capped at about 2.2 megapixels.
- Click or tap to open, or drag the cover. Dragging a page curls it with the grabbed corner leading; a flick turns it from a short drag and a flick back cancels. Corners lift towards a nearby cursor. Arrow keys, Home, End and Escape also work. Phones show one page at a time. Section shortcuts appear on keyboard focus, and the same content is in the page as plain HTML for screen readers and for browsers without WebGL.

The résumé is a single A4 sheet in the same type (Instrument Serif, IBM Plex Sans and Mono), using [Notra UI](https://ui.usenotra.com) buttons from the shadcn registry. It leads with achievements, then experience, key projects, education and skills.

## Validation

```sh
npm test
npm run build
```

The résumé page offers the PDF in `public/james-harcourt-resume.pdf` as a download, printed from the page itself. After changing the résumé or its data, start the site and run `npm run resume:pdf` (set `RESUME_URL` if it is not on port 3000, and `CHROME` to your Chrome binary if `google-chrome` is not on the path), then check the PDF is still one page.
