// Az AI-kiértékelés közös függvényei: CSV kezelés, mintavétel és mérőszámok.
// Külső függőség nélküli, tiszta függvények, így önállóan tesztelhetők.
import { readFileSync, writeFileSync } from 'node:fs';
import { angolSzovegE } from '../../src/lib/nyelvFelismeres.ts';

export { angolSzovegE };

// ─── CSV ──────────────────────────────────────────────────────────────

// Az Excel menthet ANSI (Windows-1250) kódolással is, ezért az érvénytelen UTF-8-at ennek olvassuk
export function fajlSzoveg(utvonal) {
    const nyers = readFileSync(utvonal);
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(nyers).replace(/^﻿/, '');
    } catch {
        return new TextDecoder('windows-1250').decode(nyers);
    }
}

// Elválasztó: az első sor alapján (az Excel magyar beállítással pontosvesszőt ír, a psql vesszőt)
function elvalaszto(szoveg) {
    const elso = szoveg.split(/\r?\n/, 1)[0];
    return (elso.match(/;/g)?.length ?? 0) > (elso.match(/,/g)?.length ?? 0) ? ';' : ',';
}

export function csvBeolvas(szoveg) {
    const jel = elvalaszto(szoveg);
    const sorok = [];
    let sor = [];
    let cella = '';
    let idezetben = false;

    for (let i = 0; i < szoveg.length; i++) {
        const k = szoveg[i];
        if (idezetben) {
            if (k === '"' && szoveg[i + 1] === '"') {
                cella += '"';
                i++;
            } else if (k === '"') {
                idezetben = false;
            } else {
                cella += k;
            }
        } else if (k === '"') {
            idezetben = true;
        } else if (k === jel) {
            sor.push(cella);
            cella = '';
        } else if (k === '\n' || k === '\r') {
            if (k === '\r' && szoveg[i + 1] === '\n') i++;
            sor.push(cella);
            cella = '';
            sorok.push(sor);
            sor = [];
        } else {
            cella += k;
        }
    }
    if (cella !== '' || sor.length > 0) {
        sor.push(cella);
        sorok.push(sor);
    }

    const [fejlec, ...adat] = sorok.filter((s) => s.some((c) => c.trim() !== ''));
    if (!fejlec) return [];
    return adat.map((s) => Object.fromEntries(fejlec.map((f, i) => [f.trim(), s[i] ?? ''])));
}

const csvCella = (ertek) => {
    const s = ertek === null || ertek === undefined ? '' : String(ertek);
    return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

// Magyar Excelhez: pontosvessző és UTF-8 BOM
export function csvKiir(utvonal, oszlopok, sorok) {
    const tartalom = [oszlopok, ...sorok.map((s) => oszlopok.map((o) => s[o]))]
        .map((s) => s.map(csvCella).join(';'))
        .join('\r\n');
    writeFileSync(utvonal, `﻿${tartalom}\r\n`, 'utf8');
}

// ─── MINTAVÉTEL ───────────────────────────────────────────────────────

// Magból generált véletlenszám: ugyanazzal a maggal ugyanaz a minta, így a mérés megismételhető
export function veletlen(mag) {
    let a = mag >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function kever(tomb, rnd) {
    const m = [...tomb];
    for (let i = m.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
}

export const jevSorE = (sor) => (sor.hasznalt_modell ?? '').startsWith('jev');

export function reteg(sor) {
    if (jevSorE(sor)) return 'eloszurt';
    const h = Number(sor.hirertek);
    const c = Number(sor.clickbait);
    if (h >= 71 || c >= 71) return 'kiemelt_vagy_clickbait';
    if (h <= 30) return 'alacsony';
    return 'kozepes';
}

// Rétegzett minta: a ritka eseteket felülsúlyozza, mert véletlen mintában alig lennének.
// A kvótából kimaradó helyeket a közepes réteg, majd a többi réteg maradéka tölti ki.
export const RETEG_ARANY = { kiemelt_vagy_clickbait: 0.25, alacsony: 0.2, eloszurt: 0.15, kozepes: 0.4 };

export function retegzettMinta(sorok, darab, mag) {
    const rnd = veletlen(mag);
    const csoportok = Object.fromEntries(Object.keys(RETEG_ARANY).map((r) => [r, []]));
    for (const sor of kever(sorok, rnd)) csoportok[reteg(sor)].push(sor);

    const valasztott = [];
    for (const [r, arany] of Object.entries(RETEG_ARANY)) {
        if (r !== 'kozepes') valasztott.push(...csoportok[r].splice(0, Math.round(darab * arany)));
    }
    const maradek = [...csoportok.kozepes, ...kever(Object.entries(csoportok).filter(([r]) => r !== 'kozepes').flatMap(([, s]) => s), rnd)];
    valasztott.push(...maradek.slice(0, Math.max(0, darab - valasztott.length)));
    return kever(valasztott, rnd);
}

// ─── ALAP STATISZTIKA ─────────────────────────────────────────────────

export const atlag = (t) => (t.length ? t.reduce((a, b) => a + b, 0) / t.length : NaN);

export function szoras(t) {
    if (t.length < 2) return NaN;
    const m = atlag(t);
    return Math.sqrt(t.reduce((s, x) => s + (x - m) ** 2, 0) / (t.length - 1));
}

export function median(t) {
    if (!t.length) return NaN;
    const r = [...t].sort((a, b) => a - b);
    const k = Math.floor(r.length / 2);
    return r.length % 2 ? r[k] : (r[k - 1] + r[k]) / 2;
}

export const mae = (a, b) => atlag(a.map((x, i) => Math.abs(x - b[i])));

// Rangok holtversenynél átlagolva
function rangok(t) {
    const r = t.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
    const eredmeny = new Array(t.length);
    for (let i = 0; i < r.length; ) {
        let j = i;
        while (j + 1 < r.length && r[j + 1][0] === r[i][0]) j++;
        for (let k = i; k <= j; k++) eredmeny[r[k][1]] = (i + j) / 2 + 1;
        i = j + 1;
    }
    return eredmeny;
}

function pearson(a, b) {
    const ma = atlag(a);
    const mb = atlag(b);
    let sz = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        sz += (a[i] - ma) * (b[i] - mb);
        na += (a[i] - ma) ** 2;
        nb += (b[i] - mb) ** 2;
    }
    return na && nb ? sz / Math.sqrt(na * nb) : NaN;
}

export const spearman = (a, b) => pearson(rangok(a), rangok(b));

// 95%-os bootstrap konfidenciaintervallum: kis mintánál így látszik a mérés bizonytalansága
export function bootstrapCi(a, b, statisztika, mag = 1, ismetles = 2000) {
    const rnd = veletlen(mag);
    const ertekek = [];
    for (let n = 0; n < ismetles; n++) {
        const ma = [];
        const mb = [];
        for (let i = 0; i < a.length; i++) {
            const j = Math.floor(rnd() * a.length);
            ma.push(a[j]);
            mb.push(b[j]);
        }
        const e = statisztika(ma, mb);
        if (!Number.isNaN(e)) ertekek.push(e);
    }
    ertekek.sort((x, y) => x - y);
    return [ertekek[Math.floor(ertekek.length * 0.025)], ertekek[Math.floor(ertekek.length * 0.975)]];
}

// ─── PONTSZÁMOK KIÉRTÉKELÉSE ──────────────────────────────────────────

export const sav = (p) => (p <= 30 ? 'alacsony' : p <= 70 ? 'kozepes' : 'magas');

// Bináris döntés (pl. "kiemelt hír" = legalább 71 pont), ember az igazság
export function binaris(ai, ember, kuszob = 71) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    ai.forEach((x, i) => {
        if (x >= kuszob && ember[i] >= kuszob) tp++;
        else if (x >= kuszob) fp++;
        else if (ember[i] >= kuszob) fn++;
    });
    const precizio = tp + fp ? tp / (tp + fp) : NaN;
    const felidezes = tp + fn ? tp / (tp + fn) : NaN;
    return {
        tp,
        fp,
        fn,
        precizio,
        felidezes,
        f1: precizio + felidezes ? (2 * precizio * felidezes) / (precizio + felidezes) : NaN
    };
}

export function pontszamMeres(ai, ember) {
    const egyezo = ai.filter((x, i) => sav(x) === sav(ember[i])).length;
    return {
        n: ai.length,
        mae: mae(ai, ember),
        maeCi: bootstrapCi(ai, ember, mae),
        naivMae: mae(ember.map(() => median(ember)), ember),
        torzitas: atlag(ai.map((x, i) => x - ember[i])),
        spearman: spearman(ai, ember),
        spearmanCi: bootstrapCi(ai, ember, spearman),
        tizenotonBelul: ai.filter((x, i) => Math.abs(x - ember[i]) <= 15).length / ai.length,
        savEgyezes: egyezo / ai.length,
        aiSzoras: szoras(ai),
        emberSzoras: szoras(ember),
        kuszob71: binaris(ai, ember)
    };
}

// ─── HANGULAT ─────────────────────────────────────────────────────────

export const HANGULATOK = ['POZITIV', 'SEMLEGES', 'NEGATIV'];

export function hangulatNormal(ertek) {
    const n = String(ertek ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n === 'P' || n.startsWith('POZ')) return 'POZITIV';
    if (n === 'N' || n.startsWith('NEG')) return 'NEGATIV';
    if (n === 'S' || n.startsWith('SEM')) return 'SEMLEGES';
    return null;
}

export function hangulatMeres(ai, ember) {
    const matrix = Object.fromEntries(HANGULATOK.map((e) => [e, Object.fromEntries(HANGULATOK.map((a) => [a, 0]))]));
    ai.forEach((a, i) => matrix[ember[i]][a]++);
    const n = ai.length;
    const helyes = HANGULATOK.reduce((s, h) => s + matrix[h][h], 0);

    const f1k = HANGULATOK.map((h) => {
        const tp = matrix[h][h];
        const aiDb = HANGULATOK.reduce((s, e) => s + matrix[e][h], 0);
        const emberDb = HANGULATOK.reduce((s, a) => s + matrix[h][a], 0);
        if (emberDb === 0) return null; // Az ember egyszer sem választotta: nem értékelhető osztály
        const p = aiDb ? tp / aiDb : 0;
        const r = tp / emberDb;
        return p + r ? (2 * p * r) / (p + r) : 0;
    }).filter((x) => x !== null);

    // Cohen-kappa: mennyivel jobb az egyezés a véletlennél
    const varhato = HANGULATOK.reduce((s, h) => {
        const aiDb = HANGULATOK.reduce((x, e) => x + matrix[e][h], 0);
        const emberDb = HANGULATOK.reduce((x, a) => x + matrix[h][a], 0);
        return s + (aiDb * emberDb) / (n * n);
    }, 0);
    const pontossag = helyes / n;

    return { n, pontossag, makroF1: atlag(f1k), kappa: varhato < 1 ? (pontossag - varhato) / (1 - varhato) : NaN, matrix };
}

// ─── SZIVÁRGÁS A PROMPT PÉLDÁIBÓL ─────────────────────────────────────

// A prompt kalibrációs példái ("Cím" = pontszám). Ha egy mért cikk ezek egyike, a modell a választ is látta.
export const promptPeldak = (prompt) => [...prompt.matchAll(/"([^"\n]{10,})"\s*=\s*\d+/g)].map((m) => m[1]);

// A 3121dd3 commit promptjának példái. Valós Telex-cikkekből készültek, ezért a 2026 novemberi mintában is szerepelnek.
// A kiértékelés ezeket továbbra is kizárja, hogy a javítás előtti és utáni mérés ugyanazokon a cikkeken történjen.
export const KORABBI_PROMPT_PELDAK = [
    'Trump Donald Trumpnak öltözött halloweenkor',
    '28 év után hazatért a brit kalandor',
    'Bocsánatkéréssel és sérelemdíjjal tartozik a börtön egy apának',
    'Kisrepülő zuhant le Floridában',
    'Bedőlt egy paraguayi bank, amelyben az OTP is részesedést szerzett',
    '29-en meghaltak egy orosz bombázásban Zaporizzsjában',
    'Elhalasztják a szerbiai CPAC-konferenciát, ahol Vučić lett volna a sztárszónok',
    'Bocsánatkéréssel és 500 ezer forint sérelemdíjjal tartozik a börtön az apának, akinek nem engedték, hogy elbúcsúzzon haldokló fiától',
    'Hullámvasúton az olajár: Hétfőn tárgyalunk, kedden háborúzunk',
    'Nem hinném - kommentelte Magyar'
];

const kulcsszavai = (s) => [...new Set(String(s).toLowerCase().match(/[\p{L}\d-]{4,}/gu) ?? [])];

// Egyezik, ha a példa hosszabb szavainak legalább 60%-a szerepel a címben (szórészletként is, a ragok miatt)
export function szivargasE(cim, peldak) {
    const kicsi = String(cim).toLowerCase();
    return peldak.some((p) => {
        const szavak = kulcsszavai(p);
        return szavak.length >= 2 && szavak.filter((sz) => kicsi.includes(sz)).length / szavak.length >= 0.6;
    });
}

// ─── A TELJES EXPORT AUTOMATIKUS VIZSGÁLATA (kézi pontozás nélkül) ────

export function exportVizsgalat(sorok) {
    const llm = sorok.filter((s) => !jevSorE(s));
    const hirertekek = llm.map((s) => Number(s.hirertek));
    const hangulatDb = Object.fromEntries(HANGULATOK.map((h) => [h, llm.filter((s) => hangulatNormal(s.hangulat) === h).length]));
    const arany = (db) => (llm.length ? db / llm.length : NaN);

    return {
        osszes: sorok.length,
        llm: llm.length,
        eloszurt: sorok.length - llm.length,
        eloszurtArany: sorok.length ? (sorok.length - llm.length) / sorok.length : NaN,
        hirertekSzoras: szoras(hirertekek),
        hirertekMin: hirertekek.length ? Math.min(...hirertekek) : NaN,
        hirertekMax: hirertekek.length ? Math.max(...hirertekek) : NaN,
        pontosan50: arany(hirertekek.filter((h) => h === 50).length),
        kozott35es50: arany(hirertekek.filter((h) => h >= 35 && h <= 50).length),
        legalabb71: arany(hirertekek.filter((h) => h >= 71).length),
        hangulatDb,
        angolOsszefoglalo: llm.filter((s) => angolSzovegE(s.osszefoglalo) && !angolSzovegE(s.cim)).length,
        angolCim: llm.filter((s) => angolSzovegE(s.cim)).length,
        modellek: Object.fromEntries([...new Set(sorok.map((s) => s.hasznalt_modell))].map((m) => [m, sorok.filter((s) => s.hasznalt_modell === m).length]))
    };
}
