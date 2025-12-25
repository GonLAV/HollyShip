# HollyShip (React)

## Product spec

- See [docs/PRODUCT_BLUEPRINT.md](docs/PRODUCT_BLUEPRINT.md)
- See [docs/PRODUCT_BLUEPRINT_V2.md](docs/PRODUCT_BLUEPRINT_V2.md)

## Run locally

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## Backend (API)

- Start infra: `docker compose up -d`
- Install backend deps: `cd Hollybackend && npm install`
- Create env: `cp .env.example .env`
- Generate Prisma client: `npm run prisma:generate`
- Run migrations: `npm run prisma:migrate`
- Start API (dev): `npm run dev`

API docs (Swagger UI): `http://localhost:8080/docs`