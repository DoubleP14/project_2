import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ aiElemzesek: { findMany: vi.fn() } }));
vi.mock('$lib/server', () => ({ services: { db } }));

import { GET } from './+server';

const hivas = (user: unknown) => GET({ locals: { user } } as never) as Promise<Response>;
const hibaja = async (user: unknown) => {
    try {
        await hivas(user);
    } catch (e) {
        return e as { status: number; location?: string };
    }
    throw new Error('Hibát vártunk');
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('CSV export', () => {
    it('bejelentkezés nélkül a belépésre irányít', async () => {
        expect((await hibaja(undefined)).location).toBe('/login');
    });

    it('Pro csomaggal nem érhető el', async () => {
        expect((await hibaja({ id: 1, subscription_tier: 'pro', role: 'user' })).status).toBe(403);
        expect(db.aiElemzesek.findMany).not.toHaveBeenCalled();
    });

    it('Enterprise csomaggal csak a saját adatokat kéri le', async () => {
        db.aiElemzesek.findMany.mockResolvedValue([]);
        await hivas({ id: 42, subscription_tier: 'enterprise', role: 'user' });
        expect(db.aiElemzesek.findMany.mock.calls[0][0].where).toEqual({ hir: { forras: { felhasznalo_id: 42 } } });
    });

    it('letölthető fájlt ad, és a képletnek látszó címet semlegesíti', async () => {
        db.aiElemzesek.findMany.mockResolvedValue([{
            hir: { datum: new Date('2026-06-01T00:00:00Z'), cim: '=HYPERLINK("http://tamado.hu")', url: 'https://example.org', forras: { forras_nev: 'Telex' } },
            hangulat: 'SEMLEGES', pontszam: 50, clickbait: 0, kulcsszavak: ['a', 'b'], osszefoglalo: 'Szöveg', hasznalt_modell: 'modell'
        }]);
        const valasz = await hivas({ id: 1, subscription_tier: 'enterprise', role: 'user' });
        const szoveg = await valasz.text();
        expect(valasz.headers.get('content-disposition')).toMatch(/^attachment; filename="news-trends-elemzesek-/);
        expect(szoveg).toContain(`"'=HYPERLINK(""http://tamado.hu"")"`);
        expect(szoveg).toContain('a, b');
    });
});
