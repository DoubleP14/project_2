import { describe, expect, it, vi } from 'vitest';
import {
    angolSzovegE, binaris, bootstrapCi, csvBeolvas, exportVizsgalat, hangulatMeres, hangulatNormal, mae, median, pontszamMeres, reteg, retegzettMinta, sav, spearman
} from './kozos.mjs';
import { emberSzerintSzurendo, jevMeres, pontozolapBeolvasas } from './3-kiertekeles.mjs';
import { futasFajlNev, futtatas } from './2-modellfuttatas.mjs';

describe('CSV beolvasás', () => {
    it('kezeli az idézőjelet, a sortörést és a pontosvesszőt', () => {
        expect(csvBeolvas('a;b\r\n"x;1";"két\nsor ""idézet"""\r\n')).toEqual([{ a: 'x;1', b: 'két\nsor "idézet"' }]);
    });

    it('a psql vesszős kimenetét is felismeri', () => {
        expect(csvBeolvas('a,b\n1,"x,y"\n')).toEqual([{ a: '1', b: 'x,y' }]);
    });

    it('az üres sorokat kihagyja', () => {
        expect(csvBeolvas('a;b\r\n1;2\r\n;\r\n\r\n')).toEqual([{ a: '1', b: '2' }]);
    });
});

describe('mintavétel', () => {
    const sor = (id, hirertek, clickbait = 0, hasznalt_modell = 'm') => ({ hir_id: String(id), hirertek, clickbait, hasznalt_modell });
    const sorok = [
        ...Array.from({ length: 200 }, (_, i) => sor(i, 50)),
        ...Array.from({ length: 30 }, (_, i) => sor(1000 + i, 80)),
        ...Array.from({ length: 30 }, (_, i) => sor(2000 + i, 20)),
        ...Array.from({ length: 30 }, (_, i) => sor(3000 + i, 10, 0, 'jev-latest (előszűrés)'))
    ];

    it('besorolja a rétegeket', () => {
        expect(reteg(sor(1, 50))).toBe('kozepes');
        expect(reteg(sor(1, 50, 71))).toBe('kiemelt_vagy_clickbait');
        expect(reteg(sor(1, 30))).toBe('alacsony');
        expect(reteg(sor(1, 90, 0, 'jev-latest (előszűrés)'))).toBe('eloszurt');
    });

    it('ugyanazzal a maggal ugyanazt a mintát adja, mással nem', () => {
        const ids = (m) => retegzettMinta(sorok, 60, m).map((s) => s.hir_id);
        expect(ids(42)).toEqual(ids(42));
        expect(ids(42)).not.toEqual(ids(43));
    });

    it('a kért darabszámot adja, ismétlés nélkül, a ritka rétegeket felülsúlyozva', () => {
        const m = retegzettMinta(sorok, 60, 1);
        expect(m).toHaveLength(60);
        expect(new Set(m.map((s) => s.hir_id)).size).toBe(60);
        expect(m.filter((s) => reteg(s) === 'kiemelt_vagy_clickbait')).toHaveLength(15);
        expect(m.filter((s) => reteg(s) === 'alacsony')).toHaveLength(12);
        expect(m.filter((s) => reteg(s) === 'eloszurt')).toHaveLength(9);
    });

    it('hiányzó rétegnél a maradékból tölti fel a mintát', () => {
        const csakKozepes = Array.from({ length: 50 }, (_, i) => sor(i, 50));
        expect(retegzettMinta(csakKozepes, 30, 1)).toHaveLength(30);
        expect(retegzettMinta(csakKozepes, 80, 1)).toHaveLength(50);
    });
});

describe('mérőszámok', () => {
    it('MAE és medián', () => {
        expect(mae([10, 20], [20, 40])).toBe(15);
        expect(median([1, 3, 2, 10])).toBe(2.5);
    });

    it('Spearman: tökéletes egyezés, fordított sorrend, holtverseny', () => {
        expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
        expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
        expect(spearman([1, 2, 2, 3], [1, 2, 2, 3])).toBeCloseTo(1);
    });

    it('állandó értéknél a korreláció nem értelmezhető', () => {
        expect(spearman([50, 50, 50], [1, 2, 3])).toBeNaN();
    });

    it('sávok határértékei', () => {
        expect([30, 31, 70, 71].map(sav)).toEqual(['alacsony', 'kozepes', 'kozepes', 'magas']);
    });

    it('precízió és felidézés kézzel számolt példán', () => {
        expect(binaris([80, 80, 20, 20], [80, 20, 80, 20])).toMatchObject({ tp: 1, fp: 1, fn: 1, precizio: 0.5, felidezes: 0.5, f1: 0.5 });
    });

    it('ha az AI sosem jelez, a precízió nem értelmezhető, a felidézés 0', () => {
        const b = binaris([40, 40], [90, 20]);
        expect(b.precizio).toBeNaN();
        expect(b.felidezes).toBe(0);
    });

    it('a konfidenciaintervallum tartalmazza a mért értéket, és megismételhető', () => {
        const a = [10, 40, 50, 60, 90, 30, 20, 70];
        const b = [20, 35, 60, 50, 70, 45, 10, 80];
        const [also, felso] = bootstrapCi(a, b, mae);
        expect(also).toBeLessThanOrEqual(mae(a, b));
        expect(felso).toBeGreaterThanOrEqual(mae(a, b));
        expect(bootstrapCi(a, b, mae)).toEqual([also, felso]);
    });

    it('a pontszámok összenyomódását a szórás mutatja', () => {
        const m = pontszamMeres([45, 50, 45, 50], [10, 90, 20, 80]);
        expect(m.aiSzoras).toBeLessThan(m.emberSzoras);
        expect(m.savEgyezes).toBe(0);
    });
});

describe('hangulat', () => {
    it('értelmezi a rövid és hosszú, ékezetes alakokat', () => {
        expect(['p', 'Pozitív', 'N', 'negatív', 's', 'SEMLEGES'].map(hangulatNormal)).toEqual(['POZITIV', 'POZITIV', 'NEGATIV', 'NEGATIV', 'SEMLEGES', 'SEMLEGES']);
        expect(hangulatNormal('talán')).toBeNull();
    });

    it('tévesztési mátrix, pontosság és kappa', () => {
        const m = hangulatMeres(['POZITIV', 'SEMLEGES', 'SEMLEGES', 'NEGATIV'], ['POZITIV', 'POZITIV', 'SEMLEGES', 'NEGATIV']);
        expect(m.pontossag).toBe(0.75);
        expect(m.matrix.POZITIV.SEMLEGES).toBe(1);
        expect(m.kappa).toBeCloseTo((0.75 - 0.3125) / (1 - 0.3125));
    });

    it('ha az AI mindig ugyanazt mondja, a kappa 0, a magas pontosság ellenére is', () => {
        const m = hangulatMeres(['SEMLEGES', 'SEMLEGES', 'SEMLEGES', 'SEMLEGES'], ['SEMLEGES', 'SEMLEGES', 'SEMLEGES', 'NEGATIV']);
        expect(m.pontossag).toBe(0.75);
        expect(m.kappa).toBeCloseTo(0);
    });
});

describe('nyelv becslése', () => {
    it('felismeri a képernyőképen látott angol összefoglalót', () => {
        expect(angolSzovegE('Vitézy Dávid, a former deputy state secretary, will become the new CEO of HungaroControl.')).toBe(true);
    });

    it('a magyar szöveget és a nagyon rövidet nem jelöli', () => {
        expect(angolSzovegE('A kormány bezárja az Élelmiszermentő Központot, mert a központ nem látta el a feladatait.')).toBe(false);
        expect(angolSzovegE('The end')).toBe(false);
    });
});

describe('export vizsgálata', () => {
    it('számolja az összenyomódást és a jeleket, az előszűrtek nélkül', () => {
        const v = exportVizsgalat([
            { cim: 'Magyar cím', hirertek: '50', hangulat: 'SEMLEGES', hasznalt_modell: 'm', osszefoglalo: 'The new law was adopted by the parliament and will take effect in the spring.' },
            { cim: 'Másik cím', hirertek: '40', hangulat: 'NEGATIV', hasznalt_modell: 'm', osszefoglalo: 'Rövid.' },
            { cim: 'Szűrt', hirertek: '10', hangulat: 'SEMLEGES', hasznalt_modell: 'jev-latest (előszűrés)', osszefoglalo: '' }
        ]);
        expect(v).toMatchObject({ osszes: 3, llm: 2, eloszurt: 1, pontosan50: 0.5, kozott35es50: 1, legalabb71: 0, angolOsszefoglalo: 1 });
        expect(v.hangulatDb).toEqual({ POZITIV: 0, SEMLEGES: 1, NEGATIV: 1 });
    });
});

describe('pontozólap beolvasása', () => {
    const sor = (felulir = {}) => ({ sorszam: '1', sajat_hirertek: '60', sajat_clickbait: '10', sajat_hangulat: 'S', osszefoglalo_pontos: '2', ...felulir });

    it('a jó sort elfogadja, az üreset kihagyja', () => {
        const e = pontozolapBeolvasas([sor(), sor({ sorszam: '2', sajat_hirertek: '', sajat_clickbait: '', sajat_hangulat: '' })]);
        expect(e.kitoltott).toEqual([{ sorszam: '1', hirertek: 60, clickbait: 10, hangulat: 'SEMLEGES', pontos: 2 }]);
        expect(e.hianyos).toBe(1);
        expect(e.hibak).toEqual([]);
    });

    it.each([
        [{ sajat_hirertek: '150' }, 'sajat_hirertek'],
        [{ sajat_hirertek: 'sok' }, 'sajat_hirertek'],
        [{ sajat_clickbait: '' }, 'sajat_clickbait'],
        [{ sajat_hangulat: 'x' }, 'sajat_hangulat'],
        [{ osszefoglalo_pontos: '5' }, 'osszefoglalo_pontos']
    ])('a hibás értéket jelzi, és nem számolja bele: %j', (felulir, mezo) => {
        const e = pontozolapBeolvasas([sor(felulir)]);
        expect(e.kitoltott).toEqual([]);
        expect(e.hibak[0]).toContain(mezo);
    });

    it('az előszűrt sor "-" jelét elfogadja összefoglaló-pont nélkül', () => {
        expect(pontozolapBeolvasas([sor({ osszefoglalo_pontos: '-' })]).kitoltott[0].pontos).toBeNull();
    });
});

describe('Jev mérés', () => {
    it('az emberi pontokra ugyanazt a szabályt alkalmazza, mint az éles szűrő', () => {
        expect(emberSzerintSzurendo({ hirertek: 30, clickbait: 0 })).toBe(true);
        expect(emberSzerintSzurendo({ hirertek: 70, clickbait: 71 })).toBe(true);
        expect(emberSzerintSzurendo({ hirertek: 71, clickbait: 100 })).toBe(false);
    });

    it('megszámolja a jogos és a tévesen kiszűrt híreket', () => {
        const ember = new Map([['1', { hirertek: 20, clickbait: 0 }], ['2', { hirertek: 65, clickbait: 0 }]]);
        expect(jevMeres([{ sorszam: '1' }, { sorszam: '2' }, { sorszam: '3' }], ember)).toEqual({ n: 2, jogos: 1, fontosElveszett: 1 });
    });
});

describe('modellfuttatás', () => {
    const cikkek = [1, 2, 3, 4, 5].map((n) => ({ sorszam: String(n), cim: `C${n}`, tartalom: 'x'.repeat(3000) }));
    const jo = { pontszam: 50, clickbait: 0, hangulat: 'SEMLEGES', osszefoglalo: 'ö', hiba: null };

    it('a már kész cikkeket kihagyja, így folytatható', async () => {
        const elemzo = vi.fn().mockResolvedValue(jo);
        const ment = vi.fn();
        const e = await futtatas({ cikkek, marKesz: new Set(['1', '2']), elemzo, ment });
        expect(elemzo).toHaveBeenCalledTimes(3);
        expect(ment).toHaveBeenCalledTimes(3);
        expect(e).toEqual({ sikeres: 3, hibas: 0, leallt: false });
    });

    it('az élessel egyezően legfeljebb 2500 karaktert küld', async () => {
        const elemzo = vi.fn().mockResolvedValue(jo);
        await futtatas({ cikkek: cikkek.slice(0, 1), marKesz: new Set(), elemzo, ment: () => {} });
        expect(elemzo.mock.calls[0][1]).toHaveLength(2500);
    });

    it('kvótahibánál azonnal leáll, és nem ment', async () => {
        const elemzo = vi.fn().mockResolvedValue({ hiba: 'QUOTA' });
        const ment = vi.fn();
        expect((await futtatas({ cikkek, marKesz: new Set(), elemzo, ment })).leallt).toBe(true);
        expect(elemzo).toHaveBeenCalledTimes(1);
        expect(ment).not.toHaveBeenCalled();
    });

    it('3 egymás utáni hiba után leáll, közbeeső siker után nem', async () => {
        const hiba = { hiba: 'API', hibaUzenet: 'x' };
        const leallo = vi.fn().mockResolvedValue(hiba);
        expect(await futtatas({ cikkek, marKesz: new Set(), elemzo: leallo, ment: () => {} })).toEqual({ sikeres: 0, hibas: 3, leallt: true });

        const folytato = vi.fn().mockResolvedValueOnce(hiba).mockResolvedValueOnce(hiba).mockResolvedValueOnce(jo).mockResolvedValueOnce(hiba).mockResolvedValueOnce(jo);
        expect(await futtatas({ cikkek, marKesz: new Set(), elemzo: folytato, ment: () => {} })).toEqual({ sikeres: 2, hibas: 3, leallt: false });
    });

    it('a modellnévből biztonságos fájlnevet képez', () => {
        expect(futasFajlNev('openai/gpt-oss-120b')).toBe('futas-openai_gpt-oss-120b.csv');
        expect(futasFajlNev('../../rossz')).toBe('futas-.._.._rossz.csv');
    });
});
