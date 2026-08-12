#!/bin/bash
set -euo pipefail

# Sauvegarde de la base MariaDB `foot` (mariadb_container, voir ../start.sh)
# et des dossiers d'uploads applicatifs (arbinote/superadmin/teamManager) —
# jusqu'ici jamais testée au-delà du volume Docker local (voir
# avancement.md). Écrit un dump SQL compressé + une archive des uploads dans
# db/backups/<horodatage>/. Voir restore.sh pour la restauration.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT_DIR/db/backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📦 Dump de la base foot..."
docker exec mariadb_container mariadb-dump \
  -u"$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers \
  foot | gzip > "$BACKUP_DIR/foot.sql.gz"
echo "✅ Dump écrit : $BACKUP_DIR/foot.sql.gz"

# Dossiers d'uploads connus (voir avancement.md) — absents en toute
# légitimité sur un checkout qui n'a jamais servi d'upload, on les ignore
# silencieusement plutôt que d'échouer.
UPLOAD_DIRS=(arbinote/public/uploads superadmin/public/uploads teamManager/public/uploads)
EXISTING_UPLOAD_DIRS=()
for dir in "${UPLOAD_DIRS[@]}"; do
  if [ -d "$ROOT_DIR/$dir" ]; then
    EXISTING_UPLOAD_DIRS+=("$dir")
  fi
done

if [ ${#EXISTING_UPLOAD_DIRS[@]} -gt 0 ]; then
  echo "📦 Archive des uploads (${EXISTING_UPLOAD_DIRS[*]})..."
  tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$ROOT_DIR" "${EXISTING_UPLOAD_DIRS[@]}"
  echo "✅ Archive écrite : $BACKUP_DIR/uploads.tar.gz"
else
  echo "⚠️  Aucun dossier d'uploads trouvé, ignoré."
fi

echo
echo "🎉 Backup terminé : $BACKUP_DIR"
du -sh "$BACKUP_DIR"/* 2>/dev/null || true
