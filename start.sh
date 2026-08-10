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

: "${DB_USER:?DB_USER manquant dans arbinote/.env.local}"
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

# ── Correctif schéma partagé (idempotent) ───────────────────────────────────
# teamManager et matchsheet lisent `Card.period`. On l'ajoute automatiquement
# si la colonne n'existe pas encore.
# NB: on utilise l'utilisateur applicatif ($DB_USER, droits ALTER accordés sur
# `foot`) plutôt que root, car le mot de passe root n'est valable qu'à la toute
# première création du volume mariadb_data — sur un conteneur déjà existant
# (recréé avec un DB_ROOT_PASSWORD différent de celui d'origine), -uroot échoue
# avec "Access denied" et interrompt tout le script (set -euo pipefail).
echo "🔧 Vérification du schéma (Card.period)..."
CARD_PERIOD_EXISTS="$(docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -Nse "
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'foot'
    AND TABLE_NAME = 'Card'
    AND COLUMN_NAME = 'period'
  LIMIT 1
")"

if [ "$CARD_PERIOD_EXISTS" != "1" ]; then
  echo "🧱 Ajout de la colonne Card.period..."
  docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -e "
    ALTER TABLE Card
      ADD COLUMN period ENUM('H1','H2','ET1','ET2') NULL AFTER minute;
  "
  echo "✅ Colonne Card.period ajoutée."
else
  echo "✅ Colonne Card.period déjà présente."
fi

# ── Notifications centralisées (idempotent) ─────────────────────────────────
# teamManager et matchsheet partagent la table `platform_notifications` (+
# préférences email). Voir db/foot.sql pour un environnement neuf ; ce bloc
# couvre les volumes mariadb_data déjà créés avant l'ajout de ces tables.
echo "🔧 Vérification du schéma (notifications centralisées)..."
PLATFORM_NOTIFICATIONS_EXISTS="$(docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -Nse "
  SELECT 1
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'foot'
    AND TABLE_NAME = 'platform_notifications'
  LIMIT 1
")"

if [ "$PLATFORM_NOTIFICATIONS_EXISTS" != "1" ]; then
  echo "🧱 Création des tables de notifications centralisées..."
  docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -e "
    CREATE TABLE IF NOT EXISTS platform_notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      team_id CHAR(36) NULL,
      source_app VARCHAR(20) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      url VARCHAR(500) NULL,
      match_id CHAR(36) NULL,
      is_urgent TINYINT(1) NOT NULL DEFAULT 0,
      read_at DATETIME NULL,
      email_status ENUM('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
      email_sent_at DATETIME NULL,
      email_error VARCHAR(500) NULL,
      created_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_platform_notifications_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
      CONSTRAINT fk_platform_notifications_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_platform_notifications_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
      INDEX idx_platform_notifications_user (user_id, read_at),
      INDEX idx_platform_notifications_email_status (email_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id VARCHAR(191) NOT NULL PRIMARY KEY,
      email_enabled TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
  "
  echo "✅ Tables de notifications centralisées créées."
else
  echo "✅ Tables de notifications centralisées déjà présentes."
fi

# ── Nettoyage à la sortie (Ctrl+C arrête les applications) ──────────────────
trap 'echo; echo "🛑 Arrêt des applications..."; kill 0' EXIT INT TERM

# ── arbinote sur le port 3000 (site public de notation des arbitres : votes,
# critères, anomalies, alertes, messages — remplace l'ancien ArbiNote) ───────
echo "🚀 Lancement d'arbinote sur http://localhost:3000 ..."
(cd "$ROOT_DIR/arbinote" && PORT=3000 pnpm run dev 2>&1 | sed -u 's/^/[arbinote]   /') &

# ── matchsheet sur le port 3001 (feuille de match électronique : avant-match,
# live, après-match, signatures et événements) ───────────────────────────────
echo "🚀 Lancement de matchsheet sur http://localhost:3001 ..."
(cd "$ROOT_DIR/matchsheet" && PORT=3001 pnpm run dev 2>&1 | sed -u 's/^/[matchsheet] /') &

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
