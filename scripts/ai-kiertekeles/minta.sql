-- Egy felhasználó elemzett híreinek lekérdezése a kiértékeléshez (csak olvas).
-- Használat a README szerint: psql --csv -v email=... < minta.sql
SELECT
    h.id AS hir_id,
    h.cim,
    h.url,
    h.tartalom,
    f.forras_nev,
    a.hangulat,
    a.pontszam AS hirertek,
    a.clickbait,
    a.osszefoglalo,
    a.hasznalt_modell,
    a.elemzes_datuma
FROM "AiElemzesek" a
JOIN "Hirek" h ON h.id = a.hir_id
JOIN "HirForrasok" f ON f.id = h.forras_id
JOIN "Felhasznalok" u ON u.id = f.felhasznalo_id
WHERE u.email = :'email'
ORDER BY a.elemzes_datuma DESC;
