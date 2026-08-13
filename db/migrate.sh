#!/bin/bash
set -euo pipefail

# Outillage de migrations partagé pour la base MariaDB `foot` — voir
# avancement.md, "Outillage de migrations partagé et ordre d'application
# des scripts SQL" : jusqu'ici les migrations restaient dispersées par app
# (sql/, mysql/, migrations/), sans table de version globale ni ordre
# d'application reproductible.
#
# Applique, dans l'ordre, les migrations listées dans db/migrations.manifest
# (un chemin relatif par ligne) qui n'ont pas encore été appliquées,
# trackées dans une table `schema_migrations` (id = chemin, applied_at).
# Idempotent : ré-exécuter ne rejoue jamais une migration déjà enregistrée.
#
# Usage :
#   ./migrate.sh              Applique les migrations en attente.
#   ./migrate.sh --status     Liste les migrations appliquées/en attente, ne modifie rien.
#   ./migrate.sh --dry-run    Comme --status, mais affiché comme un plan d'exécution.
#   ./migrate.sh --baseline   Marque TOUTES les migrations du manifest comme déjà
#                             appliquées, SANS les exécuter — pour adopter cet outil sur
#                             une base de dev existante qui a déjà ces deltas (appliqués
#                             à la main au fil du temps avant l'existence de cet outil).
#
# Ne remplace pas db/foot.sql (dump de bootstrap du schéma de base) : voir
# db/migrations.manifest pour ce qui est volontairement exclu (dumps
# complets, scripts destructifs, données de seed) et pourquoi.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/db/migrations.manifest"

MODE="apply"
for arg in "$@"; do
  case "$arg" in
    --status) MODE="status" ;;
    --dry-run) MODE="dry-run" ;;
    --baseline) MODE="baseline" ;;
    *)
      echo "❌ Option inconnue : $arg"
      echo "Usage: $0 [--status|--dry-run|--baseline]"
      exit 1
      ;;
  esac
done

if [ -f "$ROOT_DIR/arbinote/.env.local" ]; then
  set -a
  source "$ROOT_DIR/arbinote/.env.local"
  set +a
fi

: "${DB_USER:?DB_USER manquant dans arbinote/.env.local}"
: "${DB_PASSWORD:?DB_PASSWORD manquant dans arbinote/.env.local}"

if ! docker ps --format '{{.Names}}' | grep -q '^mariadb_container$'; then
  echo "❌ mariadb_container n'est pas démarré. Lancez ./start.sh d'abord."
  exit 1
fi

mariadb_exec() {
  docker exec -i mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot
}

mariadb_query() {
  docker exec mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot -Nse "$1"
}

# TASK-P0-017 (todo.md) : deux exécutions concurrentes de ce script (deux
# pipelines de déploiement lancés en même temps, ou un run bloqué relancé
# sans attendre) pouvaient toutes deux voir la même migration comme "en
# attente" et l'appliquer deux fois en parallèle — au mieux une erreur
# (CREATE TABLE déjà existante), au pire une ALTER TABLE partiellement
# rejouée. `GET_LOCK`/`RELEASE_LOCK` sont des verrous nommés MySQL/MariaDB
# scopés à LA CONNEXION qui les détient : chaque appel `mariadb_query`/
# `mariadb_exec` ci-dessus ouvre une nouvelle connexion (donc un nouveau
# scope de verrou), il faut donc une connexion persistante dédiée pour tenir
# le verrou pendant toute la durée du apply — d'où le coprocess ci-dessous,
# gardé ouvert du début à la fin du mode "apply" et fermé par le `trap`
# (fermer la connexion relâche aussi le verrou automatiquement côté MySQL,
# filet de sécurité si RELEASE_LOCK explicite n'était pas atteint).
#
# ⚠️ Non testé contre une vraie base MariaDB dans cet environnement (pas de
# daemon Docker disponible ici) — à vérifier en dev avant de s'appuyer
# dessus en déploiement (ex: lancer `./migrate.sh` deux fois en parallèle
# et confirmer que la 2e attend puis n'a rien à faire, ou échoue proprement
# après le timeout plutôt que de dupliquer une migration).
MIGRATION_LOCK_NAME="foot_schema_migrations"
MIGRATION_LOCK_TIMEOUT_S=30
DBLOCK_ACQUIRED=0

acquire_migration_lock() {
  coproc DBLOCK { docker exec -i mariadb_container mariadb -N -s -u"$DB_USER" -p"$DB_PASSWORD" foot; }
  echo "SELECT GET_LOCK('$MIGRATION_LOCK_NAME', $MIGRATION_LOCK_TIMEOUT_S);" >&"${DBLOCK[1]}"
  local result
  if ! read -r -t $((MIGRATION_LOCK_TIMEOUT_S + 10)) result <&"${DBLOCK[0]}"; then
    echo "❌ Pas de réponse du verrou de migration (connexion perdue ?)."
    exit 1
  fi
  if [ "$result" != "1" ]; then
    echo "❌ Impossible d'acquérir le verrou de migration '$MIGRATION_LOCK_NAME' après ${MIGRATION_LOCK_TIMEOUT_S}s : une autre exécution de migrate.sh est probablement en cours."
    exit 1
  fi
  DBLOCK_ACQUIRED=1
}

release_migration_lock() {
  if [ "$DBLOCK_ACQUIRED" = "1" ]; then
    echo "SELECT RELEASE_LOCK('$MIGRATION_LOCK_NAME');" >&"${DBLOCK[1]}" 2>/dev/null || true
  fi
  exec {DBLOCK[1]}>&- 2>/dev/null || true
}

mariadb_exec >/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

if [ ! -f "$MANIFEST" ]; then
  echo "❌ Manifest introuvable : $MANIFEST"
  exit 1
fi

if [ "$MODE" = "apply" ]; then
  trap release_migration_lock EXIT
  acquire_migration_lock
fi

# Chemins non vides, hors commentaires (#).
mapfile -t MIGRATIONS < <(grep -vE '^\s*(#|$)' "$MANIFEST")

APPLIED_COUNT=0
PENDING_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
  file="$ROOT_DIR/$migration"
  if [ ! -f "$file" ]; then
    echo "❌ Migration listée dans le manifest introuvable sur disque : $migration"
    exit 1
  fi

  already_applied="$(mariadb_query "SELECT 1 FROM schema_migrations WHERE id = '$migration' LIMIT 1")"

  if [ "$already_applied" = "1" ]; then
    APPLIED_COUNT=$((APPLIED_COUNT + 1))
    if [ "$MODE" = "status" ] || [ "$MODE" = "dry-run" ]; then
      echo "✅ appliquée   $migration"
    fi
    continue
  fi

  PENDING_COUNT=$((PENDING_COUNT + 1))

  case "$MODE" in
    status|dry-run)
      echo "⏳ en attente  $migration"
      ;;
    baseline)
      mariadb_query "INSERT INTO schema_migrations (id) VALUES ('$migration')" >/dev/null
      echo "📌 baseline    $migration"
      ;;
    apply)
      echo "🚀 application $migration ..."
      mariadb_exec < "$file"
      mariadb_query "INSERT INTO schema_migrations (id) VALUES ('$migration')" >/dev/null
      echo "✅ appliquée   $migration"
      ;;
  esac
done

echo
case "$MODE" in
  status|dry-run)
    echo "📊 $APPLIED_COUNT appliquée(s), $PENDING_COUNT en attente."
    ;;
  baseline)
    echo "📌 $PENDING_COUNT migration(s) marquée(s) comme déjà appliquées (baseline), $APPLIED_COUNT déjà trackées."
    ;;
  apply)
    echo "🎉 $PENDING_COUNT migration(s) appliquée(s), $APPLIED_COUNT étaient déjà à jour."
    ;;
esac
