// src/lib/server/rssLetolto.ts
// RSS/Atom csatornák biztonságos letöltése és automatikus felderítése.
//
// - SSRF védelem: a felhasználó által megadott címről csak nyilvános internetes címre kapcsolódunk.
//   Az IP-címet a kapcsolódás pillanatában ellenőrizzük (saját DNS lookup), így az átirányítás és a
//   DNS rebinding sem vezethet belső címre (pl. a szerver metaadat-szolgáltatása vagy az adatbázis).
// - Méret- és időkorlát: egy hatalmas vagy lassú válasz nem terhelheti le a szervert.
// - Őszinte azonosítás: RSS-olvasóként mutatkozunk be (nem adjuk ki magunkat böngészőnek). Ha egy oldal
//   ennek ellenére tiltja a letöltést, azt tiszteletben tartjuk, és érthető hibaüzenetet adunk.
// - Gyorsítótár: ugyanazt a csatornát egy futáson belül csak egyszer töltjük le, akárhány felhasználó figyeli.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import Parser from 'rss-parser';

// Csak ASCII karakter lehet (a HTTP fejléc ékezetes betűt nem enged)
const USER_AGENT = 'NewsTrendsBot/1.0 (RSS news monitor; +https://newstrends.hu)';
const IDOKORLAT_MS = 15_000;
const GYORSITOTAR_MS = 10 * 60 * 1000; // egy óránkénti futáson belül elég
const MAX_VALASZ_MERET = 5 * 1024 * 1024; // 5 MB
const MAX_ATIRANYITAS = 5;

const TILTOTT_CIM = 'TILTOTT_CIM';

// --- IP ELLENŐRZÉS ---
function ipv4Tiltott(ip: string): boolean {
    const [a, b, c] = ip.split('.').map(Number);
    return (
        a === 0 || a === 10 || a === 127 || a >= 224 ||        // saját hálózat, privát, loopback, multicast/fenntartott
        (a === 100 && b >= 64 && b <= 127) ||                  // CGNAT
        (a === 169 && b === 254) ||                            // link-local, felhős metaadat-szolgáltatás
        (a === 172 && b >= 16 && b <= 31) ||                   // privát (a Docker belső hálózata is)
        (a === 192 && b === 168) ||                            // privát
        (a === 192 && b === 0 && (c === 0 || c === 2)) ||      // fenntartott (a 192.0.78.x pl. a WordPress.com, az nyilvános!)
        (a === 198 && (b === 18 || b === 19))                  // teszthálózat
    );
}

export function tiltottIp(ip: string): boolean {
    const verzio = net.isIP(ip);
    if (verzio === 4) return ipv4Tiltott(ip);
    if (verzio === 6) {
        const kicsi = ip.toLowerCase();
        const lekepzett = kicsi.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
        if (lekepzett) return ipv4Tiltott(lekepzett);
        // Minden más IPv4-be ágyazó forma (pl. ::ffff:7f00:1, 64:ff9b::) is tiltott
        if (kicsi.startsWith('::ffff:') || kicsi.startsWith('64:ff9b:')) return true;
        return (
            kicsi === '::' || kicsi === '::1' ||
            kicsi.startsWith('fc') || kicsi.startsWith('fd') ||      // ULA
            /^fe[89ab]/.test(kicsi) ||                               // link-local
            kicsi.startsWith('ff')                                   // multicast
        );
    }
    return true; // ismeretlen formátum: inkább tiltjuk
}

// Csak ellenőrzött IP-re enged kapcsolódni: a Node ezt a kapcsolódáskor hívja, így a DNS rebinding is kiesik
const biztonsagosLookup: net.LookupFunction = (hostname, options, callback) => {
    dns.lookup(hostname, { all: true, family: options.family as number | undefined }, (hiba, cimek) => {
        if (hiba) return (callback as any)(hiba);
        if (cimek.length === 0 || cimek.some((c) => tiltottIp(c.address))) {
            return (callback as any)(Object.assign(new Error(TILTOTT_CIM), { code: TILTOTT_CIM }));
        }
        if (options.all) return (callback as any)(null, cimek);
        (callback as any)(null, cimek[0].address, cimek[0].family);
    });
};

// A cím formai ellenőrzése: csak http(s), a szokásos portokon, beágyazott jelszó és belső IP nélkül
export function urlEllenorzes(cim: string): URL {
    let url: URL;
    try {
        url = new URL(cim);
    } catch {
        throw new Error(TILTOTT_CIM);
    }
    const nyers = url.hostname.replace(/^\[|\]$/g, '');
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        (url.port && !['80', '443'].includes(url.port)) ||
        url.username || url.password ||
        (net.isIP(nyers) && tiltottIp(nyers))
    ) {
        throw new Error(TILTOTT_CIM);
    }
    return url;
}

type Valasz = { statusz: number; hely: string | undefined; tipus: string; torzs: string };

function egyKeres(url: URL, accept: string): Promise<Valasz> {
    return new Promise((resolve, reject) => {
        const modul = url.protocol === 'https:' ? https : http;
        const keres = modul.request(url, {
            method: 'GET',
            lookup: biztonsagosLookup,
            timeout: IDOKORLAT_MS,
            headers: { 'User-Agent': USER_AGENT, 'Accept': accept, 'Accept-Encoding': 'identity' }
        }, (valasz) => {
            const reszek: Buffer[] = [];
            let meret = 0;
            valasz.on('data', (d: Buffer) => {
                meret += d.length;
                if (meret > MAX_VALASZ_MERET) {
                    keres.destroy(new Error('Túl nagy válasz'));
                    return;
                }
                reszek.push(d);
            });
            valasz.on('end', () => resolve({
                statusz: valasz.statusCode ?? 0,
                hely: valasz.headers.location,
                tipus: String(valasz.headers['content-type'] ?? ''),
                torzs: Buffer.concat(reszek).toString('utf8')
            }));
            valasz.on('error', reject);
        });
        // A timeout csak tétlenséget figyel, ezért teljes időkorlát is kell (lassan csepegtető válasz ellen)
        const teljesIdokorlat = setTimeout(() => keres.destroy(new Error('timeout')), IDOKORLAT_MS * 2);
        keres.on('timeout', () => keres.destroy(new Error('timeout')));
        keres.on('error', reject);
        keres.on('close', () => clearTimeout(teljesIdokorlat));
        keres.end();
    });
}

// Letöltés átirányításokkal: minden lépés új ellenőrzésen megy át
export async function biztonsagosLetoltes(cim: string, accept: string): Promise<Valasz> {
    let url = urlEllenorzes(cim);
    for (let i = 0; i <= MAX_ATIRANYITAS; i++) {
        const valasz = await egyKeres(url, accept);
        if (valasz.statusz >= 300 && valasz.statusz < 400 && valasz.hely) {
            url = urlEllenorzes(new URL(valasz.hely, url).toString());
            continue;
        }
        return valasz;
    }
    throw new Error('Túl sok átirányítás');
}

const parser = new Parser();
type Csatorna = Awaited<ReturnType<typeof parser.parseString>>;
const gyorsitotar = new Map<string, { ido: number; feed: Promise<Csatorna> }>();

async function csatornaBetoltese(rssUrl: string): Promise<Csatorna> {
    const valasz = await biztonsagosLetoltes(rssUrl, 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5');
    if (valasz.statusz !== 200) throw new Error(`Status code ${valasz.statusz}`);
    return parser.parseString(valasz.torzs);
}

// Csatorna letöltése (10 percen belül ugyanarra a címre a korábbi eredményt adjuk vissza)
export function csatornaLetoltese(rssUrl: string): Promise<Csatorna> {
    const most = Date.now();
    const mentett = gyorsitotar.get(rssUrl);
    if (mentett && most - mentett.ido < GYORSITOTAR_MS) return mentett.feed;

    const feed = csatornaBetoltese(rssUrl).catch((hiba: unknown) => {
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

// A nyers hibát érthető szövegre fordítjuk. Hálózati részleteket szándékosan nem adunk vissza,
// hogy a hibaüzenetből ne lehessen a szerver környezetére következtetni.
function baratsagosHiba(hiba: unknown): string {
    const uzenet = hiba instanceof Error ? hiba.message : String(hiba);
    if (uzenet.includes(TILTOTT_CIM)) return 'Ez a cím nem használható: csak nyilvános http(s) cím adható meg.';
    const kod = uzenet.match(/Status code (\d{3})/)?.[1];
    if (kod === '403') return 'Az oldal megtagadta a hozzáférést (403) – a portál nem engedi az automatikus RSS letöltést a szerverünkről.';
    if (kod === '404') return 'Az RSS cím nem található (404) – ellenőrizd a linket.';
    if (kod === '429') return 'Az oldal túl sok kérést jelzett (429) – később újrapróbáljuk.';
    if (kod && kod.startsWith('5')) return `Az oldal szerverhibát adott (${kod}) – később újrapróbáljuk.`;
    if (kod) return `Az oldal váratlan választ adott (${kod}).`;
    if (uzenet.includes('Túl nagy válasz')) return 'Az oldal válasza túl nagy, ezért nem dolgozható fel.';
    if (uzenet.includes('Túl sok átirányítás')) return 'A cím túl sokszor irányít tovább.';
    if (/timeout/i.test(uzenet)) return 'Az oldal nem válaszolt időben – később újrapróbáljuk.';
    if (/Non-whitespace before first tag|Unexpected close tag|Invalid character|not a valid feed|Feed not recognized|Unencoded|Attribute without value|Cannot read prop|Text data outside/i.test(uzenet)) {
        return 'A megadott cím nem RSS csatorna (hanem pl. egy weboldal) – add meg a hírportál RSS linkjét.';
    }
    return 'Az oldal nem érhető el.';
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
        const valasz = await biztonsagosLetoltes(oldalUrl, 'text/html,*/*');
        if (valasz.statusz === 200) {
            const linkek = [...valasz.torzs.matchAll(/<link\b[^>]*>/gi)]
                .map((m) => m[0])
                .filter((tag) => /rel=["']?alternate/i.test(tag) && /type=["']?application\/(rss|atom)\+xml/i.test(tag))
                .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1])
                .filter((href): href is string => !!href)
                .slice(0, 5);
            for (const href of linkek) {
                const teljes = new URL(href, oldalUrl).toString();
                if (await kiprobal(teljes)) return teljes;
            }
        }
    } catch {
        // az oldal nem elérhető – a gyakori útvonalakkal még próbálkozunk
    }

    for (const utvonal of ['/rss', '/feed', '/rss.xml', '/feed.xml']) {
        try {
            const jelolt = new URL(utvonal, oldalUrl).toString();
            if (await kiprobal(jelolt)) return jelolt;
        } catch {
            return null;
        }
    }
    return null;
}
