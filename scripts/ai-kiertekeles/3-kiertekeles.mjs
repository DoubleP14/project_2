// 3. lépés: a kitöltött pontozólapból mérőszámokat számol, és eredmeny.md fájlba írja őket.
// A teljes export automatikus vizsgálata kézi pontozás nélkül is lefut (--csak-export).
// Használat: node scripts/ai-kiertekeles/3-kiertekeles.mjs
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { csvBeolvas, exportVizsgalat, fajlSzoveg, hangulatMeres, hangulatNormal, HANGULATOK, jevSorE, KORABBI_PROMPT_PELDAK, pontszamMeres, promptPeldak, szivargasE } from './kozos.mjs';

const AI_SERVICE = join(dirname(fileURLToPath(import.meta.url)), '../../src/lib/server/services/aiService.ts');

const szam = (x, t = 2) => (x === undefined || Number.isNaN(x) ? 'n. a.' : x.toFixed(t).replace('.', ','));
const szazalek = (x) => (x === undefined || Number.isNaN(x) ? 'n. a.' : `${(x * 100).toFixed(1).replace('.', ',')}%`);

// A kitöltött sorok ellenőrzése: az értelmezhetetlen értéket nem javítjuk ki csendben, hanem jelezzük
export function pontozolapBeolvasas(lapSorok) {
    const kitoltott = [];
    const hibak = [];
    let hianyos = 0;

    for (const s of lapSorok) {
        const nyers = [s.sajat_hirertek, s.sajat_clickbait, s.sajat_hangulat].map((x) => String(x ?? '').trim());
        if (nyers.every((x) => x === '')) {
            hianyos++;
            continue;
        }
        const hirertek = Number(nyers[0].replace(',', '.'));
        const clickbait = Number(nyers[1].replace(',', '.'));
        const hangulat = hangulatNormal(nyers[2]);
        const rendben = (x, n) => n !== '' && Number.isFinite(x) && x >= 0 && x <= 100;
        const pontos = String(s.osszefoglalo_pontos ?? '').trim();

        const gond = [];
        if (!rendben(hirertek, nyers[0])) gond.push('sajat_hirertek 0-100 között legyen');
        if (!rendben(clickbait, nyers[1])) gond.push('sajat_clickbait 0-100 között legyen');
        if (!hangulat) gond.push('sajat_hangulat P, S vagy N legyen');
        if (!['', '-', '0', '1', '2'].includes(pontos)) gond.push('osszefoglalo_pontos 0, 1 vagy 2 legyen');

        if (gond.length) hibak.push(`${s.sorszam}. sor: ${gond.join('; ')}`);
        else kitoltott.push({ sorszam: s.sorszam, hirertek, clickbait, hangulat, pontos: ['0', '1', '2'].includes(pontos) ? Number(pontos) : null });
    }
    return { kitoltott, hibak, hianyos };
}

function meresTabla(cim, meres) {
    return [
        `### ${cim} (n = ${meres.n})`,
        '',
        '| Mérőszám | Érték |',
        '|---|---|',
        `| Átlagos abszolút eltérés (MAE) | ${szam(meres.mae, 1)} pont (95% CI: ${szam(meres.maeCi[0], 1)}–${szam(meres.maeCi[1], 1)}) |`,
        `| Naiv viszonyítás (mindig az emberi medián) MAE | ${szam(meres.naivMae, 1)} pont |`,
        `| Torzítás (AI − ember) | ${szam(meres.torzitas, 1)} pont |`,
        `| Spearman-korreláció | ${szam(meres.spearman)} (95% CI: ${szam(meres.spearmanCi[0])}–${szam(meres.spearmanCi[1])}) |`,
        `| 15 ponton belüli találat | ${szazalek(meres.tizenotonBelul)} |`,
        `| Egyező sáv (0–30 / 31–70 / 71–100) | ${szazalek(meres.savEgyezes)} |`,
        `| Szórás: AI / ember | ${szam(meres.aiSzoras, 1)} / ${szam(meres.emberSzoras, 1)} |`,
        `| 71+ jelzés: precízió / felidézés / F1 | ${szazalek(meres.kuszob71.precizio)} / ${szazalek(meres.kuszob71.felidezes)} / ${szam(meres.kuszob71.f1)} (TP ${meres.kuszob71.tp}, FP ${meres.kuszob71.fp}, FN ${meres.kuszob71.fn}) |`,
        ''
    ];
}

function hangulatTabla(meres) {
    return [
        `### Hangulat (n = ${meres.n})`,
        '',
        `Pontosság: ${szazalek(meres.pontossag)}, makro-F1: ${szam(meres.makroF1)}, Cohen-kappa: ${szam(meres.kappa)}`,
        '',
        `| Ember \\ AI | ${HANGULATOK.join(' | ')} |`,
        `|---|${HANGULATOK.map(() => '---').join('|')}|`,
        ...HANGULATOK.map((e) => `| ${e} | ${HANGULATOK.map((a) => meres.matrix[e][a]).join(' | ')} |`),
        ''
    ];
}

// Egy modell összevetése az emberi pontokkal
function modellMeres(cim, sorok, ember) {
    const parok = sorok.filter((s) => ember.has(s.sorszam)).map((s) => ({ ai: s, e: ember.get(s.sorszam) }));
    if (parok.length < 2) return [`### ${cim}`, '', 'Nincs elég kitöltött sor.', ''];
    const ervenyesHangulat = parok.filter((p) => hangulatNormal(p.ai.hangulat));
    return [
        `## ${cim}`,
        '',
        ...meresTabla('Hírérték', pontszamMeres(parok.map((p) => Number(p.ai.hirertek)), parok.map((p) => p.e.hirertek))),
        ...meresTabla('Clickbait', pontszamMeres(parok.map((p) => Number(p.ai.clickbait)), parok.map((p) => p.e.clickbait))),
        ...hangulatTabla(hangulatMeres(ervenyesHangulat.map((p) => hangulatNormal(p.ai.hangulat)), ervenyesHangulat.map((p) => p.e.hangulat)))
    ];
}

// Az előszűrő döntése az értékelő pontjai szerint, ugyanazzal a küszöbbel, mint az éles szabály (legfeljebb 30 pontos hírérték)
export const emberSzerintSzurendo = (e) => e.hirertek <= 30;

export function jevMeres(jevSorok, ember) {
    const parok = jevSorok.filter((s) => ember.has(s.sorszam)).map((s) => ember.get(s.sorszam));
    return {
        n: parok.length,
        jogos: parok.filter(emberSzerintSzurendo).length,
        fontosElveszett: parok.filter((e) => e.hirertek >= 61).length
    };
}

function exportResz(v) {
    return [
        '## Teljes export (automatikus, kézi pontozás nélkül)',
        '',
        `Elemzések: ${v.osszes} (LLM: ${v.llm}, előszűrt: ${v.eloszurt}, azaz ${szazalek(v.eloszurtArany)}).`,
        '',
        '| Jelenség (LLM-elemzések) | Érték |',
        '|---|---|',
        `| Hírérték tartománya | ${v.hirertekMin}–${v.hirertekMax}, szórás: ${szam(v.hirertekSzoras, 1)} |`,
        `| Pontosan 50 pont | ${szazalek(v.pontosan50)} |`,
        `| 35 és 50 pont között | ${szazalek(v.kozott35es50)} |`,
        `| Legalább 71 pont (témakör-riasztás küszöbe) | ${szazalek(v.legalabb71)} |`,
        `| Hangulat: pozitív / semleges / negatív | ${v.hangulatDb.POZITIV} / ${v.hangulatDb.SEMLEGES} / ${v.hangulatDb.NEGATIV} |`,
        `| Angolnak becsült összefoglaló nem angol címnél | ${v.angolOsszefoglalo} db |`,
        `| Angolnak becsült cím | ${v.angolCim} db |`,
        '',
        `Modellek: ${Object.entries(v.modellek).map(([m, d]) => `${m}: ${d}`).join(', ')}`,
        '',
        'A nyelvet egyszerű szóstatisztika becsüli, ezért csak tájékoztató jellegű.',
        ''
    ];
}

function fo() {
    const { values: o } = parseArgs({
        options: {
            'csak-export': { type: 'boolean', default: false },
            lap: { type: 'string', default: 'pontozolap.csv' },
            ertekelo: { type: 'string', default: 'ember' },
            mappa: { type: 'string', default: join(dirname(fileURLToPath(import.meta.url)), 'munka') }
        }
    });

    const minta = csvBeolvas(fajlSzoveg(join(o.mappa, 'minta.csv'))).filter((s) => s.hir_id && s.cim);
    const kimenet = [`# AI-kiértékelés eredménye`, '', `Készült: ${new Date().toISOString().slice(0, 10)}`, '', ...exportResz(exportVizsgalat(minta))];

    const lapFajl = join(o.mappa, o.lap);
    if (!o['csak-export'] && existsSync(lapFajl)) {
        const lapSorok = csvBeolvas(fajlSzoveg(lapFajl));
        const { kitoltott: mindKitoltott, hibak, hianyos } = pontozolapBeolvasas(lapSorok);

        // A prompt példáival egyező cikkeken a modell a választ is látta, ezért ezek nem számítanak bele
        const peldak = [...promptPeldak(readFileSync(AI_SERVICE, 'utf8')), ...KORABBI_PROMPT_PELDAK];
        const szivargo = lapSorok.filter((s) => szivargasE(s.cim, peldak));
        const szivargoSorszam = new Set(szivargo.map((s) => s.sorszam));
        const kitoltott = mindKitoltott.filter((s) => !szivargoSorszam.has(s.sorszam));
        if (hibak.length) {
            console.error(`Javítandó sorok a pontozólapon (ezek most kimaradnak):\n- ${hibak.join('\n- ')}`);
        }
        console.log(`Kitöltött sorok: ${kitoltott.length}, üres: ${hianyos}, hibás: ${hibak.length}.`);

        const ember = new Map(kitoltott.map((s) => [s.sorszam, s]));
        const kulcs = csvBeolvas(fajlSzoveg(join(o.mappa, 'kulcs.csv')));
        const llmKulcs = kulcs.filter((s) => !jevSorE(s));
        const jevKulcs = kulcs.filter(jevSorE);

        kimenet.push(
            `## Pontozás (értékelő: ${o.ertekelo})`,
            '',
            `Kitöltött cikkek: ${mindKitoltott.length}, ebből kizárva ${szivargo.length}, mert szerepel a prompt példái között: ${szivargo.map((s) => `#${s.sorszam}`).join(', ') || 'nincs'}. Értékelt: ${kitoltott.length}.`,
            '',
            'A minta rétegzett (a ritka eseteket felülsúlyozza), ezért a számok nem a teljes hírfolyam arányait mutatják. Egyetlen értékelő pontozott, ezért az eredmény az ő megítélését tükrözi.',
            ''
        );
        kimenet.push(...modellMeres(`Éles rendszer (${[...new Set(llmKulcs.map((s) => s.hasznalt_modell))].join(', ')})`, llmKulcs, ember));

        const osszefoglalok = kitoltott.filter((s) => s.pontos !== null);
        if (osszefoglalok.length) {
            const db = (p) => osszefoglalok.filter((s) => s.pontos === p).length;
            kimenet.push(
                `### Összefoglalók pontossága (n = ${osszefoglalok.length})`,
                '',
                `Pontos: ${db(2)} (${szazalek(db(2) / osszefoglalok.length)}), részben: ${db(1)} (${szazalek(db(1) / osszefoglalok.length)}), hibás: ${db(0)} (${szazalek(db(0) / osszefoglalok.length)}).`,
                ''
            );
        }

        const jev = jevMeres(jevKulcs, ember);
        if (jev.n) {
            kimenet.push(
                `## Jev előszűrés (n = ${jev.n})`,
                '',
                `Az ember szerint is szűrendő: ${jev.jogos} (${szazalek(jev.jogos / jev.n)}). Tévesen kiszűrt, az ember szerint legalább 61 pontos hír: ${jev.fontosElveszett}.`,
                '',
                'Csak a kiszűrt cikkeket vizsgálja: azt nem méri, hány gyenge cikk jutott át a szűrőn.',
                ''
            );
        }

        // Az összevetés csak azonos cikkeken korrekt, ezért az előszűrt cikkek (amelyekről az éles LLM nem mondott semmit) kimaradnak
        const llmSorszamok = new Set(llmKulcs.map((s) => s.sorszam));
        for (const f of readdirSync(o.mappa).filter((n) => /^futas-.*\.csv$/.test(n)).sort()) {
            const futas = csvBeolvas(fajlSzoveg(join(o.mappa, f))).filter((s) => llmSorszamok.has(s.sorszam));
            kimenet.push(...modellMeres(f.replace(/^futas-|\.csv$/g, ''), futas, ember));
            const idok = futas.map((s) => Number(s.ido_ms)).filter(Number.isFinite);
            if (idok.length) kimenet.push(`Átlagos válaszidő: ${szam(idok.reduce((a, b) => a + b, 0) / idok.length / 1000, 1)} s.`, '');
        }
    }

    const fajl = join(o.mappa, o.lap === 'pontozolap.csv' ? 'eredmeny.md' : `eredmeny-${o.lap.replace(/.csv$/, '')}.md`);
    writeFileSync(fajl, kimenet.join('\n'), 'utf8');
    console.log(`Eredmény: ${fajl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) fo();
