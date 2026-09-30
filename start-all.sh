#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# start-all.sh — démarre TOUTE la plateforme FOOT en local : la base partagée,
# ses migrations puis les 15 applications (les 9 de start.sh + club-ob,
# ticketing, seller-portal et les 3 API NestJS marketplace/notifications/payments).
#
# Usage :
#   ./start-all.sh                 Démarre tout.
#   ./start-all.sh --no-db         Ne touche pas à Docker (MariaDB déjà prêt).
#   ./start-all.sh --no-migrate    Ne rejoue pas db/migrate.sh.
#   ./start-all.sh --no-seed       Ne provisionne pas les comptes de test identity.
#   ./start-all.sh --only a,b,c    Ne démarre que ces applications.
#   ./start-all.sh --list          Liste les applications gérées et sort.
#   ./start-all.sh --help          Affiche cette aide.
#
# Contrôles :
#   ./start-all.sh --check         Sonde une instance déjà lancée (HTTP).
#
# Logique de ports (source de vérité : script `dev` de chaque application) :
#   - les 9 apps de start.sh reçoivent un PORT explicite (3000-3004, 3007-3009,
#     3012) car leurs scripts `dev` n'en fixent pas ;
#   - player-hub/staff-hub/medical-hub/seller-portal fixent déjà le leur dans
#     leur package.json (-p 3007/3008/3012/3006) ;
#   - club-ob et ticketing n'en fixent pas → PORT injecté (3013/3015) pour
#     éviter la collision sur 3000 ;
#   - marketplace/notifications/payments lisent PORT depuis leur `.env`
#     (3011/3010/3014).
#
# Arrêt : Ctrl+C arrête toutes les applications lancées par ce script.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ── Interpréteur ─────────────────────────────────────────────────────────────
# db/migrate.sh utilise `coproc` nommé et `mapfile` (bash >= 4) ; le bash 3.2
# livré par macOS (/bin/bash) ne les supporte pas.
if [ -z "${BASH_VERSINFO:-}" ] || [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  for candidate in /opt/homebrew/bin/bash /usr/local/bin/bash; do
    if [ -x "$candidate" ]; then exec "$candidate" "$0" "$@"; fi
  done
fi
if [ -z "${BASH_VERSINFO:-}" ] || [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  echo "⚠️  bash >= 4 requis (macOS : brew install bash)."
fi

LOG_DIR="${LOG_DIR:-$ROOT_DIR/.logs}"

# ── Définition des applications ──────────────────────────────────────────────
# nom | répertoire | port | commande | variable de port injectée | description
APP_DEFS=(
  "identity|identity|3004|pnpm run dev|PORT=3004|SSO centralisé (émet le cookie JWT partagé)"
  "arbinote|arbinote|3000|pnpm run dev|PORT=3000|Notation publique des arbitres"
  "federation-hub|federation-hub|3002|pnpm run dev|PORT=3002|Référentiels et administration fédérale"
  "club-hub|club-hub|3003|pnpm run dev|PORT=3003|Gestion de club (effectif, discipline, CMS)"
  "match-operations|match-operations|3001|pnpm run dev|PORT=3001|Feuille de match électronique"
  "referee-hub|referee-hub|3009|pnpm run dev|PORT=3009|Espace privé des arbitres"
  "player-hub|player-hub|3007|pnpm run dev||Espace joueur"
  "staff-hub|staff-hub|3008|pnpm run dev||Espace staff technique"
  "medical-hub|medical-hub|3012|pnpm run dev||Espace médical du club"
  "club-ob|club-ob|3013|pnpm run dev|PORT=3013|Site public + espace membre Olympique de Béja"
  "ticketing|ticketing|3015|pnpm run dev|PORT=3015|Billetterie multi-clubs"
  "seller-portal|seller-portal|3006|pnpm run dev||UI vendeur marketplace"
  "marketplace|marketplace|3011|pnpm run start:dev||API NestJS marketplace"
  "notifications|notifications|3010|pnpm run start:dev||API NestJS notifications"
  "payments|payments|3014|pnpm run start:dev||API NestJS paiements"
)

# Deux variables d'environnement à charger selon le type d'app (Next.js vs NestJS).
env_file_for() {
  case "$1" in
    marketplace|notifications|payments) echo ".env" ;;
    *) echo ".env.local" ;;
  esac
}

print_apps() {
  printf '%-18s %-6s %-52s %s\n' "APPLICATION" "PORT" "RÔLE" "ENV"
  for def in "${APP_DEFS[@]}"; do
    IFS='|' read -r name dir port cmd portvar desc <<< "$def"
    printf '%-18s %-6s %-52s %s\n' "$name" "$port" "$desc" "$(env_file_for "$name")"
  done
}

# ── Arguments ────────────────────────────────────────────────────────────────
WITH_DB=1
WITH_MIGRATE=1
WITH_SEED=1
MODE="start"
ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --no-db) WITH_DB=0 ;;
    --no-migrate) WITH_MIGRATE=0 ;;
    --no-seed) WITH_SEED=0 ;;
    --only) ONLY="${2:-}"; shift ;;
    --check) MODE="check" ;;
    --list) MODE="list" ;;
    -h|--help) MODE="help" ;;
    *)
      echo "❌ Option inconnue : $1"
      echo "Usage: $0 [--no-db] [--no-migrate] [--no-seed] [--only a,b,c] [--check] [--list] [--help]"
      exit 1
      ;;
  esac
  shift
done

case "$MODE" in
  list) print_apps; exit 0 ;;
  help)
    sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
    echo
    print_apps
    exit 0
    ;;
esac

# ── Sélection des applications ───────────────────────────────────────────────
should_start() {
  [ -z "$ONLY" ] && return 0
  case ",$ONLY," in *",$1,"*) return 0 ;; *) return 1 ;; esac
}

APP_INFO_FOR() {
  for def in "${APP_DEFS[@]}"; do
    IFS='|' read -r name dir port cmd portvar desc <<< "$def"
    if [ "$name" = "$1" ]; then
      APP_DIR="$dir"; APP_PORT="$port"; APP_CMD="$cmd"; APP_PORTVAR="$portvar"; APP_DESC="$desc"
      return 0
    fi
  done
  return 1
}

if [ -n "$ONLY" ]; then
  IFS=',' read -ra requested <<< "$ONLY"
  for req in "${requested[@]}"; do
    if ! APP_INFO_FOR "$req"; then
      echo "❌ Application inconnue dans --only : $req (voir --list)"
      exit 1
    fi
  done
fi

check_app() {
  local name="$1" dir="$2" port="$3" path="${4:-/}"
  local code
  code="$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' --max-time 20 "http://localhost:$port$path" || true)"
  if [ "$code" = "000" ] || [ -z "$code" ]; then
    printf '❌ %-16s :%-5s injoignable\n' "$name" "$port"
  else
    printf '✅ %-16s :%-5s HTTP %s\n' "$name" "$port" "$code"
  fi
}

check_tcp() {
  local name="$1" port="$2"
  if /usr/bin/nc -z -G 5 127.0.0.1 "$port" >/dev/null 2>&1; then
    printf '✅ %-16s :%-5s TCP ouvert\n' "$name" "$port"
  else
    printf '❌ %-16s :%-5s injoignable\n' "$name" "$port"
  fi
}

if [ "$MODE" = "check" ]; then
  echo "🔎 Sonde des applications de la plateforme…"
  echo
  for def in "${APP_DEFS[@]}"; do
    IFS='|' read -r name dir port cmd portvar desc <<< "$def"
    case "$name" in
      marketplace|notifications|payments) check_app "$name" "$dir" "$port" /health ;;
      *) check_app "$name" "$dir" "$port" / ;;
    esac
  done
  echo
  check_tcp "mariadb" 3307
  check_tcp "phpmyadmin" 9090
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Base de données partagée + migrations
# ═══════════════════════════════════════════════════════════════════════════════
if [ "$WITH_DB" -eq 1 ]; then
  if [ -f "$ROOT_DIR/arbinote/.env.local" ]; then
    set -a
    source "$ROOT_DIR/arbinote/.env.local"
    set +a
  fi
  : "${DB_USER:?DB_USER manquant dans arbinote/.env.local}"
  : "${DB_PASSWORD:?DB_PASSWORD manquant dans arbinote/.env.local}"
  : "${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD manquant dans arbinote/.env.local}"

  echo "🔍 Vérification de Docker…"
  if ! docker info >/dev/null 2>&1; then
    echo "⚠️  Docker n'est pas démarré. Lancez Docker puis relancez ce script."
    exit 1
  fi
  echo "✅ Docker est actif."

  if docker ps --format '{{.Names}}' | grep -q '^mariadb_container$'; then
    echo "🐳 mariadb_container déjà en cours d'exécution."
  elif docker ps -a --format '{{.Names}}' | grep -q '^mariadb_container$'; then
    echo "🐳 Redémarrage de mariadb_container existant…"
    docker start mariadb_container >/dev/null
  else
    echo "🐳 Première création de mariadb_container (port 3307, base partagée foot)…"
    docker run -d --name mariadb_container -p 127.0.0.1:3307:3306 \
      -v mariadb_data:/var/lib/mysql \
      -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
      -e MYSQL_DATABASE=foot \
      -e MYSQL_USER=arbitres \
      -e MYSQL_PASSWORD="$DB_PASSWORD" \
      mariadb:latest
  fi

  if docker ps --format '{{.Names}}' | grep -q '^phpmyadmin_container$'; then
    echo "🖥️  phpmyadmin_container déjà en cours d'exécution."
  elif docker ps -a --format '{{.Names}}' | grep -q '^phpmyadmin_container$'; then
    docker start phpmyadmin_container >/dev/null
  else
    echo "🖥️  Création et démarrage de phpMyAdmin (127.0.0.1:9090)…"
    # --platform linux/amd64 : l'image phpmyadmin/phpmyadmin n'est publiée que
    # pour amd64 ; sans ce flag Docker émet un avertissement de plateforme sur
    # les hôtes arm64 (Apple Silicon) et l'exécution reste en émulation.
    docker run -d --name phpmyadmin_container -p 127.0.0.1:9090:80 \
      --platform linux/amd64 \
      --link mariadb_container:db \
      -e PMA_HOST=mariadb_container \
      -e PMA_PORT=3306 \
      -e PMA_USER=arbitres \
      -e PMA_PASSWORD="$DB_PASSWORD" \
      phpmyadmin/phpmyadmin
  fi

  echo "⏳ Attente que mariadb_container soit prêt…"
  MAX_WAIT=60
  WAITED=0
  until docker exec mariadb_container healthcheck.sh --connect --innodb_initialized 2>/dev/null; do
    sleep 2
    WAITED=$((WAITED + 2))
    if [ $WAITED -ge $MAX_WAIT ]; then
      echo "❌ mariadb_container n'a pas répondu après ${MAX_WAIT}s"
      docker logs mariadb_container --tail 50
      exit 1
    fi
  done
  echo "✅ Base de données prête."

  # Correctif schéma partagé (idempotent) — voir start.sh pour le détail.
  echo "🔧 Vérification du schéma (Card.period)…"
  CARD_PERIOD_EXISTS="$(docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -Nse "
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'foot' AND TABLE_NAME = 'Card' AND COLUMN_NAME = 'period' LIMIT 1
  ")"
  if [ "$CARD_PERIOD_EXISTS" != "1" ]; then
    echo "🧱 Ajout de la colonne Card.period…"
    docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -e "
      ALTER TABLE Card ADD COLUMN period ENUM('H1','H2','ET1','ET2') NULL AFTER minute;
    "
    echo "✅ Colonne Card.period ajoutée."
  else
    echo "✅ Colonne Card.period déjà présente."
  fi
else
  echo "⏭️  --no-db : base MariaDB non touchée."
fi

if [ "$WITH_MIGRATE" -eq 1 ]; then
  if docker ps --format '{{.Names}}' | grep -q '^mariadb_container$'; then
    echo "🗃️  Application des migrations partagées (db/migrations.manifest)…"
    "$ROOT_DIR/db/migrate.sh"
  else
    echo "⚠️  mariadb_container non démarré : migrations sautées."
  fi
else
  echo "⏭️  --no-migrate : migrations non rejouées."
fi

# Les bases autonomes de `payments`/`notifications` sont gérées par leurs
# propres migrations TypeORM (tables préfixées) ; elles sont idempotentes.
if [ "$WITH_MIGRATE" -eq 1 ]; then
  for svc in payments notifications; do
    if should_start "$svc" && [ -f "$ROOT_DIR/$svc/.env" ]; then
      echo "🗃️  Migrations TypeORM de $svc…"
      (cd "$ROOT_DIR/$svc" && pnpm run migration:run) || \
        echo "⚠️  migrations $svc : échec (le service tentera quand même de démarrer)."
    fi
  done

  # Comptes de test identity (club-admin/player/referee/member), sans mot de
  # passe en dur : réutilise identity/.env.local — voir le script pour le détail.
  if [ "$WITH_SEED" -eq 1 ] && should_start "identity" && [ -f "$ROOT_DIR/identity/.env.local" ]; then
    echo "🌱 Provisionnement des comptes de test identity…"
    (cd "$ROOT_DIR/identity" && pnpm exec tsx scripts/seed-test-accounts.ts) || \
      echo "⚠️  seed des comptes de test : échec (non bloquant)."
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Applications
# ═══════════════════════════════════════════════════════════════════════════════
mkdir -p "$LOG_DIR"

# Arrêt propre de toute la descendance à la sortie (Ctrl+C).
trap 'echo; echo "🛑 Arrêt des applications…"; kill 0' EXIT INT TERM

echo
echo "🚀 Lancement des applications (logs dans $LOG_DIR)…"
echo

STARTED=()
SKIPPED_MISSING_ENV=()

start_app() {
  local name="$1" dir="$2" port="$3" cmd="$4" portvar="$5"
  local env_file
  env_file="$(env_file_for "$name")"

  if [ ! -d "$ROOT_DIR/$dir" ]; then
    echo "⚠️  $name : répertoire absent, ignoré."
    return
  fi
  if [ ! -f "$ROOT_DIR/$dir/$env_file" ]; then
    SKIPPED_MISSING_ENV+=("$name")
    echo "⚠️  $name : $dir/$env_file absent — non démarré (copier $dir/${env_file}.example)."
    return
  fi

  echo "▶️  $name sur http://localhost:$port  →  $LOG_DIR/$name.log"
  if [ -n "$portvar" ]; then
    (cd "$ROOT_DIR/$dir" && env "$portvar" $cmd >"$LOG_DIR/$name.log" 2>&1) &
  else
    (cd "$ROOT_DIR/$dir" && $cmd >"$LOG_DIR/$name.log" 2>&1) &
  fi
  STARTED+=("$name")
}

# identity d'abord : les autres applications redirigent vers son /login tant
# qu'elles n'ont pas de session.
for def in "${APP_DEFS[@]}"; do
  IFS='|' read -r name dir port cmd portvar desc <<< "$def"
  should_start "$name" && start_app "$name" "$dir" "$port" "$cmd" "$portvar"
done

if [ "${#STARTED[@]}" -eq 0 ]; then
  echo "❌ Aucune application démarrée."
  exit 1
fi

# ── Attente de disponibilité ─────────────────────────────────────────────────
echo
echo "⏳ Attente que les applications répondent…"
for def in "${APP_DEFS[@]}"; do
  IFS='|' read -r name dir port cmd portvar desc <<< "$def"
  should_start "$name" || continue
  case " ${STARTED[*]} " in *" $name "*) ;; *) continue ;; esac

  probe="/"; case "$name" in marketplace|notifications|payments) probe="/health" ;; esac
  ok=0
  for _ in $(seq 1 40); do
    code="$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port$probe" || true)"
    if [ "$code" != "000" ] && [ -n "$code" ]; then ok=1; break; fi
    sleep 2
  done
  if [ "$ok" -eq 1 ]; then
    printf '✅ %-16s http://localhost:%-5s (HTTP %s)\n' "$name" "$port" "$code"
  else
    printf '⚠️  %-16s http://localhost:%-5s toujours injoignable — voir %s\n' "$name" "$port" "$LOG_DIR/$name.log"
  fi
done

echo
if [ "${#SKIPPED_MISSING_ENV[@]}" -gt 0 ]; then
  echo "⚠️  Non démarrées (fichier d'env manquant) : ${SKIPPED_MISSING_ENV[*]}"
fi
echo "🎉 ${#STARTED[@]} application(s) en cours. Ctrl+C pour tout arrêter."
echo "   Sonde : ./start-all.sh --check     Liste : ./start-all.sh --list"
echo

wait
