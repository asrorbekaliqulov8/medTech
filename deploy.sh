#!/usr/bin/env bash
# =============================================================
#  N-MedHomeLab — Server Deploy Script
#  Ubuntu 22.04/24.04 LTS, root huquqi talab etiladi
#
#  Ishlatish (birinchi marta):
#    sudo bash deploy.sh -repo "https://github.com/SIZING/REPO.git"
#
#  Ixtiyoriy override parametrlar:
#    -db   "postgres://user:pass@host:5432/dbname"
#             (ko'rsatilmasa: localhost da medbot DB yaratiladi)
#    -repo "https://github.com/.../repo.git"
#    -dir  /opt/nmedbot          (default: /opt/nmedbot)
#
#  Yangilash (pull + rebuild + restart):
#    sudo bash deploy.sh -update
# =============================================================

set -euo pipefail

# ─── RANG ───────────────────────────────────────────────────
RESET="\033[0m"; BOLD="\033[1m"
GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; CYAN="\033[36m"
log()  { echo -e "\n${BOLD}${CYAN}>>> $*${RESET}"; }
ok()   { echo -e "    ${GREEN}✓${RESET}  $*"; }
warn() { echo -e "    ${YELLOW}!${RESET}  $*"; }
err()  { echo -e "\n${RED}[XATO]${RESET} $*\n"; exit 1; }

# ─── DEFAULT QIYMATLAR (haqiqiy) ────────────────────────────
DOMAIN="1wash.uz"
BOT_TOKEN="7723160549:AAFsUUzJTNOGNdsz_mYMeNqJ-w4STjRtxYE"
ADMIN_IDS="6194484795"
SSL_EMAIL="admin@1wash.uz"
APP_DIR="/opt/nmedbot"
REPO_URL=""
API_PORT=8080
UPDATE_ONLY=false

# PostgreSQL ma'lumotlari (o'rnatish vaqtida yaratiladi)
PG_DB="medbot"
PG_USER="medbot"
PG_PASS="$(openssl rand -hex 16 2>/dev/null || echo 'MedBot2025secure')"
DATABASE_URL=""   # -db parametri bilan override qilish mumkin

WEBAPP_URL="https://${DOMAIN}/"

# ─── PARAMETRLARNI O'QISH ────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -db)     DATABASE_URL="$2"; shift 2 ;;
    -repo)   REPO_URL="$2";     shift 2 ;;
    -dir)    APP_DIR="$2";      shift 2 ;;
    -update) UPDATE_ONLY=true;  shift   ;;
    -h|--help)
      grep '^#  ' "$0" | sed 's/^#  //'
      exit 0 ;;
    *) err "Noma'lum parametr: $1  (yordam uchun: bash deploy.sh --help)" ;;
  esac
done

# ─── VALIDATSIYA ─────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Root huquqi talab etiladi: sudo bash deploy.sh ..."
if [[ "$UPDATE_ONLY" == false ]] && [[ -z "$REPO_URL" ]]; then
  if [[ ! -d "$APP_DIR/.git" ]]; then
    err "-repo parametri talab etiladi: sudo bash deploy.sh -repo 'https://github.com/.../repo.git'"
  fi
fi

DIST_DIR="${APP_DIR}/artifacts/medbot-webapp/dist"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      N-MedHomeLab — Deploy Script        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo -e "  Domen   : ${CYAN}https://${DOMAIN}/${RESET}"
echo -e "  Papka   : ${APP_DIR}"
echo -e "  Admin   : ${ADMIN_IDS}"
if [[ "$UPDATE_ONLY" == true ]]; then
  echo -e "  Rejim   : ${YELLOW}YANGILASH (update)${RESET}"
else
  echo -e "  Rejim   : ${GREEN}TO'LIQ O'RNATISH${RESET}"
fi
echo ""

# ═════════════════════════════════════════════
#  1. TIZIM PAKETLARI
# ═════════════════════════════════════════════
if [[ "$UPDATE_ONLY" == false ]]; then
  log "Tizim paketlarini o'rnatish..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq \
    curl git build-essential ca-certificates gnupg \
    nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv python3-full \
    postgresql postgresql-contrib \
    ufw
  ok "Tizim paketlari o'rnatildi"

  # --- Node.js 24 ---
  if ! command -v node &>/dev/null || [[ "$(node -v 2>/dev/null)" != v24* ]]; then
    log "Node.js 24 o'rnatilmoqda..."
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
    ok "Node.js $(node -v) o'rnatildi"
  else
    ok "Node.js $(node -v) — mavjud"
  fi

  # --- pnpm ---
  if ! command -v pnpm &>/dev/null; then
    log "pnpm o'rnatilmoqda..."
    npm install -g pnpm >/dev/null 2>&1
    ok "pnpm $(pnpm -v) o'rnatildi"
  else
    ok "pnpm $(pnpm -v) — mavjud"
  fi
fi

# ═════════════════════════════════════════════
#  2. POSTGRESQL SOZLASH
# ═════════════════════════════════════════════
if [[ "$UPDATE_ONLY" == false ]] && [[ -z "$DATABASE_URL" ]]; then
  log "PostgreSQL bazasi sozlanmoqda..."
  systemctl start postgresql
  systemctl enable postgresql

  # Foydalanuvchi va baza yaratish
  sudo -u postgres psql -tc \
    "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c \
      "CREATE USER ${PG_USER} WITH PASSWORD '${PG_PASS}';" >/dev/null

  sudo -u postgres psql -tc \
    "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 || \
    sudo -u postgres psql -c \
      "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};" >/dev/null

  DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}"
  ok "PostgreSQL: baza '${PG_DB}', foydalanuvchi '${PG_USER}'"
  echo ""
  warn "DATABASE_URL saqlang (keyingi update uchun -db parametri sifatida):"
  echo "    ${DATABASE_URL}"
  echo ""
fi

# ═════════════════════════════════════════════
#  3. REPO CLONE / UPDATE
# ═════════════════════════════════════════════
if [[ "$UPDATE_ONLY" == true ]]; then
  log "Reponi yangilash..."
  git -C "$APP_DIR" fetch --all -q
  git -C "$APP_DIR" reset --hard origin/main -q
  ok "Repo yangilandi ($(git -C "$APP_DIR" log -1 --format='%h %s'))"
else
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Mavjud repo yangilanmoqda..."
    git -C "$APP_DIR" pull -q
    ok "Repo yangilandi"
  else
    log "Repo clone qilinmoqda..."
    git clone "$REPO_URL" "$APP_DIR" -q
    ok "Repo → $APP_DIR"
  fi
fi

# ═════════════════════════════════════════════
#  4. .ENV FAYLLAR
# ═════════════════════════════════════════════
log ".env fayllarini yozish..."

# Root .env
cat > "${APP_DIR}/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
NODE_ENV=production
EOF

# API server .env
mkdir -p "${APP_DIR}/artifacts/api-server"
cat > "${APP_DIR}/artifacts/api-server/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
PORT=${API_PORT}
NODE_ENV=production
EOF

# Webapp build .env
mkdir -p "${APP_DIR}/artifacts/medbot-webapp"
cat > "${APP_DIR}/artifacts/medbot-webapp/.env" <<EOF
VITE_API_BASE_URL=https://${DOMAIN}/api
EOF

# Bot faylidagi WEBAPP_URL ni yangilash
sed -i "s|WEBAPP_URL = .*|WEBAPP_URL = \"${WEBAPP_URL}\"|" \
  "${APP_DIR}/medBot_updated.py" 2>/dev/null && ok "Bot WEBAPP_URL yangilandi" || true

ok ".env fayllar yozildi"

# ═════════════════════════════════════════════
#  5. PYTHON VIRTUAL ENVIRONMENT + KUTUBXONALAR
# ═════════════════════════════════════════════
VENV_DIR="${APP_DIR}/venv"
log "Python virtual environment sozlanmoqda..."
if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
  ok "venv yaratildi: ${VENV_DIR}"
else
  ok "venv mavjud: ${VENV_DIR}"
fi
log "Python kutubxonalarini o'rnatish (venv ichida)..."
"${VENV_DIR}/bin/pip" install -q --upgrade pip
"${VENV_DIR}/bin/pip" install -q -r "${APP_DIR}/requirements.txt"
ok "Python: python-telegram-bot va boshqalar o'rnatildi"

# ═════════════════════════════════════════════
#  6. NODE DEPS + BUILD
# ═════════════════════════════════════════════
cd "$APP_DIR"

log "Node.js paketlarini o'rnatish (pnpm install)..."
pnpm install --frozen-lockfile 2>&1 | tail -3

log "TypeScript lib rebuild..."
pnpm run typecheck:libs 2>&1 | tail -3

log "API server build (esbuild)..."
pnpm --filter @workspace/api-server run build 2>&1 | tail -3

log "React WebApp build (Vite)..."
pnpm --filter @workspace/medbot-webapp run build 2>&1 | tail -3
ok "Build → ${DIST_DIR}"

# ═════════════════════════════════════════════
#  7. DATABASE MIGRATE
# ═════════════════════════════════════════════
log "Database sxemasini qo'llash (drizzle push)..."
pnpm --filter @workspace/db run push 2>&1 | tail -5 \
  && ok "DB sxemasi yangilandi" \
  || warn "DB push xatosi (jadvallar allaqachon bo'lishi mumkin)"

# ═════════════════════════════════════════════
#  8. FIREWALL
# ═════════════════════════════════════════════
if [[ "$UPDATE_ONLY" == false ]]; then
  log "Firewall (ufw) sozlanmoqda..."
  ufw allow OpenSSH    >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable   >/dev/null 2>&1 || true
  ok "UFW: SSH + HTTP/HTTPS ochiq"
fi

# ═════════════════════════════════════════════
#  9. SYSTEMD — API SERVER
# ═════════════════════════════════════════════
log "systemd: nmedbot-api servisi yozilmoqda..."
cat > /etc/systemd/system/nmedbot-api.service <<EOF
[Unit]
Description=N-MedHomeLab API Server (Express 5)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/artifacts/api-server/.env
ExecStart=$(command -v pnpm) --filter @workspace/api-server run start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nmedbot-api

[Install]
WantedBy=multi-user.target
EOF
ok "nmedbot-api.service yozildi"

# ═════════════════════════════════════════════
#  10. SYSTEMD — TELEGRAM BOT
# ═════════════════════════════════════════════
log "systemd: nmedbot-telegram servisi yozilmoqda..."
cat > /etc/systemd/system/nmedbot-telegram.service <<EOF
[Unit]
Description=N-MedHomeLab Telegram Bot
After=network.target nmedbot-api.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
Environment="TELEGRAM_BOT_TOKEN=${BOT_TOKEN}"
Environment="DATABASE_URL=${DATABASE_URL}"
ExecStart=${APP_DIR}/venv/bin/python ${APP_DIR}/medBot_updated.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nmedbot-telegram

[Install]
WantedBy=multi-user.target
EOF
ok "nmedbot-telegram.service yozildi"

# ═════════════════════════════════════════════
#  11. NGINX
# ═════════════════════════════════════════════
log "Nginx konfiguratsiyasi yozilmoqda..."
cat > /etc/nginx/sites-available/nmedbot <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # React WebApp (static build)
    root ${DIST_DIR};
    index index.html;

    # SPA routing — har qanday yo'l index.html ga
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # JS/CSS/img — uzoq cache (Vite content hash bilan keladi)
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy → Express server (ichki port ${API_PORT})
    location /api/ {
        proxy_pass         http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }

    # Katta fayllarni bloklash
    client_max_body_size 5m;
}
EOF

ln -sf /etc/nginx/sites-available/nmedbot /etc/nginx/sites-enabled/nmedbot
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx
ok "Nginx sozlandi va qayta yuklandi"

# ═════════════════════════════════════════════
#  12. SSL — LET'S ENCRYPT
# ═════════════════════════════════════════════
log "SSL sertifikat olish (Let's Encrypt)..."
if certbot --nginx \
     -d "$DOMAIN" \
     -d "www.${DOMAIN}" \
     --non-interactive \
     --agree-tos \
     -m "$SSL_EMAIL" \
     --redirect 2>&1 | grep -qE "Congratulations|Certificate not yet due for renewal"; then
  ok "SSL sertifikat o'rnatildi → https://${DOMAIN}/"
else
  warn "SSL xatosi yoki DNS hali ko'rsatilmagan."
  warn "DNS A yozuvini serverga ko'rsatingiz, keyin qo'lda ishlating:"
  warn "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -m ${SSL_EMAIL} --agree-tos --redirect"
fi

# ═════════════════════════════════════════════
#  13. SERVISLARNI ISHGA TUSHIRISH
# ═════════════════════════════════════════════
log "Servislarni ishga tushirish..."
systemctl daemon-reload
systemctl enable nmedbot-api.service     >/dev/null
systemctl enable nmedbot-telegram.service >/dev/null
systemctl restart nmedbot-api.service
sleep 3
systemctl restart nmedbot-telegram.service
sleep 2

# ═════════════════════════════════════════════
#  14. YAKUNIY HISOBOT
# ═════════════════════════════════════════════
API_STATUS=$(systemctl is-active nmedbot-api.service 2>/dev/null || echo "inactive")
BOT_STATUS=$(systemctl is-active nmedbot-telegram.service 2>/dev/null || echo "inactive")
NGX_STATUS=$(systemctl is-active nginx 2>/dev/null || echo "inactive")

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         DEPLOY MUVAFFAQIYATLI!           ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

[[ "$API_STATUS" == "active" ]] \
  && ok "nmedbot-api      — ishlayapti (port ${API_PORT})" \
  || warn "nmedbot-api      — ${API_STATUS}  →  journalctl -u nmedbot-api -n 50"

[[ "$BOT_STATUS" == "active" ]] \
  && ok "nmedbot-telegram — ishlayapti" \
  || warn "nmedbot-telegram — ${BOT_STATUS}  →  journalctl -u nmedbot-telegram -n 50"

[[ "$NGX_STATUS" == "active" ]] \
  && ok "nginx            — ishlayapti" \
  || warn "nginx            — ${NGX_STATUS}"

echo ""
echo -e "  ${CYAN}WebApp :${RESET} https://${DOMAIN}/"
echo -e "  ${CYAN}API    :${RESET} https://${DOMAIN}/api/"
echo -e "  ${CYAN}Admin  :${RESET} Telegram ID ${ADMIN_IDS}"
echo ""
echo -e "  ${BOLD}Loglar ko'rish:${RESET}"
echo -e "    journalctl -u nmedbot-api -f"
echo -e "    journalctl -u nmedbot-telegram -f"
echo -e "    tail -f /var/log/nginx/error.log"
echo ""
echo -e "  ${BOLD}Servis boshqarish:${RESET}"
echo -e "    systemctl restart nmedbot-api"
echo -e "    systemctl restart nmedbot-telegram"
echo -e "    systemctl status  nmedbot-api"
echo ""
echo -e "  ${BOLD}Yangilash (keyingi safar):${RESET}"
if [[ -n "$DATABASE_URL" ]]; then
  echo -e "    sudo bash ${APP_DIR}/deploy.sh -update"
else
  echo -e "    sudo bash ${APP_DIR}/deploy.sh -db '${DATABASE_URL}' -update"
fi
echo ""
if [[ -n "$PG_PASS" ]] && [[ -z "$(grep -o 'DATABASE_URL' "${APP_DIR}/.env" 2>/dev/null | head -1)" ]]; then
  echo -e "  ${YELLOW}MUHIM — DATABASE_URL ni saqlang:${RESET}"
  echo -e "  ${DATABASE_URL}"
  echo ""
fi
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
