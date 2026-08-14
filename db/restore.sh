#!/bin/bash
set -euo pipefail

# Restauration d'un backup produit par backup.sh : écrase la base `foot`
# actuelle (mariadb_container) et les dossiers d'uploads applicatifs.
#
# Usage :
#   ./restore.sh [chemin-du-backup] [-y|--yes]
#   - chemin-du-backup : un dossier db/backups/<horodatage> (par défaut, le
#     plus récent).
#   - -y/--yes : ne pas demander de confirmation (automatisation/CI).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ASSUME_YES=0
BACKUP_DIR=""
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    *) BACKUP_DIR="$arg" ;;
  esac
done

if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$(ls -1dt "$ROOT_DIR"/db/backups/*/ 2>/dev/null | head -1 || true)"
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Aucun backup trouvé. Usage: $0 [chemin-du-backup] [-y|--yes]"
  echo "   (par défaut, restaure le plus récent dossier de db/backups/)"
  exit 1
fi
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"

if [ -f "$ROOT_DIR/referee-center/.env.local" ]; then
  set -a
  source "$ROOT_DIR/referee-center/.env.local"
  set +a
fi

: "${DB_USER:?DB_USER manquant dans referee-center/.env.local}"
: "${DB_PASSWORD:?DB_PASSWORD manquant dans referee-center/.env.local}"

if ! docker ps --format '{{.Names}}' | grep -q '^mariadb_container$'; then
  echo "❌ mariadb_container n'est pas démarré. Lancez ./start.sh d'abord."
  exit 1
fi

echo "⚠️  Ceci va ÉCRASER la base 'foot' actuelle et les dossiers d'uploads"
echo "   avec le contenu de : $BACKUP_DIR"
if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Continuer ? (taper 'oui' pour confirmer) " CONFIRM
  if [ "$CONFIRM" != "oui" ]; then
    echo "Annulé."
    exit 1
  fi
fi

if [ -f "$BACKUP_DIR/foot.sql.gz" ]; then
  echo "📦 Restauration de la base foot..."
  gunzip -c "$BACKUP_DIR/foot.sql.gz" | docker exec -i mariadb_container mariadb -u"$DB_USER" -p"$DB_PASSWORD" foot
  echo "✅ Base restaurée."
else
  echo "⚠️  Pas de foot.sql.gz dans $BACKUP_DIR, base non restaurée."
fi

if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
  echo "📦 Restauration des uploads..."
  tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$ROOT_DIR"
  echo "✅ Uploads restaurés."
else
  echo "⚠️  Pas de uploads.tar.gz dans $BACKUP_DIR, uploads non restaurés."
fi

echo
echo "🎉 Restauration terminée depuis : $BACKUP_DIR"
