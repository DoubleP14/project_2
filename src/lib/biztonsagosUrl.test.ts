import { describe, expect, it } from 'vitest';
import { biztonsagosHref, discordWebhookE, httpUrlE } from './biztonsagosUrl';

describe('külső linkek (XSS védelem)', () => {
    it('csak a http és https címet engedi', () => {
        expect(httpUrlE('https://telex.hu/cikk')).toBe(true);
        expect(httpUrlE('http://example.org')).toBe(true);
    });

    it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'nem url', '', null, undefined])(
        'elutasítja: %s',
        (cim) => {
            expect(httpUrlE(cim)).toBe(false);
            expect(biztonsagosHref(cim)).toBe('#');
        }
    );

    it('a biztonságos címet változatlanul adja vissza', () => {
        expect(biztonsagosHref('https://telex.hu/cikk?a=1')).toBe('https://telex.hu/cikk?a=1');
    });
});

describe('Discord webhook', () => {
    it('elfogadja a Discord saját webhook címét', () => {
        expect(discordWebhookE('https://discord.com/api/webhooks/1/abc')).toBe(true);
    });

    it.each([
        'http://discord.com/api/webhooks/1/abc',
        'https://discord.com.tamado.hu/api/webhooks/1/abc',
        'https://tamado.hu/discord.com/api/webhooks/1/abc',
        'https://discord.com/users/1',
        'http://169.254.169.254/latest/meta-data'
    ])('elutasítja: %s', (cim) => {
        expect(discordWebhookE(cim)).toBe(false);
    });
});
