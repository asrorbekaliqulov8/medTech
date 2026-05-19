#!/usr/bin/env bash
# =============================================================
#  N-MedHomeLab — Server Deploy Script
#  Ubuntu/Debian, root huquqi talab etiladi
#
#  Ishlatish:
#    sudo bash deploy.sh \
#      -d    medsayt.uz \
#      -bt   "7723160549:AAHm95Og..." \
#      -db   "postgres://user:pass@localhost:5432/medbot" \
#      -repo "https://github.com/sizning/repo.git"
#
#  Ixtiyoriy parametrlar:
#    -dir   /opt/nmedbot          (o'rnatish papkasi, default: /opt/nmedbot)
#    -admin "111111111,222222222"  (admin Telegram ID lar)
#    -card  "9860 1234 5678 9012"  (to'lov kartasi raqami)
#    -click "https://click.uz/..."  (Click to'lov havolasi)
#    -email "admin@medsayt.uz"    (SSL sertifikat uchun email)
#    -port  5000                  (webapp porti, default: 5000 — ichki)
#    -api   8080                  (API porti, default: 8080 — ichki)
#    -update                      (faqat yangilash: pull + build + restart)
# =============================================================

set -euo pipefail
RESET="\033[0m"; BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; CYAN="\033[36m"
log()  { echo -e "${BOLD}${CYAN}>>> $*${RESET}"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()  { echo -e "${RED}[ERR]${RESET} $*"; exit 1; }

# ---------- parametrlar ----------
DOMAIN=""; BOT_TOKEN=""; DATABASE_URL=""; REPO_URL=""
APP_DIR="/opt/nmedbot"
ADMIN_IDS="6194484795,8161075408"
CARD_NUMBER=""; CLICK_URL=""
SSL_EMAIL=""; WEBAPP_PORT=5000; API_PORT=8080
UPDATE_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d)      DOMAIN="$2";       shift 2 ;;
    -bt)     BOT_TOKEN="$2";    shift 2 ;;
    -db)     DATABASE_URL="$2"; shift 2 ;;
    -repo)   REPO_URL="$2";     shift 2 ;;
    -dir)    APP_DIR="$2";      shift 2 ;;
    -admin)  ADMIN_IDS="$2";    shift 2 ;;
    -card)   CARD_NUMBER="$2";  shift 2 ;;
    -click)  CLICK_URL="$2";    shift 2 ;;
    -email)  SSL_EMAIL="$2";    shift 2 ;;
    -port)   WEBAPP_PORT="$2";  shift 2 ;;
    -api)    API_PORT="$2";     shift 2 ;;
    -update) UPDATE_ONLY=true;  shift   ;;
    *) err "Noma'lum parametr: $1. -h uchun --help yozing." ;;
  esac
done

# ---------- validatsiya ----------
[[ -z "$DOMAIN" ]]    && err "-d <domen> majburiy (masalan: -d medsayt.uz)"
[[ -z "$BOT_TOKEN" ]] && err "-bt <bot_token> majburiy"
[[ -z "$DATABASE_URL" ]] && err "-db <postgres_url> majburiy (masalan: -db 'postgres://user:pass@localhost/db')"
if [[ "$UPDATE_ONLY" == false ]]; then
  [[ -z "$REPO_URL" ]] && err "-repo <git_url> majburiy (masalan: -repo https://github.com/.../repo.git)"
fi
[[ -z "$SSL_EMAIL" ]] && SSL_EMAIL="admin@${DOMAIN}"

WEBAPP_URL="https://${DOMAIN}/"
DIST_DIR="${APP_DIR}/artifacts/medbot-webapp/dist"

echo ""
echo -e "${BOLD}============================================${RESET}"
echo -e "${BOLD}   N-MedHomeLab — Deploy${RESET}"
echo -e "   Domen  : ${CYAN}https://${DOMAIN}/${RESET}"
echo -e "   Papka  : ${APP_DIR}"
echo -e "   API    : 127.0.0.1:${API_PORT}  (ichki)"
echo -e "${BOLD}============================================${RESET}"
echo ""

# ─────────────────────────────────────────────
# 1. TIZIM PAKETLARI
# ─────────────────────────────────────────────
if [[ "$UPDATE_ONLY" == false ]]; then
  log "Tizim paketlarini o'rnatish..."
  apt-get update -qq
  apt-get install -y -qq \
    curl git build-essential \
    nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv \
    postgresql-client
  ok "Tizim paketlari o'rnatildi"

  # Node.js 24
  if ! command -v node &>/dev/null || [[ "$(node -v 2>/dev/null)" != v24* ]]; then
    log "Node.js 24 o'rnatilmoqda..."
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
    apt-get install -y nodejs >/dev/null
    ok "Node.js $(node -v) o'rnatildi"
  else
    ok "Node.js $(node -v) mavjud"
  fi

  # pnpm
  if ! command -v pnpm &>/dev/null; then
    log "pnpm o'rnatilmoqda..."
    npm install -g pnpm >/dev/null
    ok "pnpm o'rnatildi"
  else
    ok "pnpm $(pnpm -v) mavjud"
  fi
fi

# ─────────────────────────────────────────────
# 2. REPO CLONE / UPDATE
# ─────────────────────────────────────────────
if [[ "$UPDATE_ONLY" == true ]]; then
  log "Reponi yangilash..."
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
  ok "Repo yangilandi"
else
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Mavjud repo yangilanmoqda..."
    git -C "$APP_DIR" pull
    ok "Repo yangilandi"
  else
    log "Repo clone qilinmoqda: $REPO_URL"
    git clone "$REPO_URL" "$APP_DIR"
    ok "Repo clone qilindi → $APP_DIR"
  fi
fi

# ─────────────────────────────────────────────
# 3. ENVIRONMENT FAYLLAR
# ─────────────────────────────────────────────
log ".env fayllar yozilmoqda..."

# Root .env (bot va umumiy)
cat > "${APP_DIR}/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
EOF

# API server .env
mkdir -p "${APP_DIR}/artifacts/api-server"
cat > "${APP_DIR}/artifacts/api-server/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
PORT=${API_PORT}
NODE_ENV=production
EOF

# Webapp .env (build vaqtida ishlatiladi)
mkdir -p "${APP_DIR}/artifacts/medbot-webapp"
cat > "${APP_DIR}/artifacts/medbot-webapp/.env" <<EOF
VITE_API_BASE_URL=https://${DOMAIN}/api
EOF

# Bot ichidagi WEBAPP_URL ni almashtirish
sed -i "s|WEBAPP_URL = .*|WEBAPP_URL = \"${WEBAPP_URL}\"|" \
  "${APP_DIR}/medBot_updated.py" 2>/dev/null || true

ok ".env fayllar yozildi"

# ─────────────────────────────────────────────
# 4. PYTHON KUTUBXONALAR
# ─────────────────────────────────────────────
log "Python kutubxonalarini o'rnatish..."
pip3 install -q -r "${APP_DIR}/requirements.txt"
ok "Python kutubxonalari o'rnatildi"

# ─────────────────────────────────────────────
# 5. NODE DEPENDENCIES + BUILD
# ─────────────────────────────────────────────
cd "$APP_DIR"
log "Node.js paketlarini o'rnatish..."
pnpm install --frozen-lockfile

log "TypeScript lib rebuild..."
pnpm run typecheck:libs

log "API serverni build qilish..."
pnpm --filter @workspace/api-server run build

log "WebApp build qilinmoqda..."
pnpm --filter @workspace/medbot-webapp run build
ok "Build muvaffaqiyatli: ${DIST_DIR}"

# ─────────────────────────────────────────────
# 6. DATABASE MIGRATE
# ─────────────────────────────────────────────
log "Database sxemasini qo'llash..."
pnpm --filter @workspace/db run push && ok "DB yangilandi" || warn "DB push xatosi (jadvallar allaqachon mavjud bo'lishi mumkin)"

# ─────────────────────────────────────────────
# 7. SYSTEMD — API SERVER
# ─────────────────────────────────────────────
log "systemd servis: nmedbot-api..."
cat > /etc/systemd/system/nmedbot-api.service <<EOF
[Unit]
Description=N-MedHomeLab API Server (Express)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
Environment="DATABASE_URL=${DATABASE_URL}"
Environment="PORT=${API_PORT}"
Environment="NODE_ENV=production"
ExecStart=$(command -v pnpm) --filter @workspace/api-server run start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ─────────────────────────────────────────────
# 8. SYSTEMD — TELEGRAM BOT
# ─────────────────────────────────────────────
log "systemd servis: nmedbot-telegram..."
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
ExecStart=$(command -v python3) ${APP_DIR}/medBot_updated.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ─────────────────────────────────────────────
# 9. NGINX CONFIG
# ─────────────────────────────────────────────
log "Nginx konfiguratsiyasi yozilmoqda..."
cat > /etc/nginx/sites-available/nmedbot <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # WebApp — React build (static fayllar)
    root ${DIST_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Static assetlar uzoqroq cache
    location ~* \.(js|css|png|jpg|jpeg|svg|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (Express server, ichki port)
    location /api/ {
        proxy_pass         http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/nmedbot /etc/nginx/sites-enabled/nmedbot
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx konfiguratsiya qilindi"

# ─────────────────────────────────────────────
# 10. SSL SERTIFIKAT (Let's Encrypt)
# ─────────────────────────────────────────────
log "SSL sertifikat (Let's Encrypt)..."
if certbot --nginx \
     -d "$DOMAIN" \
     --non-interactive \
     --agree-tos \
     -m "$SSL_EMAIL" \
     --redirect 2>&1 | grep -q "Congratulations\|Certificate not yet due"; then
  ok "SSL sertifikat o'rnatildi"
else
  warn "SSL xatosi. DNS sozlanganidan so'ng qo'lda ishlatish:"
  warn "  certbot --nginx -d ${DOMAIN} -m ${SSL_EMAIL} --agree-tos --redirect"
fi

# ─────────────────────────────────────────────
# 11. SERVISLARNI YOQISH VA ISHGA TUSHIRISH
# ─────────────────────────────────────────────
log "Servislar ishga tushirilmoqda..."
systemctl daemon-reload
systemctl enable nmedbot-api.service
systemctl enable nmedbot-telegram.service
systemctl restart nmedbot-api.service
sleep 2
systemctl restart nmedbot-telegram.service
sleep 1

# ─────────────────────────────────────────────
# 12. NATIJA
# ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}============================================${RESET}"
echo -e "${BOLD}   Deploy tugadi!${RESET}"
echo -e "============================================"
echo ""

API_STATUS=$(systemctl is-active nmedbot-api.service 2>/dev/null || echo "inactive")
BOT_STATUS=$(systemctl is-active nmedbot-telegram.service 2>/dev/null || echo "inactive")

[[ "$API_STATUS" == "active" ]] && ok "nmedbot-api      — ishlayapti" || warn "nmedbot-api      — ${API_STATUS}"
[[ "$BOT_STATUS"  == "active" ]] && ok "nmedbot-telegram — ishlayapti" || warn "nmedbot-telegram — ${BOT_STATUS}"

echo ""
echo -e "  ${CYAN}WebApp:${RESET} https://${DOMAIN}/"
echo -e "  ${CYAN}API:${RESET}    https://${DOMAIN}/api/"
echo ""
echo -e "  ${BOLD}Loglar ko'rish:${RESET}"
echo -e "    journalctl -u nmedbot-api -f"
echo -e "    journalctl -u nmedbot-telegram -f"
echo ""
echo -e "  ${BOLD}Yangilash (pull + build + restart):${RESET}"
echo -e "    bash deploy.sh -d ${DOMAIN} -bt '...' -db '...' -update"
echo ""
echo -e "${BOLD}============================================${RESET}"
