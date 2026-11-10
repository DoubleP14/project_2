#!/usr/bin/env bash
# A napi adatbázis-mentés próba-visszaállítása egy ideiglenes, különálló Postgres-konténerbe.
# Ellenőrzi, hogy a mentés ép, hiba nélkül betölthető, és összeveti a táblák sorainak számát az élessel.
# Az éles adatbázist csak olvassa (sorok számlálása), és az ideiglenes konténer a végén mindig törlődik.
#
# Használat a szerveren, a projekt mappájából:
#   bash deploy/mentes-proba.sh                       # a legutóbbi mentés
#   bash deploy/mentes-proba.sh backups/<fajl>.sql.gz  # egy megadott mentés
set -euo pipefail
cd "$(dirname "$0")/.."

FAJL="${1:-$(ls -t backups/newstrends_*.sql.gz 2>/dev/null | head -1 || true)}"
if [ -z "$FAJL" ] || [ ! -f "$FAJL" ]; then
    echo "Nem található mentés (backups/newstrends_*.sql.gz)."
    exit 1
fi

# Az éles adatbázis elérése. Teszteléshez DB_KONTENER-rel egy másik konténer adható meg.
eles() {
    if [ -n "${DB_KONTENER:-}" ]; then docker exec -i "$DB_KONTENER" sh -c "$1"; else docker compose exec -T db sh -c "$1"; fi
}

KONTENER="mentes-proba-$$"
trap 'docker rm -f "$KONTENER" >/dev/null 2>&1 || true' EXIT

echo "Mentés: $FAJL ($(du -h "$FAJL" | cut -f1), készült: $(date -r "$FAJL" '+%Y-%m-%d %H:%M'))"

gunzip -t "$FAJL"
# Egy sikertelen pg_dump is ép, de üres gzip-fájlt hoz létre, ezért a pg_dump záró sorát is keressük
if ! gunzip -c "$FAJL" | tail -n 5 | grep -q 'PostgreSQL database dump complete'; then
    echo "HIBA: a mentés üres vagy félbeszakadt (hiányzik a pg_dump záró sora)."
    exit 1
fi
echo "1/4 A tömörített fájl ép, és teljes mentést tartalmaz."

# Az ideiglenes adatbázis ugyanazzal a felhasználó- és adatbázisnévvel indul, így a mentés tulajdonosi beállításai is érvényesek
DB_USER=$(eles 'printf %s "$POSTGRES_USER"')
DB_NEV=$(eles 'printf %s "$POSTGRES_DB"')
docker run -d --name "$KONTENER" -e POSTGRES_PASSWORD=ideiglenes -e POSTGRES_USER="$DB_USER" -e POSTGRES_DB="$DB_NEV" postgres:17 >/dev/null

# TCP-n várunk: az első indításkori ideiglenes szerver csak a belső socketen figyel, így nem kapcsolódunk túl korán
for _ in $(seq 60); do
    docker exec "$KONTENER" pg_isready -q -h 127.0.0.1 -U "$DB_USER" && break
    sleep 1
done

proba() { docker exec -i "$KONTENER" psql -q -h 127.0.0.1 -U "$DB_USER" -d "$DB_NEV" -v ON_ERROR_STOP=1 "$@"; }

gunzip -c "$FAJL" | proba >/dev/null
echo "2/4 A mentés hiba nélkül betöltődött egy ideiglenes adatbázisba."

echo "3/4 Sorok száma (mentés / éles). A mentés legfeljebb egynapos, ezért kisebb eltérés várható:"
for TABLA in Felhasznalok HirForrasok Hirek AiElemzesek Ertesitesek RendszerNaplo FelhasznaloKulcsszavak; do
    MENTES=$(proba -tA -c "SELECT count(*) FROM \"$TABLA\"")
    ELES=$(eles "psql -tA -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c 'SELECT count(*) FROM \"$TABLA\"'")
    printf '    %-24s %8s / %s\n' "$TABLA" "$MENTES" "$ELES"
done

echo "4/4 Az ideiglenes adatbázis törlődik. Az éles adatbázis nem változott."
