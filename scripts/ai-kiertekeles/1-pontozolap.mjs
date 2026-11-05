// 1. lépés: az exportból pontozólapot készít. Az AI pontszámai külön fájlba kerülnek,
// hogy a kézi pontozást ne befolyásolják ("vak" pontozás).
// Használat: node scripts/ai-kiertekeles/1-pontozolap.mjs [--db 60] [--mag 42]
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { csvBeolvas, csvKiir, fajlSzoveg, jevSorE, reteg, retegzettMinta } from './kozos.mjs';

const { values: opciok } = parseArgs({
    options: {
        db: { type: 'string', default: '60' },
        mag: { type: 'string', default: '42' },
        mappa: { type: 'string', default: join(dirname(fileURLToPath(import.meta.url)), 'munka') },
        felulir: { type: 'boolean', default: false }
    }
});

const mintaFajl = join(opciok.mappa, 'minta.csv');
const lapFajl = join(opciok.mappa, 'pontozolap.csv');
const kulcsFajl = join(opciok.mappa, 'kulcs.csv');

if (!existsSync(mintaFajl)) {
    console.error(`Nem található: ${mintaFajl}\nElőbb töltsd le az exportot (lásd README.md).`);
    process.exit(1);
}
// Egy újrafuttatás ne írhassa felül a már kitöltött lapot
if (existsSync(lapFajl) && !opciok.felulir) {
    console.error(`Már létezik: ${lapFajl}\nHa tényleg új lapot szeretnél, add hozzá a --felulir kapcsolót (a kitöltött pontok elvesznek).`);
    process.exit(1);
}

const sorok = csvBeolvas(fajlSzoveg(mintaFajl)).filter((s) => s.hir_id && s.cim);
const darab = Number(opciok.db);
if (sorok.length < darab) console.warn(`Figyelem: csak ${sorok.length} elemzés van, a kért ${darab} helyett ennyiből készül a lap.`);

const minta = retegzettMinta(sorok, darab, Number(opciok.mag));
mkdirSync(opciok.mappa, { recursive: true });

csvKiir(
    lapFajl,
    ['sorszam', 'cim', 'url', 'szoveg', 'sajat_hirertek', 'sajat_clickbait', 'sajat_hangulat', 'ai_osszefoglalo', 'osszefoglalo_pontos', 'megjegyzes'],
    minta.map((s, i) => ({
        sorszam: i + 1,
        cim: s.cim,
        url: s.url,
        szoveg: (s.tartalom ?? '').slice(0, 2500), // Az AI is legfeljebb ennyit kap a cikkből
        ai_osszefoglalo: jevSorE(s) ? '(előszűrve, nincs összefoglaló)' : s.osszefoglalo,
        osszefoglalo_pontos: jevSorE(s) ? '-' : ''
    }))
);

csvKiir(
    kulcsFajl,
    ['sorszam', 'hir_id', 'reteg', 'hasznalt_modell', 'hirertek', 'clickbait', 'hangulat'],
    minta.map((s, i) => ({ sorszam: i + 1, hir_id: s.hir_id, reteg: reteg(s), hasznalt_modell: s.hasznalt_modell, hirertek: s.hirertek, clickbait: s.clickbait, hangulat: s.hangulat }))
);

const retegDb = minta.reduce((d, s) => ({ ...d, [reteg(s)]: (d[reteg(s)] ?? 0) + 1 }), {});
console.log(`Kész: ${minta.length} cikk (összesen ${sorok.length} elemzésből, mag: ${opciok.mag}).`);
console.log('Rétegek:', retegDb);
console.log(`Pontozólap: ${lapFajl}`);
console.log(`Az AI pontszámai itt vannak, pontozás előtt NE nyisd meg: ${kulcsFajl}`);
