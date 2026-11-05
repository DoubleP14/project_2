import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { korlatTorlese, korlatTullepve, probaRogzitese, ugyfelIp } from './rateLimit';

describe('próbálkozási korlát', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('a megengedett számú próba után jelez', () => {
        for (let i = 0; i < 2; i++) probaRogzitese('teszt:szam', 60_000);
        expect(korlatTullepve('teszt:szam', 3)).toBe(false);
        probaRogzitese('teszt:szam', 60_000);
        expect(korlatTullepve('teszt:szam', 3)).toBe(true);
    });

    it('az időablak lejárta után újra enged', () => {
        probaRogzitese('teszt:ablak', 60_000);
        expect(korlatTullepve('teszt:ablak', 1)).toBe(true);
        vi.advanceTimersByTime(60_001);
        expect(korlatTullepve('teszt:ablak', 1)).toBe(false);
    });

    it('a kulcsok egymástól függetlenek, és törölhetők', () => {
        probaRogzitese('teszt:a', 60_000);
        expect(korlatTullepve('teszt:b', 1)).toBe(false);
        korlatTorlese('teszt:a');
        expect(korlatTullepve('teszt:a', 1)).toBe(false);
    });
});

describe('ügyfél IP-cím', () => {
    const esemeny = (fejlecek: Record<string, string>) => ({
        request: new Request('http://localhost', { headers: fejlecek }),
        getClientAddress: () => '203.0.113.9'
    });

    it('Cloudflare mögött a CF-Connecting-IP fejlécet használja', () => {
        expect(ugyfelIp(esemeny({ 'cf-connecting-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    });

    it('fejléc nélkül a kapcsolat címét használja', () => {
        expect(ugyfelIp(esemeny({}))).toBe('203.0.113.9');
    });
});
