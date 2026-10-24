// src/lib/server/rssLetolto.ts
// RSS/Atom csatornák letöltése és automatikus felderítése.
//
// - Őszinte azonosítás: RSS-olvasóként mutatkozunk be (nem adjuk ki magunkat böngészőnek). Ha egy oldal
//   ennek ellenére tiltja a letöltést, azt tiszteletben tartjuk, és érthető hibaüzenetet adunk.
// - Gyorsítótár: ugyanazt a csatornát egy futáson belül csak egyszer töltjük le, akárhány felhasználó figyeli.
import Parser from 'rss-parser';

// Csak ASCII karakter lehet (a HTTP fejléc ékezetes betűt nem enged)
const USER_AGENT = 'NewsTrendsBot/1.0 (RSS news monitor; +https://newstrends.hu)';
const IDOKORLAT_MS = 15_000;
const GYORSITOTAR_MS = 10 * 60 * 1000; // egy óránkénti futáson belül elég

const parser = new Parser({
    timeout: IDOKORLAT_MS,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5'
    }
});

type Csatorna = Awaited<ReturnType<typeof parser.parseURL>>;
const gyorsitotar = new Map<string, { ido: number; feed: Promise<Csatorna> }>();

// Csatorna letöltése (10 percen belül ugyanarra a címre a korábbi eredményt adjuk vissza)
export function csatornaLetoltese(rssUrl: string): Promise<Csatorna> {
    const most = Date.now();
    const mentett = gyorsitotar.get(rssUrl);
    if (mentett && most - mentett.ido < GYORSITOTAR_MS) return mentett.feed;

    const feed = parser.parseURL(rssUrl).catch((hiba: unknown) => {
        gyorsitotar.delete(rssUrl); // hibát nem tárolunk, a következő próbálkozás újra letölti
        throw new Error(baratsagosHiba(hiba));
    });
    gyorsitotar.set(rssUrl, { ido: most, feed });

    // Lejárt bejegyzések takarítása
    for (const [url, bejegyzes] of gyorsitotar) {
        if (most - bejegyzes.ido > GYORSITOTAR_MS) gyorsitotar.delete(url);
    }
    return feed;
}

// A nyers hibaüzenet ("Status code 403") lefordítása érthető magyar szövegre
function baratsagosHiba(hiba: unknown): string {
    const uzenet = hiba instanceof Error ? hiba.message : String(hiba);
    const kod = uzenet.match(/Status code (\d{3})/)?.[1];
    if (kod === '403') return 'Az oldal megtagadta a hozzáférést (403) – a portál nem engedi az automatikus RSS letöltést a szerverünkről.';
    if (kod === '404') return 'Az RSS cím nem található (404) – ellenőrizd a linket.';
    if (kod === '429') return 'Az oldal túl sok kérést jelzett (429) – később újrapróbáljuk.';
    if (kod && kod.startsWith('5')) return `Az oldal szerverhibát adott (${kod}) – később újrapróbáljuk.`;
    if (/timed? ?out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(uzenet)) return 'Az oldal nem válaszolt időben – később újrapróbáljuk.';
    if (/Non-whitespace before first tag|Unexpected close tag|Invalid character|not a valid feed|Feed not recognized/i.test(uzenet)) {
        return 'A megadott cím nem RSS csatorna (hanem pl. egy weboldal) – add meg a hírportál RSS linkjét.';
    }
    return uzenet;
}

// RSS csatorna felderítése egy weboldal címéből:
// 1) maga a cím is lehet csatorna, 2) a HTML <link rel="alternate" type="application/rss+xml"> elemei,
// 3) gyakori útvonalak (/rss, /feed, /rss.xml)
export async function rssFelderites(oldalUrl: string): Promise<string | null> {
    const kiprobal = async (url: string) => {
        try {
            const feed = await csatornaLetoltese(url);
            return feed.items?.length ? url : null;
        } catch {
            return null;
        }
    };

    if (await kiprobal(oldalUrl)) return oldalUrl;

    try {
        const valasz = await fetch(oldalUrl, {
            headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,*/*' },
            signal: AbortSignal.timeout(IDOKORLAT_MS)
        });
        if (valasz.ok) {
            const html = await valasz.text();
            const linkek = [...html.matchAll(/<link\b[^>]*>/gi)]
                .map((m) => m[0])
                .filter((tag) => /rel=["']?alternate/i.test(tag) && /type=["']?application\/(rss|atom)\+xml/i.test(tag))
                .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1])
                .filter((href): href is string => !!href);
            for (const href of linkek) {
                const teljes = new URL(href, oldalUrl).toString();
                if (await kiprobal(teljes)) return teljes;
            }
        }
    } catch {
        // az oldal nem elérhető – a gyakori útvonalakkal még próbálkozunk
    }

    for (const utvonal of ['/rss', '/feed', '/rss.xml', '/feed.xml']) {
        const jelolt = new URL(utvonal, oldalUrl).toString();
        if (await kiprobal(jelolt)) return jelolt;
    }
    return null;
}
