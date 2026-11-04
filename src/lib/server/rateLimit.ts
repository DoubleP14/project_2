// src/lib/server/rateLimit.ts
// Egyszerű, memóriában tárolt próbálkozási korlát (jelszó-próbálgatás és tömeges kérések ellen).
// Egyetlen szerverfolyamathoz elég; újraindításkor a számlálók nullázódnak.
import type { RequestEvent } from '@sveltejs/kit';

type Bejegyzes = { db: number; lejar: number };
const tarolo = new Map<string, Bejegyzes>();

const aktivBejegyzes = (kulcs: string): Bejegyzes | undefined => {
    const b = tarolo.get(kulcs);
    if (b && b.lejar <= Date.now()) {
        tarolo.delete(kulcs);
        return undefined;
    }
    return b;
};

// Elérte-e a kulcs a megengedett próbálkozások számát?
export const korlatTullepve = (kulcs: string, max: number): boolean => (aktivBejegyzes(kulcs)?.db ?? 0) >= max;

export function probaRogzitese(kulcs: string, ablakMs: number) {
    const b = aktivBejegyzes(kulcs);
    if (b) b.db++;
    else tarolo.set(kulcs, { db: 1, lejar: Date.now() + ablakMs });

    // Takarítás, hogy a tároló ne nőjön korlátlanul
    if (tarolo.size > 10_000) {
        const most = Date.now();
        for (const [k, v] of tarolo) if (v.lejar <= most) tarolo.delete(k);
    }
}

export const korlatTorlese = (kulcs: string) => tarolo.delete(kulcs);

// A látogató IP-címe: Cloudflare mögött a CF-Connecting-IP fejlécből.
// Ez közvetlen szerverkapcsolatnál hamisítható, ezért a belépésnél e-mail cím szerint is korlátozunk.
export const ugyfelIp = (event: Pick<RequestEvent, 'request' | 'getClientAddress'>): string =>
    event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress();
