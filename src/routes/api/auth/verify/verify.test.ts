import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ felhasznalok: { findFirst: vi.fn(), update: vi.fn() } }));
vi.mock('$lib/server', () => ({ services: { db } }));
vi.mock('$lib/server/services/loggerService', () => ({ logger: { info: vi.fn() } }));

import { GET } from './+server';

const hivas = async (cim: string) => {
    try {
        await GET({ url: new URL(cim) } as never);
    } catch (eredmeny) {
        return eredmeny as { status: number; location: string };
    }
    throw new Error('Átirányítást vártunk');
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('e-mail megerősítés', () => {
    it('érvényes linkkel aktivál, és törli a tokent', async () => {
        db.felhasznalok.findFirst.mockResolvedValue({ id: 7, verification_lejarat: new Date(Date.now() + 60_000) });
        expect((await hivas('http://x/?token=abc')).location).toBe('/login?verified=true');
        expect(db.felhasznalok.update.mock.calls[0][0].data).toEqual({ email_verified: true, verification_token: null, verification_lejarat: null });
    });

    it('lejárt linkkel nem aktivál', async () => {
        db.felhasznalok.findFirst.mockResolvedValue({ id: 7, verification_lejarat: new Date(Date.now() - 1) });
        expect((await hivas('http://x/?token=abc')).location).toBe('/login?error=expired_token');
        expect(db.felhasznalok.update).not.toHaveBeenCalled();
    });

    it('lejárati idő nélküli régi linkkel nem aktivál', async () => {
        db.felhasznalok.findFirst.mockResolvedValue({ id: 7, verification_lejarat: null });
        expect((await hivas('http://x/?token=abc')).location).toBe('/login?error=expired_token');
    });

    it('ismeretlen vagy hiányzó tokennel hibát jelez', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(null);
        expect((await hivas('http://x/?token=rossz')).location).toBe('/login?error=invalid_token');
        expect((await hivas('http://x/')).location).toBe('/login?error=invalid_token');
    });
});
