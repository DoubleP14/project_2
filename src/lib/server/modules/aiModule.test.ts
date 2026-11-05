// Az elemzési ciklus viselkedése: az AI szolgáltatót, az adatbázist és az értesítést teszt-helyettesítők adják.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../crypto', () => ({ decrypt: (s: string) => s }));
const jevHivas = vi.hoisted(() => vi.fn());
vi.mock('../services/jevService', () => ({ createJevEloszuro: () => jevHivas }));

import { createAiModule } from './aiModule';

type Beallitas = {
    cikkek?: number;
    kulcsszavak?: string[];
    frissHirek?: { id: number; forras_id: number; cluster_id: string; cim: string }[];
    user?: Record<string, unknown> | null;
    korabbiErtesites?: boolean;
};

const elemzes = (felulir = {}) => ({
    osszefoglalo: 'Összefoglaló',
    hangulat: 'SEMLEGES',
    pontszam: 50,
    clickbait: 0,
    kulcsszavak: [] as string[],
    ...felulir
});

function tesztkornyezet({ cikkek = 1, kulcsszavak = [], frissHirek = [], user, korabbiErtesites = false }: Beallitas = {}) {
    const hirek = Array.from({ length: cikkek }, (_, i) => ({ id: i + 1, cim: `Cikk ${i + 1}`, tartalom: 'Szöveg', forras_id: 99, url: 'https://example.org' }));
    const naplo = vi.fn().mockResolvedValue({});
    const services = {
        db: {
            felhasznalok: {
                findUnique: vi.fn().mockResolvedValue(
                    user === undefined ? { id: 1, api_key: 'kulcs', ai_provider: 'GROQ', ai_modell: null, jev_api_key: null, feliratkozott_kategoriak: [] } : user
                )
            },
            hirek: { findMany: vi.fn().mockResolvedValue([...frissHirek]), update: vi.fn().mockResolvedValue({}), findFirst: vi.fn().mockResolvedValue(null) },
            felhasznaloKulcsszavak: { findMany: vi.fn().mockResolvedValue(kulcsszavak.map((kulcsszo) => ({ kulcsszo }))) },
            hirForrasok: { count: vi.fn().mockResolvedValue(0), findUnique: vi.fn().mockResolvedValue(null) },
            aiElemzesek: { findFirst: vi.fn().mockResolvedValue(null) },
            ertesitesek: { findFirst: vi.fn().mockResolvedValue(korabbiErtesites ? { id: 1 } : null) },
            rendszerNaplo: { create: naplo }
        },
        hirRepo: { getFeldolgozatlanHirek: vi.fn().mockResolvedValue(hirek), saveAiElemzes: vi.fn().mockResolvedValue({}) },
        ai: { hirElemzese: vi.fn().mockResolvedValue(elemzes()), hírKlaszterezes: vi.fn().mockResolvedValue('klaszter-1') },
        notify: { ertesitesKuldese: vi.fn().mockResolvedValue(undefined) }
    };
    return { services, naplo, futtat: () => futtatas(services) };
}

// A cikkek közötti várakozást az álórák azonnal lefuttatják
async function futtatas(services: unknown) {
    const eredmeny = createAiModule(services as never).ujHirekFeldolgozasa(1);
    await vi.runAllTimersAsync();
    return eredmeny;
}

const naplozottTipusok = (naplo: ReturnType<typeof vi.fn>) => naplo.mock.calls.map((h) => h[0].data.esemeny_tipus);

beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    jevHivas.mockReset();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('BYOK', () => {
    it('saját AI kulcs nélkül nem hív AI szolgáltatót', async () => {
        const { services, futtat } = tesztkornyezet({ user: { id: 1, api_key: null } });
        expect((await futtat()).kihagyva).toBe(true);
        expect(services.ai.hirElemzese).not.toHaveBeenCalled();
    });
});

describe('hibakezelés', () => {
    it('sikeres futásnál menti az elemzést és a klasztert', async () => {
        const { services, futtat } = tesztkornyezet({ cikkek: 2 });
        expect(await futtat()).toMatchObject({ sikeres: 2, hibas: 0 });
        expect(services.hirRepo.saveAiElemzes).toHaveBeenCalledTimes(2);
    });

    it('3 egymás utáni hiba után leáll és naplóz, a maradék cikket nem küldi el', async () => {
        const { services, naplo, futtat } = tesztkornyezet({ cikkek: 10 });
        services.ai.hirElemzese.mockResolvedValue({ hiba: 'HIBA', hibaUzenet: 'A modell nem létezik' });
        expect(await futtat()).toMatchObject({ sikeres: 0, hibas: 3 });
        expect(services.ai.hirElemzese).toHaveBeenCalledTimes(3);
        expect(naplozottTipusok(naplo)).toContain('AI_ABORT');
        expect(services.hirRepo.saveAiElemzes).not.toHaveBeenCalled();
    });

    it('egy közbeeső sikeres elemzés nullázza a hibaszámlálót', async () => {
        const { services, naplo, futtat } = tesztkornyezet({ cikkek: 5 });
        const hiba = { hiba: 'HIBA', hibaUzenet: 'x' };
        services.ai.hirElemzese
            .mockResolvedValueOnce(hiba).mockResolvedValueOnce(hiba).mockResolvedValueOnce(elemzes())
            .mockResolvedValueOnce(hiba).mockResolvedValueOnce(hiba);
        expect(await futtat()).toMatchObject({ sikeres: 1, hibas: 4 });
        expect(naplozottTipusok(naplo)).not.toContain('AI_ABORT');
    });

    it('kimerült kvótánál azonnal leáll, és a cikk a következő futásra marad', async () => {
        const { services, naplo, futtat } = tesztkornyezet({ cikkek: 5 });
        services.ai.hirElemzese.mockResolvedValue({ hiba: 'QUOTA' });
        await futtat();
        expect(services.ai.hirElemzese).toHaveBeenCalledTimes(1);
        expect(services.hirRepo.saveAiElemzes).not.toHaveBeenCalled();
        expect(naplozottTipusok(naplo)).toContain('AI_QUOTA');
    });
});

describe('Jev előszűrés', () => {
    const jevesUser = { id: 1, api_key: 'kulcs', ai_provider: 'GROQ', ai_modell: null, jev_api_key: 'jev', feliratkozott_kategoriak: [] };

    it('a kiszűrt cikkre nem hív LLM-et', async () => {
        jevHivas.mockResolvedValue({ szurendo: true, hirertek: 10, clickbait: 0, tokenek: 5 });
        const { services, futtat } = tesztkornyezet({ user: jevesUser });
        expect((await futtat()).eloszurt).toBe(1);
        expect(services.ai.hirElemzese).not.toHaveBeenCalled();
    });

    it('figyelt kulcsszót tartalmazó cikket nem szűr ki', async () => {
        jevHivas.mockResolvedValue({ szurendo: true, hirertek: 10, clickbait: 0, tokenek: 5 });
        const { services, futtat } = tesztkornyezet({ user: jevesUser, kulcsszavak: ['cikk'] });
        await futtat();
        expect(jevHivas).not.toHaveBeenCalled();
        expect(services.ai.hirElemzese).toHaveBeenCalledTimes(1);
    });

    it('a Jev hibája után a cikkek szűrés nélkül mennek tovább', async () => {
        jevHivas.mockRejectedValue(new Error('401'));
        const { services, naplo, futtat } = tesztkornyezet({ cikkek: 2, user: jevesUser });
        expect(await futtat()).toMatchObject({ sikeres: 2, eloszurt: 0 });
        expect(jevHivas).toHaveBeenCalledTimes(1);
        expect(services.ai.hirElemzese).toHaveBeenCalledTimes(2);
        expect(naplozottTipusok(naplo)).toContain('JEV_WARNING');
    });
});

describe('riasztás', () => {
    const friss = (id: number, forras_id: number) => ({ id, forras_id, cluster_id: 'klaszter-1', cim: `Régi ${id}` });

    it('3 különböző forrás és elég hírérték esetén bombahírt küld', async () => {
        const { services, futtat } = tesztkornyezet({ frissHirek: [friss(50, 1), friss(51, 2)] });
        services.ai.hirElemzese.mockResolvedValue(elemzes({ pontszam: 60 }));
        await futtat();
        expect(services.notify.ertesitesKuldese.mock.calls[0][2].cim).toContain('BOMBAHÍR');
    });

    it('ugyanannak a forrásnak több cikke nem bombahír', async () => {
        const { services, futtat } = tesztkornyezet({ frissHirek: [friss(50, 99), friss(51, 99)] });
        services.ai.hirElemzese.mockResolvedValue(elemzes({ pontszam: 90 }));
        await futtat();
        expect(services.notify.ertesitesKuldese).not.toHaveBeenCalled();
    });

    it('kulcsszó találatnál riaszt', async () => {
        const { services, futtat } = tesztkornyezet({ kulcsszavak: ['CIKK'] });
        await futtat();
        expect(services.notify.ertesitesKuldese.mock.calls[0][2].cim).toContain('RELEVÁNS TÉMA');
    });

    it('ugyanarról a témáról nem küld második értesítést', async () => {
        const { services, futtat } = tesztkornyezet({ kulcsszavak: ['cikk'], korabbiErtesites: true });
        await futtat();
        expect(services.notify.ertesitesKuldese).not.toHaveBeenCalled();
    });

    it('feltétel nélkül nem riaszt', async () => {
        const { services, futtat } = tesztkornyezet();
        await futtat();
        expect(services.notify.ertesitesKuldese).not.toHaveBeenCalled();
    });
});
