#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ── Base de données partagée (mariadb_container) ────────────────────────────
# Identifiants stockés dans arbinote/.env.local (base "foot" partagée par
# arbinote, superadmin et teamManager).
if [ -f "$ROOT_DIR/arbinote/.env.local" ]; then
  set -a
  source "$ROOT_DIR/arbinote/.env.local"
  set +a
fi

: "${DB_PASSWORD:?DB_PASSWORD manquant dans arbinote/.env.local}"
: "${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD manquant dans arbinote/.env.local}"

echo "🔍 Vérification de Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "⚠️  Docker n'est pas démarré. Lancez Docker puis relancez ce script."
  exit 1
fi
echo "✅ Docker est actif."

if docker ps --format '{{.Names}}' | grep -q '^mariadb_container$'; then
  echo "🐳 mariadb_container déjà en cours d'exécution."
elif docker ps -a --format '{{.Names}}' | grep -q '^mariadb_container$'; then
  echo "🐳 Redémarrage de mariadb_container existant..."
  docker start mariadb_container >/dev/null
else
  echo "🐳 Première création de mariadb_container (port 3307, base partagée foot)..."
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
  echo "🖥️  Création et démarrage de phpMyAdmin..."
  docker run -d --name phpmyadmin_container -p 127.0.0.1:9090:80 \
    --link mariadb_container:db \
    -e PMA_HOST=mariadb_container \
    -e PMA_PORT=3306 \
    -e PMA_USER=arbitres \
    -e PMA_PASSWORD="$DB_PASSWORD" \
    phpmyadmin/phpmyadmin
fi

echo "⏳ Attente que mariadb_container soit prêt..."
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

# ── Nettoyage à la sortie (Ctrl+C arrête les quatre apps) ───────────────────
trap 'echo; echo "🛑 Arrêt des applications..."; kill 0' EXIT INT TERM

# ── arbinote sur le port 3000 (site public de notation des arbitres : votes,
# critères, anomalies, alertes, messages — remplace l'ancien ArbiNote) ───────
echo "🚀 Lancement d'arbinote sur http://localhost:3000 ..."
(cd "$ROOT_DIR/arbinote" && PORT=3000 pnpm run dev 2>&1 | sed -u 's/^/[arbinote]   /') &

# ── superadmin sur le port 3002 (outil interne : référentiel fédérations/
# ligues/saisons/journées/équipes/matchs/arbitres, journal d'audit, test
# API-Football, + gestion des comptes clubs) ─────────────────────────────────
echo "🚀 Lancement de superadmin sur http://localhost:3002 ..."
(cd "$ROOT_DIR/superadmin" && PORT=3002 pnpm run dev 2>&1 | sed -u 's/^/[superadmin]  /') &

# ── teamManager sur le port 3003 (site/effectif/actualités par club ET module
# discipline — cartons/suspensions/amendes/notes/audit/réglages, fusionné
# depuis cardManager. Un seul déploiement partagé, chaque club se connecte
# avec son propre compte `User`) ─────────────────────────────────────────────
echo "🚀 Lancement de teamManager sur http://localhost:3003 ..."
(cd "$ROOT_DIR/teamManager" && PORT=3003 pnpm run dev 2>&1 | sed -u 's/^/[teamManager] /') &

wait
