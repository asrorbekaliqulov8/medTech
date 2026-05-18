# N-MedHomeLab — Run & Deploy Guide

## Prerequisites

- Node.js 24 (via Replit, auto-managed)
- pnpm workspaces (auto-managed)
- PostgreSQL (Replit built-in, `DATABASE_URL` provisioned automatically)
- Telegram Bot Token in the `TELEGRAM_BOT_TOKEN` secret

---

## Local Development (Replit Workflows)

Three workflows must all be running:

| Workflow | Command | Port | Purpose |
|---|---|---|---|
| **API Server** | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 | REST API + DB |
| **Start application** | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/medbot-webapp run dev` | 5000 | React WebApp (proxied at `/`) |
| **Telegram Bot** | `python3 medBot_updated.py` | — | Telegram polling bot |

### First-time setup

```bash
pnpm install                          # install all workspace packages
pnpm run typecheck:libs               # build composite libs (must run after schema changes)
pnpm --filter @workspace/db run push  # push schema to PostgreSQL (run once, or after schema changes)
pnpm --filter @workspace/api-spec run codegen  # regenerate API hooks from OpenAPI spec (if spec changed)
```

---

## Accessing the Panels

All panels are web pages opened via Telegram's WebApp button. The bot sends URLs of the form:

```
https://<your-replit-dev-domain>/admin?tg_id=<ID>&lang=uz
https://<your-replit-dev-domain>/doctor?tg_id=<ID>&lang=uz
https://<your-replit-dev-domain>/courier?tg_id=<ID>&lang=uz
https://<your-replit-dev-domain>/app        ← patient order wizard
```

---

## Adding Staff (Doctor / Courier)

1. Open the bot and type `/admin` → press **Admin panelni ochish**
2. Go to the **Xodimlar** tab
3. Type the Telegram user ID in the field (autocomplete shows known users from orders)
4. Select role (Doctor or Courier) and district (for couriers)
5. Press **Qo'shish** — the user receives a Telegram notification
6. The user then types `/doctor` or `/courier` in the bot to open their panel

---

## Payment Flow

1. User completes the order wizard and submits
2. Bot shows payment options (card transfer or Click)
3. User sends a payment receipt photo
4. All admins receive a Telegram notification with a **"Web paneldan tasdiqlash"** button
5. Admin opens the web panel → **Buyurtmalar** tab → filter **Admin kutilmoqda**
6. Admin presses **Tasdiqlash** or **Rad etish**
7. User receives a Telegram message with the result

> **Race condition protection**: if two admins click approve at the same time, the second one gets an error message — the order is only approved once.

The bot also has a **"Kutilayotgan to'lovlar"** button that opens the admin panel pre-filtered to pending payments.

---

## Deployment (Publishing to Production)

1. In Replit, click **Deploy** → **Autoscale** deployment
2. Set environment variables in the deployment settings:
   - `DATABASE_URL` — automatically provisioned
   - `TELEGRAM_BOT_TOKEN` — paste bot token
   - `ADMIN_IDS` — comma-separated list, e.g. `6194484795,8161075408`
3. After first deploy, update `WEBAPP_URL` in `medBot_updated.py` to your `.replit.app` domain
4. Run the bot separately (e.g. as a background worker or a separate deployment)

> **Important**: The bot uses SQLite (`medbot.db`) for its own state (conversations, bot-side order tracking). The web API uses PostgreSQL for orders, staff, settings, and districts. Staff added via the web panel are stored in PostgreSQL and are immediately accessible from the web panels.

---

## After Schema Changes

```bash
pnpm run typecheck:libs               # rebuild lib types
pnpm --filter @workspace/db run push  # push new tables/columns to DB
pnpm --filter @workspace/api-spec run codegen  # if OpenAPI spec changed
```

---

## Key Files

| File | Purpose |
|---|---|
| `medBot_updated.py` | Telegram bot (polling, SQLite) |
| `lib/db/src/schema/` | PostgreSQL schema (Drizzle ORM) |
| `lib/api-spec/openapi.yaml` | OpenAPI source of truth |
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/medbot-webapp/src/pages/` | React pages (AdminPanel, DoctorPanel, CourierPanel, wizard) |
| `artifacts/medbot-webapp/src/components/wizard/` | 8-step order wizard |
