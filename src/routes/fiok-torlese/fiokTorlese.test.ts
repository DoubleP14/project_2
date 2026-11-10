import { beforeEach, describe, expect, it, vi } from 'vitest';

const modul = vi.hoisted(() => ({
    felhasznaloTorlesTokennel: vi.fn(),
    fiokVeglegesTorlese: vi.fn(),
    reszlegesEmail: (e: string) => `${e.slice(0, 2)}•••`
}));
const email = vi.hoisted(() => ({ sendAccountDeletedEmail: vi.fn() }));
vi.mock('$lib/server/fiokTorles', () => modul);
vi.mock('$lib/server/services/emailService', () => ({ emailService: email }));

import { actions, load } from './+page.server';

const TOKEN = 'a'.repeat(64);
const user = { id: 7, email: 'teszt@example.test', username: 't' };

const kuldes = async (locals: { user?: { id: number } } = {}) => {
    const body = new FormData();
    body.set('token', TOKEN);
    const cookies = { delete: vi.fn() };
    try {
        const eredmeny = await actions.default({ request: new Request('http://x', { method: 'POST', body }), locals, cookies } as never);
        return { eredmeny, cookies };
    } catch (atiranyitas) {
        return { atiranyitas: atiranyitas as { location: string }, cookies };
    }
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('megerősítő oldal betöltése', () => {
    it('a link megnyitása nem töröl semmit', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(user);
        const adat = await load({ url: new URL(`http://x/fiok-torlese?token=${TOKEN}`) } as never);
        expect(adat).toMatchObject({ ervenyes: true, email: 'te•••' });
        expect(modul.fiokVeglegesTorlese).not.toHaveBeenCalled();
    });

    it('érvénytelen linknél hibát mutat', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(null);
        expect(await load({ url: new URL('http://x/fiok-torlese?token=rossz') } as never)).toMatchObject({ ervenyes: false, email: null });
    });
});

describe('törlés megerősítése', () => {
    it('érvényes tokennel töröl, visszaigazolást küld és a belépésre irányít', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(user);
        const { atiranyitas } = await kuldes();
        expect(modul.fiokVeglegesTorlese).toHaveBeenCalledWith(7);
        expect(email.sendAccountDeletedEmail).toHaveBeenCalledWith('teszt@example.test');
        expect(atiranyitas?.location).toBe('/login?fiok_torolve=true');
    });

    it('érvénytelen vagy lejárt tokennel nem töröl', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(null);
        const { eredmeny } = await kuldes();
        expect((eredmeny as { status: number }).status).toBe(400);
        expect(modul.fiokVeglegesTorlese).not.toHaveBeenCalled();
    });

    it('ha a visszaigazoló levél nem megy el, a törlés akkor is megtörtént', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(user);
        email.sendAccountDeletedEmail.mockRejectedValueOnce(new Error('SMTP hiba'));
        const { atiranyitas } = await kuldes();
        expect(atiranyitas?.location).toBe('/login?fiok_torolve=true');
    });

    it('sikertelen törlésnél nem küld visszaigazolást', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(user);
        modul.fiokVeglegesTorlese.mockRejectedValueOnce(new Error('adatbázis hiba'));
        const { eredmeny } = await kuldes();
        expect((eredmeny as { status: number }).status).toBe(500);
        expect(email.sendAccountDeletedEmail).not.toHaveBeenCalled();
    });

    it('a törölt fiók munkamenetét megszünteti, egy másik bejelentkezett fiókét nem', async () => {
        modul.felhasznaloTorlesTokennel.mockResolvedValue(user);
        expect((await kuldes({ user: { id: 7 } })).cookies.delete).toHaveBeenCalledWith('session_token', { path: '/' });
        expect((await kuldes({ user: { id: 99 } })).cookies.delete).not.toHaveBeenCalled();
    });
});
