#!/bin/sh
# News Trends konténer indítószkript
set -e

# Adatbázis séma szinkronizálása (a projekt "prisma db push" alapú, migrációs fájlok nélkül).
# Adatvesztéssel járó változtatásnál a parancs hibával leáll, így a konténer sem indul el – ez a biztonságos viselkedés.
echo "[entrypoint] Adatbázis séma szinkronizálása..."
npx prisma db push --skip-generate

echo "[entrypoint] News Trends indítása a(z) ${PORT:-3000} porton..."
exec node build
