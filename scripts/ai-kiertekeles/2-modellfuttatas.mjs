// 2. lépés (nem kötelező): ugyanazokat a cikkeket más modellel is elemezteti, az éles rendszer kódjával és promptjával.
// A kulcsot csak környezeti változóból olvassa, így nem kerül a parancssori előzményekbe vagy fájlba.
// Használat: node scripts/ai-kiertekeles/2-modellfuttatas.mjs --szolgaltato GROQ --modell openai/gpt-oss-120b
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { csvBeolvas, fajlSzoveg } from './kozos.mjs';

const OSZLOPOK = ['sorszam', 'hirertek', 'clickbait', 'hangulat', 'ido_ms', 'osszefoglalo'];
const cella = (e) => `"${String(e ?? '').replaceAll('"', '""')}"`;

export const futasFajlNev = (modell) => `futas-${modell.replace(/[^A-Za-z0-9._-]+/g, '_')}.csv`;

// Csak a még hiányzó cikkeket elemzi, így egy megszakadt futás folytatható.
// Kvótahibánál leáll; a többi hibánál továbblép, de 3 egymás utáni hiba után megáll, hogy ne fogyjon feleslegesen a keret.
export async function futtatas({ cikkek, marKesz, elemzo, ment, varakozas = () => Promise.resolve(), naplo = () => {} }) {
    let sikeres = 0;
    let hibas = 0;
    let egymasUtan = 0;
    for (const cikk of cikkek) {
        if (marKesz.has(cikk.sorszam)) continue;
        const kezdet = Date.now();
        const e = await elemzo(cikk.cim, (cikk.tartalom || cikk.cim).slice(0, 2500));
        const ido = Date.now() - kezdet;

        if (e.hiba === 'QUOTA') {
            naplo('A szolgáltató kerete kimerült, a futás leáll. Később ugyanezzel a paranccsal folytatható.');
            return { sikeres, hibas, leallt: true };
        }
        if (e.hiba) {
            hibas++;
            egymasUtan++;
            naplo(`Hiba a(z) ${cikk.sorszam}. cikknél: ${e.hibaUzenet}`);
            if (egymasUtan >= 3) {
                naplo('3 egymás utáni hiba, a futás leáll. Ellenőrizd a kulcsot és a modell nevét.');
                return { sikeres, hibas, leallt: true };
            }
            continue;
        }
        egymasUtan = 0;
        sikeres++;
        ment({ sorszam: cikk.sorszam, hirertek: e.pontszam, clickbait: e.clickbait, hangulat: e.hangulat, ido_ms: ido, osszefoglalo: e.osszefoglalo });
        naplo(`${sikeres + marKesz.size}/${cikkek.length} kész`);
        await varakozas();
    }
    return { sikeres, hibas, leallt: false };
}

async function fo() {
    const { values: o } = parseArgs({
        options: {
            szolgaltato: { type: 'string' },
            modell: { type: 'string' },
            szunet: { type: 'string', default: '4000' },
            mappa: { type: 'string', default: join(dirname(fileURLToPath(import.meta.url)), 'munka') }
        }
    });
    const kulcs = process.env.AI_KULCS;
    if (!o.szolgaltato || !o.modell || !kulcs) {
        console.error('Add meg: --szolgaltato (GROQ, OPENAI, GOOGLE, ANTHROPIC), --modell, és az AI_KULCS környezeti változót.');
        process.exit(1);
    }

    const { createAiService } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '../../src/lib/server/services/aiService.ts')).href);
    const ai = createAiService();

    const reszletek = new Map(csvBeolvas(fajlSzoveg(join(o.mappa, 'minta.csv'))).map((s) => [s.hir_id, s]));
    const cikkek = csvBeolvas(fajlSzoveg(join(o.mappa, 'kulcs.csv'))).map((k) => ({ sorszam: k.sorszam, ...reszletek.get(k.hir_id) }));

    const kimenet = join(o.mappa, futasFajlNev(o.modell));
    if (!existsSync(kimenet)) writeFileSync(kimenet, `﻿${OSZLOPOK.join(';')}\r\n`, 'utf8');
    const marKesz = new Set(csvBeolvas(fajlSzoveg(kimenet)).map((s) => s.sorszam));

    const szunet = Number(o.szunet);
    const eredmeny = await futtatas({
        cikkek,
        marKesz,
        elemzo: (cim, szoveg) => ai.hirElemzese(cim, szoveg, o.szolgaltato, o.modell, kulcs),
        ment: (s) => appendFileSync(kimenet, `${OSZLOPOK.map((k) => cella(s[k])).join(';')}\r\n`, 'utf8'),
        varakozas: () => new Promise((r) => setTimeout(r, szunet)),
        naplo: console.log
    });
    console.log(`Vége: ${eredmeny.sikeres} sikeres, ${eredmeny.hibas} hibás. Fájl: ${kimenet}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await fo();
