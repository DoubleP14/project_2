import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    felhasznalok: { update: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    hirek: { deleteMany: vi.fn() },
    rendszerNaplo: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
}));
const email = vi.hoisted(() => ({ sendAccountDeletionConfirmEmail: vi.fn() }));
vi.mock('$lib/server', () => ({ services: { db } }));
vi.mock('$lib/server/services/emailService', () => ({ emailService: email }));
vi.mock('$lib/server/services/loggerService', () => ({ logger: { info: vi.fn() } }));

import { felhasznaloTorlesTokennel, fiokVeglegesTorlese, reszlegesEmail, TORLES_ERVENYESSEG_PERC, tokenHash, torlesLinkKuldese } from './fiokTorles';

const most = new Date('2026-06-01T12:00:00Z');
const user = (lejarat: Date | null = null) => ({ id: 7, email: 'teszt@example.test', fiok_torles_lejarat: lejarat });

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(most);
});
afterEach(() => {
    vi.useRealTimers();
});

describe('megerősítő link küldése', () => {
    it('az e-mailbe a nyers token, az adatbázisba csak a hash-e kerül', async () => {
        expect(await torlesLinkKuldese(user(), 'https://newstrends.hu')).toBe('ELKULDVE');
        const [cim, token, origin, perc] = email.sendAccountDeletionConfirmEmail.mock.calls[0];
        expect([cim, origin, perc]).toEqual(['teszt@example.test', 'https://newstrends.hu', TORLES_ERVENYESSEG_PERC]);
        expect(token).toMatch(/^[0-9a-f]{64}$/);

        const adat = db.felhasznalok.update.mock.calls[0][0].data;
        expect(adat.fiok_torles_token).toBe(tokenHash(token));
        expect(adat.fiok_torles_token).not.toBe(token);
        expect(adat.fiok_torles_lejarat).toEqual(new Date(most.getTime() + 60 * 60 * 1000));
    });

    it('2 percen belül nem küld újabb levelet', async () => {
        const nemregiLejarat = new Date(most.getTime() + (TORLES_ERVENYESSEG_PERC - 1) * 60 * 1000);
        expect(await torlesLinkKuldese(user(nemregiLejarat), 'https://x')).toBe('NEMREG_KULDVE');
        expect(email.sendAccountDeletionConfirmEmail).not.toHaveBeenCalled();
        expect(db.felhasznalok.update).not.toHaveBeenCalled();
    });

    it('2 perc után új linket küld, ami a régit érvényteleníti', async () => {
        const regiLejarat = new Date(most.getTime() + (TORLES_ERVENYESSEG_PERC - 3) * 60 * 1000);
        expect(await torlesLinkKuldese(user(regiLejarat), 'https://x')).toBe('ELKULDVE');
    });
});

describe('token ellenőrzése', () => {
    it('csak érvényes formátumú tokennel kérdez az adatbázisból, hash alapján és lejárati idővel', async () => {
        const token = 'a'.repeat(64);
        db.felhasznalok.findFirst.mockResolvedValue({ id: 7 });
        expect(await felhasznaloTorlesTokennel(token)).toEqual({ id: 7 });
        expect(db.felhasznalok.findFirst.mock.calls[0][0].where).toEqual({ fiok_torles_token: tokenHash(token), fiok_torles_lejarat: { gt: most } });
    });

    it.each([null, undefined, '', 'rovid', 'Z'.repeat(64), `${'a'.repeat(64)}x`])('hibás tokennél nem kérdez az adatbázisból: %j', async (token) => {
        expect(await felhasznaloTorlesTokennel(token)).toBeNull();
        expect(db.felhasznalok.findFirst).not.toHaveBeenCalled();
    });
});

describe('végleges törlés', () => {
    it('egy tranzakcióban törli a híreket, a naplót és a fiókot, és anonim bejegyzést hagy', async () => {
        await fiokVeglegesTorlese(7);
        expect(db.$transaction).toHaveBeenCalledOnce();
        expect(db.hirek.deleteMany).toHaveBeenCalledWith({ where: { felhasznalo_id: 7 } });
        expect(db.rendszerNaplo.deleteMany).toHaveBeenCalledWith({ where: { felhasznalo_id: 7 } });
        expect(db.felhasznalok.delete).toHaveBeenCalledWith({ where: { id: 7 } });
        expect(db.rendszerNaplo.create.mock.calls[0][0].data).not.toHaveProperty('felhasznalo_id');
    });
});

describe('részleges e-mail cím', () => {
    it('csak az első két karaktert és a domaint mutatja', () => {
        expect(reszlegesEmail('pinter.patrik@gmail.com')).toBe('pi•••@gmail.com');
    });
});
