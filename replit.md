# N-MedHomeLab TWA

A Telegram Web App (TWA) for the N-MedHomeLab medical home analysis service. Users open the WebApp from the bot, complete a multi-step order wizard, then pay via card or Click — all within Telegram.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/medbot-webapp run dev` — run the React TWA (port 20952, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild composite libs (run after schema changes)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (provisioned automatically)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifact: `api-server`, port 8080)
- Frontend: React + Vite TWA (artifact: `medbot-webapp`, port 20952)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Map: Leaflet + react-leaflet (OSM tiles)
- State: Zustand
- Animations: Framer Motion

## Where things live

- `lib/db/src/schema/orders.ts` — orders table schema
- `lib/db/src/schema/settings.ts` — settings key/value table
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/medbot-webapp/src/components/wizard/` — 8-step wizard steps
- `artifacts/medbot-webapp/src/store/useOrderStore.ts` — Zustand order state
- `medBot_updated.py` — Updated Telegram bot with WebApp integration

## Architecture decisions

- Contract-first API: OpenAPI → Orval codegen → React Query hooks + Zod schemas
- Orders are created on the server when the TWA submits via `POST /api/orders`; the bot receives the `orderId` via `web_app_data`
- Payment flow: bot offers 2 options — "Admin orqali" (card screenshot) or "Click orqali" (payment URL + check button)
- District availability is configured via `allowed_region_ids` setting; IDs 4,11,13,15 are enabled by default
- All settings (price, card, Click URL, etc.) are stored in the `settings` table and editable via admin panel

## Product

- **Step 1**: Service selection (Kal tahlili — stool analysis)
- **Step 2**: Patient type (adult / child)
- **Step 3**: Patient info (name, age, gender)
- **Step 4**: Child timing (morning/afternoon/evening/irregular) — skipped for adults
- **Step 5**: Complaints multi-select checkboxes (10 options + custom)
- **Step 6**: Delivery time slot selection
- **Step 7**: Location — Leaflet map with district list, draggable pin, GPS
- **Step 8**: Confirmation popup with order summary + price
- Bot receives orderId → shows payment buttons → Admin card or Click URL

## User preferences

- Bot token: `7723160549:AAHm95Og2REAyYG0UjQKzaB8qvYj8rCDLnE`
- ADMIN_IDS: `[6194484795, 8161075408]`
- Default allowed districts: 4 (Zangiota), 11 (Yangiyol), 13 (Qibray), 15 (Toshkent tumani)
- Default service price: 150,000 UZS; pickup extra: 30,000 UZS
- 3 languages: Uzbek (uz), Russian (ru), English (en)

## Gotchas

- After adding new DB schema files, run `pnpm run typecheck:libs` before checking the api-server — the composite lib must be rebuilt for exports to appear.
- The `medBot_updated.py` has `WEBAPP_URL = "https://your-medbot-webapp.replit.app/"` — replace with the actual deployed URL before running the bot.
- The Click payment check is simulated (2nd tap confirms) — replace with real Click API in production.
- Bot uses SQLite (`medbot.db`) locally; the API server uses PostgreSQL.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/`
