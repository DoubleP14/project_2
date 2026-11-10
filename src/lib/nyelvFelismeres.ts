// src/lib/nyelvFelismeres.ts
// Egyszerű szóstatisztika annak becslésére, hogy egy szöveg angol-e.
// Az AI elemzés ezzel ellenőrzi, hogy az összefoglaló magyarul készült-e, és a kiértékelő eszköz is ezt használja.

// Az "is" szándékosan hiányzik: magyarul is gyakori szó
const ANGOL_SZAVAK = new Set(['the', 'and', 'of', 'has', 'have', 'was', 'were', 'will', 'with', 'for', 'that', 'from', 'are', 'to', 'in', 'on', 'by', 'an', 'its', 'their', 'after', 'into']);
const MAGYAR_SZAVAK = new Set(['a', 'az', 'és', 'hogy', 'egy', 'nem', 'de', 'is', 'meg', 'már', 'után', 'szerint', 'miatt', 'valamint', 'volt', 'lesz', 'ami', 'amely', 'aki']);

// Nagyon rövid szövegre nem ad ítéletet, mert ott a szóstatisztika megbízhatatlan
export function angolSzovegE(szoveg: string | null | undefined): boolean {
    const szavak = String(szoveg ?? '').toLowerCase().match(/[\p{L}]+/gu) ?? [];
    if (szavak.length < 6) return false;
    const angol = szavak.filter((s) => ANGOL_SZAVAK.has(s)).length;
    const magyar = szavak.filter((s) => MAGYAR_SZAVAK.has(s)).length;
    return angol >= 2 && angol > magyar * 2;
}
