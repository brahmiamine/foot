#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ── Base de données partagée (mariadb_container) ────────────────────────────
# Identifiants stockés dans arbinote/.env.local (base "foot" partagée par
# arbinote, superadmin, teamManager et sso).
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

# Un carton par joueur/match/type au plus : ferme la course entre les deux
# écrivains de Card (teamManager en discipline, matchsheet en live — voir
# db/OWNERSHIP.md § « Card a deux écrivains »). CardService (teamManager) et
# CardEventService (matchsheet) traduisent déjà la violation de contrainte
# en erreur utilisateur (DuplicateCardError).
echo "🔧 Vérification du schéma (Card unique playerId+matchId+type)..."
CARD_UNIQUE_EXISTS="$(docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -Nse "
  SELECT 1
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'foot'
    AND TABLE_NAME = 'Card'
    AND INDEX_NAME = 'uq_card_player_match_type'
  LIMIT 1
")"

if [ "$CARD_UNIQUE_EXISTS" != "1" ]; then
  echo "🧱 Ajout de la contrainte unique Card(playerId, matchId, type)..."
  docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -e "
    ALTER TABLE Card
      ADD UNIQUE INDEX uq_card_player_match_type (playerId, matchId, type);
  "
  echo "✅ Contrainte unique Card ajoutée."
else
  echo "✅ Contrainte unique Card déjà présente."
fi

# billetterie a besoin de payer via Paymee (voir payment-api/src/payment/
# providers/paymee/paymee.mapper.ts), qui exige firstName/lastName/
# phoneNumber du payeur — des champs que le profil MEMBER de `sso` ne
# collectait pas. Ajoutés NULL (optionnels : ne bloque ni l'inscription
# email/mot de passe ni la connexion Google) — remplissables après coup sur
# /membre/profil (sso).
echo "🔧 Vérification du schéma (User.firstName/lastName/phoneNumber)..."
USER_FIRSTNAME_EXISTS="$(docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -Nse "
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'foot'
    AND TABLE_NAME = 'User'
    AND COLUMN_NAME = 'firstName'
  LIMIT 1
")"

if [ "$USER_FIRSTNAME_EXISTS" != "1" ]; then
  echo "🧱 Ajout des colonnes User.firstName/lastName/phoneNumber..."
  docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -e "
    ALTER TABLE User
      ADD COLUMN firstName varchar(191) NULL AFTER teamId,
      ADD COLUMN lastName varchar(191) NULL AFTER firstName,
      ADD COLUMN phoneNumber varchar(30) NULL AFTER lastName;
  "
  echo "✅ Colonnes User.firstName/lastName/phoneNumber ajoutées."
else
  echo "✅ Colonnes User.firstName/lastName/phoneNumber déjà présentes."
fi

# ── Nettoyage à la sortie (Ctrl+C arrête les applications) ──────────────────
trap 'echo; echo "🛑 Arrêt des applications..."; kill 0' EXIT INT TERM

# ── sso sur le port 3004 (authentification centralisée : émet le cookie JWT
# partagé par toutes les autres apps — doit tourner avant qu'un login soit
# possible ailleurs) ──────────────────────────────────────────────────────────
if [ -f "$ROOT_DIR/sso/.env.local" ]; then
  echo "🚀 Lancement de sso sur http://localhost:3004 ..."
  (cd "$ROOT_DIR/sso" && PORT=3004 pnpm run dev 2>&1 | sed -u 's/^/[sso]        /') &
else
  echo "⚠️  sso/.env.local absent : sso n'est pas démarré (copier sso/env.example → sso/.env.local pour l'activer). Les autres apps ne pourront pas authentifier tant qu'il ne tourne pas."
fi

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
