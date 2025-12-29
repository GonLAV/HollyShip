# HollyFrontend

A minimal Vite + React + TypeScript frontend that renders "HollyShip — 100 Feature Ideas" with a simple search.

## Scripts

- `npm run dev` — start the dev server on http://localhost:5173
- `npm run build` — build for production into `dist/`
- `npm run preview` — preview the production build locally
- `npm run test` — run unit tests (Vitest + Testing Library)

## Getting started

```bash
cd HollyFrontend
npm install
npm run dev
```

Then open the printed URL. The main UI is in `src/App.tsx`.

## Configuration

- Env file: copy `.env.example` to `.env.local` and adjust values as needed.
- `VITE_API_BASE_URL`: base URL for the backend API (defaults to `http://localhost:8080`).
	The app reads this via `src/config.ts`.

## API client

- Reusable client lives in `src/api/api.ts` with types in `src/api/types.ts`.
- Import the singleton `api` and call, e.g.:

```ts
import { api } from './api/api'

const res = await api.listShipments({ limit: 10 })
console.log(res.items)
```

## Accessibility and theming
- Skip link, visible focus outlines, semantic header/main/footer.
- Theme toggle (light/dark) with CSS variables and localStorage.

## Dev proxy
- Vite proxies `/health` and `/v1/*` to `VITE_API_BASE_URL` during `dev`/`preview`.

## CI
- GitHub Actions workflow at `.github/workflows/frontend-ci.yml` builds and tests on pushes/PRs affecting `HollyFrontend`.
