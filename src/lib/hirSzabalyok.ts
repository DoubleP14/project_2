// src/lib/hirSzabalyok.ts
// A rangsorolás és a riasztás üzleti szabályai külön, tiszta függvényekben, így önállóan tesztelhetők.

// Témakör alapú riasztás csak ennél a hírértéknél (vagy felette) indul
export const TEMAKOR_RIASZTASI_KUSZOB = 71;

// Bombahír feltételei: ennyi különböző forrás hozta le az eseményt, legalább ekkora hírértékkel
export const BOMBAHIR_MIN_FORRAS = 3;
export const BOMBAHIR_MIN_HIRERTEK = 60;

// Egy eseményről szóló cikkek különböző forrásainak száma (egy forrás több cikke egynek számít)
export const kulonbozoForrasokSzama = (forrasIdk: (number | null | undefined)[]): number =>
    new Set(forrasIdk.filter((id) => id !== null && id !== undefined)).size;

export const bombahirE = (forrasokSzama: number, hirertek: number): boolean =>
    forrasokSzama >= BOMBAHIR_MIN_FORRAS && hirertek >= BOMBAHIR_MIN_HIRERTEK;

export const temakorRiasztasE = (hirertek: number): boolean => hirertek >= TEMAKOR_RIASZTASI_KUSZOB;

// Az első kulcsszó, amely szerepel a szövegben (kisbetű-nagybetű nem számít), vagy null
export function kulcsszoTalalat(szoveg: string, kulcsszavak: string[]): string | null {
    const kicsi = szoveg.toLowerCase();
    return kulcsszavak.find((k) => k.trim() !== '' && kicsi.includes(k.toLowerCase())) ?? null;
}

// Az előszűrő által kiszűrt cikkek elemzése ezzel a modellnévvel mentődik. Ezekhez nem készült AI-összefoglaló
// és hangulatelemzés, ezért a statisztikákból kimaradnak, a felületen pedig "Előszűrt" címkét kapnak.
export const ELOSZURES_MODELL = 'jev-latest (előszűrés)';
export const eloszurtE = (hasznaltModell: string | null | undefined) => (hasznaltModell ?? '').startsWith('jev');

// Prisma feltétel a statisztikákhoz (a NULL modellnevet külön engedjük, mert a NOT ... LIKE kizárná)
export const nemEloszurtFeltetel = { OR: [{ hasznalt_modell: null }, { NOT: { hasznalt_modell: { startsWith: 'jev' } } }] };

// Fontossági rangsor: 0 = kiemelt, 1 = normál, 2 = hátrasorolt (clickbait vagy alacsony hírérték)
export function rangsorSzint(elemzes: { pontszam: number | null; clickbait: number }): 0 | 1 | 2 {
    const pontszam = elemzes.pontszam ?? 0;
    if (elemzes.clickbait >= 71 || pontszam <= 30) return 2;
    if (pontszam > 70) return 0;
    return 1;
}
