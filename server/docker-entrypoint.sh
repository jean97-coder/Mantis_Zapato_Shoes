#!/bin/sh
set -e

echo "Sincronizando el esquema de Prisma con la base de datos..."
npx prisma db push --skip-generate

echo "Iniciando JC SHOE'S API..."
exec node dist/index.js
