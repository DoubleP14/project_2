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

// Fontossági rangsor: 0 = kiemelt, 1 = normál, 2 = hátrasorolt (clickbait vagy alacsony hírérték)
export function rangsorSzint(elemzes: { pontszam: number | null; clickbait: number }): 0 | 1 | 2 {
    const pontszam = elemzes.pontszam ?? 0;
    if (elemzes.clickbait >= 71 || pontszam <= 30) return 2;
    if (pontszam > 70) return 0;
    return 1;
}
