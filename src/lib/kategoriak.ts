// src/lib/kategoriak.ts
// Közös témakör-szótár: a dashboard gyorsszűrői ÉS a témakör alapú riasztások is ezt használják.
// Egy kategória akkor illeszkedik egy hírre, ha a szinonimák bármelyike szerepel a hír (AI által adott) kulcsszavai között.
export const KATEGORIA_SZOTAR: Record<string, { nev: string; szinonimak: string[] }> = {
    politika: { nev: 'Politika & Belföld', szinonimak: ['politika', 'belföld', 'belfold', 'kormány', 'választás', 'parlament', 'ellenzék', 'törvény'] },
    gazdasag: { nev: 'Gazdaság', szinonimak: ['gazdaság', 'gazdasag', 'pénzügy', 'üzlet', 'infláció', 'adó', 'beruházás', 'kamat'] },
    kulfold:  { nev: 'Külföld', szinonimak: ['külföld', 'kulfold', 'nemzetközi', 'háború', 'világ', 'eu', 'amerika'] },
    tech:     { nev: 'Tech & Tudomány', szinonimak: ['tech', 'technológia', 'gaming', 'tudomány', 'szoftver', 'mesterséges intelligencia', 'ai', 'űrkutatás'] },
    sport:    { nev: 'Sport', szinonimak: ['sport', 'foci', 'olimpia', 'bajnokság', 'mérkőzés', 'válogatott', 'forma-1'] }
};

// Visszaadja az első feliratkozott kategóriát, amelyre a hír kulcsszavai illeszkednek (vagy null-t)
export function illeszkedoKategoria(kulcsszavak: string[], feliratkozottKategoriak: string[]): string | null {
    const kisbetusKulcsszavak = kulcsszavak.map(k => k.toLowerCase());
    for (const katId of feliratkozottKategoriak) {
        const kategoria = KATEGORIA_SZOTAR[katId];
        if (kategoria && kategoria.szinonimak.some(sz => kisbetusKulcsszavak.includes(sz))) {
            return katId;
        }
    }
    return null;
}
