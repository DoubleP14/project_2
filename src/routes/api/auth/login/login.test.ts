import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BCRYPT_KOLTSEG } from '$lib/server/fiokBiztonsag';

const db = vi.hoisted(() => ({ felhasznalok: { findFirst: vi.fn(), update: vi.fn() } }));
const munkamenetInditasa = vi.hoisted(() => vi.fn());
vi.mock('$lib/server', () => ({ services: { db } }));
vi.mock('$lib/server/session', () => ({ munkamenetInditasa }));
vi.mock('$lib/server/services/loggerService', () => ({ logger: { info: vi.fn() } }));

import { POST } from './+server';

let sorszam = 0;
const belepes = (email: string, password: string, ip = `203.0.113.${++sorszam}`) =>
    POST({
        request: new Request('http://x', { method: 'POST', body: JSON.stringify({ email, password }) }),
        cookies: {},
        getClientAddress: () => ip
    } as never) as Promise<Response>;

const fiok = (felulir = {}) => ({ id: 1, email: 'a@b.hu', username: 'a', email_verified: true, aktiv: true, password_hash: '', ...felulir });

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('bejelentkezés', () => {
    it('helyes jelszóval munkamenetet indít, a friss hash-t nem írja át', async () => {
        const hash = await bcrypt.hash('jo-jelszo', BCRYPT_KOLTSEG);
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: hash }));
        expect((await belepes('jo@b.hu', 'jo-jelszo')).status).toBe(200);
        expect(munkamenetInditasa).toHaveBeenCalledOnce();
        expect(db.felhasznalok.update).not.toHaveBeenCalled();
    });

    it('rossz jelszónál és nem létező fióknál ugyanazt a választ adja', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: await bcrypt.hash('jo-jelszo', 4) }));
        const rossz = await belepes('rossz@b.hu', 'hibas-jelszo');
        db.felhasznalok.findFirst.mockResolvedValue(null);
        const nincs = await belepes('nincs@b.hu', 'hibas-jelszo');
        expect(rossz.status).toBe(401);
        expect(nincs.status).toBe(401);
        expect(await rossz.json()).toEqual(await nincs.json());
        expect(munkamenetInditasa).not.toHaveBeenCalled();
    });

    it('jelszó nélküli (Google) fiókba jelszóval nem lehet belépni', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: null }));
        expect((await belepes('google@b.hu', 'barmi')).status).toBe(401);
    });

    it('megerősítetlen és letiltott fiókkal nem indul munkamenet', async () => {
        const hash = await bcrypt.hash('jo-jelszo', 4);
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: hash, email_verified: false }));
        const megerositetlen = await belepes('m@b.hu', 'jo-jelszo');
        expect(megerositetlen.status).toBe(403);
        expect((await megerositetlen.json()).code).toBe('EMAIL_NOT_VERIFIED');
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: hash, aktiv: false }));
        expect((await belepes('l@b.hu', 'jo-jelszo')).status).toBe(403);
        expect(munkamenetInditasa).not.toHaveBeenCalled();
    });

    it('10 sikertelen próba után ugyanarra a fiókra másik IP-ről is tilt', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: await bcrypt.hash('jo-jelszo', 4) }));
        for (let i = 0; i < 10; i++) await belepes('korlat@b.hu', 'x', `198.51.100.${i}`);
        expect((await belepes('Korlat@B.hu', 'jo-jelszo', '198.51.100.200')).status).toBe(429);
    });

    it('30 sikertelen próba után ugyanarról az IP-ről más fiókra is tilt', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: await bcrypt.hash('jo-jelszo', 4) }));
        for (let i = 0; i < 30; i++) await belepes(`ip${i}@b.hu`, 'x', '198.51.100.250');
        expect((await belepes('masik@b.hu', 'jo-jelszo', '198.51.100.250')).status).toBe(429);
    });

    it('a gyengébb régi hash-t sikeres belépéskor erősebbre cseréli', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: await bcrypt.hash('jo-jelszo', 10) }));
        expect((await belepes('regi@b.hu', 'jo-jelszo')).status).toBe(200);
        const uj = db.felhasznalok.update.mock.calls[0][0].data.password_hash;
        expect(bcrypt.getRounds(uj)).toBe(BCRYPT_KOLTSEG);
        expect(await bcrypt.compare('jo-jelszo', uj)).toBe(true);
    });

    it('ha a hash frissítése nem sikerül, a belépés akkor is érvényes', async () => {
        db.felhasznalok.findFirst.mockResolvedValue(fiok({ password_hash: await bcrypt.hash('jo-jelszo', 4) }));
        db.felhasznalok.update.mockRejectedValueOnce(new Error('adatbázis hiba'));
        expect((await belepes('hiba@b.hu', 'jo-jelszo')).status).toBe(200);
    });
});
