# James Harcourt — Portfolio

Personal portfolio site built with **Next.js (App Router) + TypeScript**. Zero UI
libraries — hand-written CSS, system fonts via `next/font`, light/dark theme, scroll
reveals, and a marquee.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Framework preset is auto-detected as **Next.js** — no config needed. Click **Deploy**.

Or from the CLI:

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

## Edit content

All copy and project data live in [`lib/data.ts`](lib/data.ts). Update that file to add
projects, tools, or change links.
