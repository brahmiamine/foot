#!/bin/bash
set -euo pipefail

# Charger .env.local (mots de passe DB, jamais commité dans git)
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

: "${DB_PASSWORD:?DB_PASSWORD manquant dans .env.local}"
: "${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD manquant dans .env.local}"

echo "🔍 Vérification si Docker est en cours d'exécution..."
if ! sudo docker info >/dev/null 2>&1; then
  echo "⚠️ Docker n'est pas en cours d'exécution. Tentative de démarrage..."
  sudo service docker start

  # Attendre que Docker soit réellement disponible avec une boucle de vérification
  echo "⏳ Attente du démarrage de Docker (peut prendre jusqu'à 30 secondes)..."
  attempts=0
  max_attempts=6  # 6 tentatives à 5 secondes = 30 secondes max

  while ! sudo docker info >/dev/null 2>&1; do
    attempts=$((attempts+1))
    if [ $attempts -ge $max_attempts ]; then
      echo "❌ Échec du démarrage de Docker après 30 secondes. Vérifiez votre installation."
      echo "   Exécutez la commande: sudo service docker status  "
      exit 1
    fi
    echo "  ⏳ Attente... ($attempts/$max_attempts)"
    sleep 5
  done
fi

echo "✅ Docker est actif."

# mariadb_container est désormais PARTAGÉ avec l'app "ob" (gestion disciplinaire) —
# les deux apps lisent/écrivent la même base "foot". On ne le détruit donc plus
# à chaque lancement (ça couperait la connexion d'ob), on se contente de le
# démarrer s'il n'existe pas encore ou s'il est arrêté. Port 3307 (3306 est occupé
# par l'ancien conteneur dédié d'ob, conservé arrêté pour référence/rollback).
if docker ps --format '{{.Names}}' | grep -q '^mariadb_container$'; then
  echo "🐳 mariadb_container déjà en cours d'exécution (base partagée avec ob)."
elif docker ps -a --format '{{.Names}}' | grep -q '^mariadb_container$'; then
  echo "🐳 Redémarrage de mariadb_container existant..."
  docker start mariadb_container >/dev/null
else
  echo "🐳 Première création de mariadb_container (base partagée avec ob)..."
  sudo docker run -d --name mariadb_container -p 127.0.0.1:3307:3306 \
    -v mariadb_data:/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
    -e MYSQL_DATABASE=foot \
    -e MYSQL_USER=arbitres \
    -e MYSQL_PASSWORD="$DB_PASSWORD" \
    mariadb:latest
fi

if docker ps --format '{{.Names}}' | grep -q '^phpmyadmin_container$'; then
  echo "🖥️ phpmyadmin_container déjà en cours d'exécution."
elif docker ps -a --format '{{.Names}}' | grep -q '^phpmyadmin_container$'; then
  docker start phpmyadmin_container >/dev/null
else
  echo "🖥️ Création et démarrage de phpMyAdmin..."
  sudo docker run -d --name phpmyadmin_container -p 127.0.0.1:9090:80 \
    --link mariadb_container:db \
    -e PMA_HOST=mariadb_container \
    -e PMA_PORT=3306 \
    -e PMA_USER=arbitres \
    -e PMA_PASSWORD="$DB_PASSWORD" \
    phpmyadmin/phpmyadmin
fi


echo "🚀 Lancement de NextJS avec Node..."
pnpm run dev
