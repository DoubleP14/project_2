// Az AI válaszok feldolgozása: a szolgáltatót a fetch helyettesíti (Anthropic útvonal), valódi hívás nincs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAiService } from './aiService';

const MAGYAR = 'A kormány bejelentette, hogy jövőre emeli a minimálbért.';
const ANGOL = 'The government announced that it will raise the minimum wage next year, and the change has been welcomed.';

const valasz = (mezok: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify(mezok) }] })
});

const jo = { osszefoglalo: MAGYAR, hangulat: 'SEMLEGES', pontszam: 62, clickbait: 8, kulcsszavak: ['gazdaság', 'belföld'] };

let fetchMock: ReturnType<typeof vi.fn>;
const elemez = (cim = 'Emelkedik a minimálbér') =>
    createAiService().hirElemzese(cim, 'Szöveg', 'ANTHROPIC', 'claude-haiku-5-5', 'teszt-kulcs');

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('válasz ellenőrzése', () => {
    it('a helyes választ változatlanul adja vissza', async () => {
        fetchMock.mockResolvedValue(valasz(jo));
        expect(await elemez()).toMatchObject({ ...jo, hiba: null });
    });

    it('a szövegként érkező számot elfogadja, a törtet kerekíti', async () => {
        fetchMock.mockResolvedValue(valasz({ ...jo, pontszam: '85', clickbait: 12.6 }));
        expect(await elemez()).toMatchObject({ pontszam: 85, clickbait: 13, hiba: null });
    });

    it.each([
        ['hiányzó pontszám', { ...jo, pontszam: undefined }, 'pontszam'],
        ['null pontszám', { ...jo, pontszam: null }, 'pontszam'],
        ['üres szöveg pontszám', { ...jo, pontszam: '' }, 'pontszam'],
        ['betűs pontszám', { ...jo, pontszam: 'száz' }, 'pontszam'],
        ['skálán kívüli pontszám', { ...jo, pontszam: 150 }, 'pontszam'],
        ['hiányzó clickbait', { ...jo, clickbait: undefined }, 'clickbait'],
        ['üres összefoglaló', { ...jo, osszefoglalo: '  ' }, 'osszefoglalo']
    ])('%s: nem pótol alapértéket, hanem hibát jelez', async (_nev, mezok, mezo) => {
        fetchMock.mockResolvedValue(valasz(mezok));
        const e = await elemez();
        expect(e.hiba).toBe('API');
        expect(e.hibaUzenet).toContain(mezo);
    });

    it('a hiányzó hangulatot és kulcsszavakat továbbra is pótolja (ezek nem pontszámok)', async () => {
        fetchMock.mockResolvedValue(valasz({ ...jo, hangulat: 'VEGYES', kulcsszavak: undefined }));
        expect(await elemez()).toMatchObject({ hangulat: 'SEMLEGES', kulcsszavak: [], hiba: null });
    });

    it('a kvótahibát külön jelzi', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => '' });
        expect((await elemez()).hiba).toBe('QUOTA');
    });
});

describe('magyar nyelvű összefoglaló', () => {
    it('angol összefoglalónál egyszer újrakéri, és a magyar választ tartja meg', async () => {
        fetchMock.mockResolvedValueOnce(valasz({ ...jo, osszefoglalo: ANGOL })).mockResolvedValueOnce(valasz(jo));
        const e = await elemez('Hungary raises minimum wage');
        expect(e.osszefoglalo).toBe(MAGYAR);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages[0].content).toContain('magyarul');
    });

    it('ha az újrakérés sem magyar, az első választ menti, nem akasztja meg a feldolgozást', async () => {
        fetchMock.mockResolvedValue(valasz({ ...jo, osszefoglalo: ANGOL }));
        const e = await elemez();
        expect(e).toMatchObject({ osszefoglalo: ANGOL, hiba: null });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('ha az újrakérés hibára fut, az első választ menti', async () => {
        fetchMock.mockResolvedValueOnce(valasz({ ...jo, osszefoglalo: ANGOL })).mockRejectedValueOnce(new Error('hálózati hiba'));
        expect(await elemez()).toMatchObject({ osszefoglalo: ANGOL, hiba: null });
    });

    it('magyar összefoglalónál nincs második hívás', async () => {
        fetchMock.mockResolvedValue(valasz(jo));
        await elemez();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('a prompt kéri a magyar nyelvet, és nem tartalmazza a mért cikkek címét', async () => {
        fetchMock.mockResolvedValue(valasz(jo));
        await elemez();
        const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content as string;
        expect(prompt).toContain('MINDIG magyarul');
        for (const regi of ['Hullámvasúton az olajár', 'szerbiai CPAC', 'Zaporizzsjában', 'brit kalandor', 'Kisrepülő zuhant le Floridában', 'szombathelyi']) {
            expect(prompt).not.toContain(regi);
        }
    });
});
