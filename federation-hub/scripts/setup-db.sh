#!/usr/bin/env zsh

# Script pour appliquer le schéma MySQL local

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
DROP_SQL_FILE="$ROOT_DIR/mysql/drop-old-schema.sql"
SQL_FILE="$ROOT_DIR/mysql/arbitres.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Erreur: Fichier $SQL_FILE non trouvé"
  exit 1
fi

if [ ! -f "$DROP_SQL_FILE" ]; then
  echo "❌ Erreur: Fichier $DROP_SQL_FILE non trouvé"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-referee-center}

echo "🗄️  Configuration de la base MySQL locale"
echo ""
echo "Utilisation des paramètres:"
echo "  • Hôte      : $DB_HOST"
echo "  • Port      : $DB_PORT"
echo "  • Base      : $DB_NAME"
echo "  • Utilisateur: $DB_USER"
echo ""

DOCKER_CONTAINER=${DOCKER_DB_CONTAINER:-mariadb_container}
if docker ps --format '{{.Names}}' | grep -qx "$DOCKER_CONTAINER"; then
  echo "🐳 Conteneur Docker '$DOCKER_CONTAINER' détecté, utilisation de docker exec..."
  echo "🗑️  Suppression de l'ancien schéma..."
  docker exec -i \
    -e DB_USER="$DB_USER" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e DB_NAME="$DB_NAME" \
    "$DOCKER_CONTAINER" \
    sh -c '
      if command -v mariadb >/dev/null 2>&1; then
        mariadb -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
      elif command -v mysql >/dev/null 2>&1; then
        mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
      else
        echo "❌ Aucun client MySQL/MariaDB disponible dans le conteneur." >&2
        exit 1
      fi
    ' < "$DROP_SQL_FILE"
  echo "📋 Import du nouveau schéma depuis $SQL_FILE ..."
  docker exec -i \
    -e DB_USER="$DB_USER" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e DB_NAME="$DB_NAME" \
    "$DOCKER_CONTAINER" \
    sh -c '
      if command -v mariadb >/dev/null 2>&1; then
        mariadb -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
      elif command -v mysql >/dev/null 2>&1; then
        mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
      else
        echo "❌ Aucun client MySQL/MariaDB disponible dans le conteneur." >&2
        exit 1
      fi
    ' < "$SQL_FILE"
else
  echo "⚠️  Aucun conteneur Docker '$DOCKER_CONTAINER' trouvé. Utilisation du client local mysql."
  if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  DB_PASSWORD n'est pas défini. Le client MySQL vous demandera un mot de passe."
    MYSQL_CMD=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME")
  else
    MYSQL_CMD=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASSWORD" "$DB_NAME")
  fi
  echo "🗑️  Suppression de l'ancien schéma..."
  "${MYSQL_CMD[@]}" < "$DROP_SQL_FILE"
  echo "📋 Import du nouveau schéma depuis $SQL_FILE ..."
  "${MYSQL_CMD[@]}" < "$SQL_FILE"
fi

echo ""
echo "✅ Base de données importée avec succès depuis $SQL_FILE"
echo ""
