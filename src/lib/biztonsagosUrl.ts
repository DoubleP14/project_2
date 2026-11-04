// src/lib/biztonsagosUrl.ts
// Külső (felhasználótól vagy RSS csatornából származó) címek ellenőrzése.
// A Svelte a href értékét nem szűri, így egy "javascript:" cím kattintásra kódot futtatna (XSS).

export function httpUrlE(cim: string | null | undefined): boolean {
    if (!cim) return false;
    try {
        const { protocol } = new URL(cim);
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}

// Megjelenítéshez: nem http(s) cím helyett ártalmatlan "#"
export const biztonsagosHref = (cim: string | null | undefined): string => (httpUrlE(cim) ? (cim as string) : '#');

// Discord webhook: csak a Discord saját webhook címe fogadható el
export function discordWebhookE(cim: string | null | undefined): boolean {
    if (!cim) return false;
    try {
        const url = new URL(cim);
        return (
            url.protocol === 'https:' &&
            ['discord.com', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com'].includes(url.hostname) &&
            url.pathname.startsWith('/api/webhooks/')
        );
    } catch {
        return false;
    }
}
