// src/lib/csomagok.ts
// Előre fizetett havi csomagok: minden fizetés ELOFIZETESI_IDOSZAK_NAP nap hozzáférést ad, automatikus megújítás nincs.
// A webhook (jóváírás) és a fizetési oldal (előnézet) is ezt a számítást használja, így a kettő mindig egyezik.

export const ELOFIZETESI_IDOSZAK_NAP = 30;
const NAP_MS = 24 * 60 * 60 * 1000;

export const FIZETOS_CSOMAGOK = {
    pro: { nev: 'Pro Analyst Csomag', ar: 2990 },
    enterprise: { nev: 'Enterprise Csomag', ar: 9990 }
} as const;

export type FizetosCsomag = keyof typeof FIZETOS_CSOMAGOK;

export const fizetosCsomagE = (tier: string | null | undefined): tier is FizetosCsomag =>
    tier === 'pro' || tier === 'enterprise';

// Új lejárat egy fizetés után:
//  - ugyanaz a csomag és még aktív  -> a meglévő lejárathoz adódik a 30 nap (nem vész el egy nap sem)
//  - másik fizetős csomag és aktív  -> a hátralévő napok ÉRTÉKARÁNYOSAN átszámolódnak az új csomagra, + 30 nap
//  - nincs aktív fizetős csomag     -> mostantól 30 nap
export function ujLejaratSzamitasa(
    jelenlegiTier: string | null | undefined,
    jelenlegiLejarat: Date | null | undefined,
    ujTier: FizetosCsomag,
    most: Date = new Date()
): { lejarat: Date; jovairtNap: number } {
    let kezdet = most.getTime();
    let jovairtNap = 0;

    if (fizetosCsomagE(jelenlegiTier) && jelenlegiLejarat && jelenlegiLejarat.getTime() > kezdet) {
        const hatralevoMs = jelenlegiLejarat.getTime() - kezdet;
        const arany = FIZETOS_CSOMAGOK[jelenlegiTier].ar / FIZETOS_CSOMAGOK[ujTier].ar; // azonos csomagnál 1
        const jovairtMs = hatralevoMs * arany;
        kezdet += jovairtMs;
        jovairtNap = Math.floor(jovairtMs / NAP_MS);
    }

    return { lejarat: new Date(kezdet + ELOFIZETESI_IDOSZAK_NAP * NAP_MS), jovairtNap };
}

export const hatralevoNapok = (lejarat: Date | string | null | undefined, most: Date = new Date()) =>
    lejarat ? Math.max(0, Math.ceil((new Date(lejarat).getTime() - most.getTime()) / NAP_MS)) : 0;
