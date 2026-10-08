# James Harcourt Portfolio

Next.js, TypeScript, React and Three.js. Includes an interactive GlucoBit PCB, slash-command terminal, live GitHub contribution calendar, light/dark themes and a printable résumé at `/resume`.

## Local development

```sh
npm install
npm run dev
```

## Portfolio content

Edit `lib/data.ts` for projects, experience, skills, biography and contact links. The home page, résumé and assistant use the same facts. Original content is retained, with updated public GitHub projects and Equilibrium work confirmed by [public LinkedIn posts](https://ie.linkedin.com/company/equilibriumhvac/). The full personal LinkedIn profile was inaccessible during this update; unverified roles and dates have not been added.

Project descriptions were checked against the public READMEs for [CertifyMe](https://github.com/jdharcourt/CertifyMe), [Gate Lab](https://github.com/jdharcourt/gate-lab), [CodePaper](https://github.com/jdharcourt/CodePaper), [ytascii](https://github.com/jdharcourt/ytascii) and [Zana](https://github.com/jdharcourt/zana), on 8 October 2026.

## Terminal

`/help`, `/commands`, `/about`, `/projects`, `/skills`, `/resume`, `/github`, `/contact`, `/clear` work without any API key. Use Up/Down for command history and Tab to complete an unambiguous slash command.

`/ask What did James build for GlucoBit?` uses OpenRouter when configured. Copy `.env.example` to `.env.local` and set `OPENROUTER_API_KEY`, or add it to your hosting provider's server environment. Never use a `NEXT_PUBLIC_` API key. Restart the server after changing environment variables.

The default model is `qwen/qwen3.7-flash`, verified against the [OpenRouter model catalog](https://openrouter.ai/api/v1/models) on 8 October 2026. Set `OPENROUTER_MODEL` to another available chat model. Responses are limited to 700 tokens and grounded in portfolio data. Optional reasoning is disabled to keep these short answers within the output budget. Questions and recent AI conversation history are sent to OpenRouter only with `/ask`; the application does not persist transcripts.

The chat route checks same-origin requests, uses signed CSRF tokens and HttpOnly cookies, validates roles and body size, and times out upstream requests. `proxy.ts` sets a nonce-based CSP and security headers. Next.js generates its own nonce-authorized bootstrap scripts; application code does not add inline scripts. Inline styles remain allowed for React and the Three.js canvas. Production requires HTTPS.

API rate limits apply per server instance. Chat has limits of 6 requests per minute and 60 per hour per IP, plus 200 per hour globally per instance. Deploy behind a proxy that overwrites `X-Forwarded-For`. For multiple replicas, replace the in-memory limiter with a shared store. Use a dedicated OpenRouter key with a spending cap to bound billing across replicas.

## Contributions

`/api/contributions?year=2026` reads the public GitHub calendar for `jdharcourt`, caches it for one hour, and provides daily counts and intensity levels. No GitHub token is needed. Counts follow GitHub's public profile visibility. Select a year, hover or tap a day, or use arrow keys after focusing a day. The activity link follows the selected date. Loading and upstream failures are displayed explicitly, with a retry action.

## PCB

The existing `public/glucobit-v2.glb` keeps its original materials. Page scroll rotates it; pointer dragging and arrow keys offer manual inspection. Wireframe and reset controls are available. Rendering pauses outside the viewport or in a hidden tab. Reduced-motion preferences disable scroll rotation.

## Validation

```sh
npm test
npm run build
```

The résumé's print button opens the browser print dialog. Choose Save as PDF. Print styles remove navigation and controls and keep individual experience entries together.
