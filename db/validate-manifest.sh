#!/bin/bash
set -euo pipefail

# TASK-P0-017 (todo.md) : "CI pré-deploy check conflits migrations" — check
# purement filesystem (pas de DB requise, contrairement à migrate.sh
# --status), donc utilisable dans un job CI sans service MySQL/MariaDB.
# Détecte le cas qui a causé le déclenchement de cette tâche : une migration
# ajoutée sous <app>/sql|mysql|migrations/migration_*.sql mais jamais
# ajoutée à db/migrations.manifest — silencieusement absente de tout
# déploiement qui passe par migrate.sh, alors qu'elle existe déjà en dev
# local (appliquée à la main).
#
# Usage: ./db/validate-manifest.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/db/migrations.manifest"

if [ ! -f "$MANIFEST" ]; then
  echo "❌ Manifest introuvable : $MANIFEST"
  exit 1
fi

FAILED=0

# --- 1. Chaque entrée du manifest existe sur disque ---
while IFS= read -r line; do
  [ -f "$ROOT_DIR/$line" ] && continue
  echo "❌ Listée dans le manifest mais introuvable sur disque : $line"
  FAILED=1
done < <(grep -vE '^\s*(#|$)' "$MANIFEST")

# --- 2. Aucune entrée dupliquée dans le manifest ---
duplicates="$(grep -vE '^\s*(#|$)' "$MANIFEST" | sort | uniq -d)"
if [ -n "$duplicates" ]; then
  echo "❌ Entrée(s) dupliquée(s) dans le manifest :"
  echo "$duplicates" | sed 's/^/   /'
  FAILED=1
fi

# --- 3. Tout fichier migration_*.sql sur disque est référencé dans le
#        manifest, sauf les copies identiques documentées ci-dessous (même
#        liste que l'en-tête de db/migrations.manifest — tenue à jour
#        manuellement à chaque nouvelle copie cross-app intentionnelle). ---
EXCLUDED_COPIES=(
  "arbinote/migrations/add_is_active_to_federations.sql"
  "arbinote/migrations/add_is_active_to_leagues.sql"
  "arbinote/migrations/add_unique_vote_per_match_device.sql"
  "arbinote/migrations/add_team_branding.sql"
  "arbinote/migrations/add_team_branding_icons.sql"
  "arbinote/mysql/migration_add_audit_logs.sql"
  "arbinote/mysql/migration_add_ip_address_to_votes.sql"
  "arbinote/mysql/migration_add_team_fields.sql"
  "arbinote/mysql/migration_add_team_gender_and_youth_categories.sql"
  "arbinote/mysql/migration_add_tournois_type.sql"
  "arbinote/mysql/migration_add_vote_alerts.sql"
  "arbinote/mysql/migration_add_vote_moderation.sql"
  "arbinote/mysql/migration_add_staff_invitations.sql"
  "arbinote/mysql/migration_add_match_actual_times.sql"
  "matchsheet/sql/migration_add_card_unique_constraint.sql"
  "teamManager/sql/migration_add_team_gender_and_youth_categories.sql"
)

is_excluded() {
  local candidate="$1"
  for excluded in "${EXCLUDED_COPIES[@]}"; do
    [ "$candidate" = "$excluded" ] && return 0
  done
  return 1
}

while IFS= read -r found; do
  relative="${found#"$ROOT_DIR"/}"
  grep -qxF "$relative" <(grep -vE '^\s*(#|$)' "$MANIFEST") && continue
  is_excluded "$relative" && continue
  echo "❌ Migration présente sur disque mais absente du manifest (et non listée comme copie exclue) : $relative"
  FAILED=1
done < <(find "$ROOT_DIR" \
  \( -path "*/sql/migration_*.sql" -o -path "*/mysql/migration_*.sql" -o -path "*/migrations/*.sql" \) \
  -not -path "*/node_modules/*" | sort)

if [ "$FAILED" = "1" ]; then
  echo
  echo "❌ db/migrations.manifest désynchronisé — voir erreurs ci-dessus."
  exit 1
fi

echo "✅ db/migrations.manifest cohérent avec les fichiers de migration sur disque."
