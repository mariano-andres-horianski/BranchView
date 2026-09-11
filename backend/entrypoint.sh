#!/bin/sh
set -e

echo "Esperando a que la base de datos esté lista..."
until python -c "
import sys, psycopg2, os
from urllib.parse import urlparse
db_url = os.environ.get('DATABASE_URL', '')
if not db_url:
    sys.exit(0)
r = urlparse(db_url)
try:
    conn = psycopg2.connect(
        dbname=r.path[1:],
        user=r.username,
        password=r.password,
        host=r.hostname,
        port=r.port or 5432
    )
    conn.close()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
"; do
  echo "PostgreSQL no disponible todavía. Esperando 1 segundo..."
  sleep 1
done

echo "Ejecutando migraciones de base de datos..."
alembic upgrade head

echo "Ejecutando seed de datos iniciales..."
python seed.py

echo "Iniciando servidor FastAPI en puerto 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
