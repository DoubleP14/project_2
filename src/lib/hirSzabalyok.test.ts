import { describe, expect, it } from 'vitest';
import { bombahirE, kulcsszoTalalat, kulonbozoForrasokSzama, rangsorSzint, temakorRiasztasE } from './hirSzabalyok';

describe('bombahír', () => {
    it('egy forrás több cikke egy forrásnak számít', () => {
        expect(kulonbozoForrasokSzama([1, 1, 1, 1])).toBe(1);
        expect(kulonbozoForrasokSzama([1, 2, 2, 3])).toBe(3);
    });

    it('az ismeretlen forrást nem számolja', () => {
        expect(kulonbozoForrasokSzama([1, null, undefined])).toBe(1);
    });

    it('3 forrás és 60-as hírérték kell hozzá (határértékek)', () => {
        expect(bombahirE(3, 60)).toBe(true);
        expect(bombahirE(2, 100)).toBe(false);
        expect(bombahirE(10, 59)).toBe(false);
    });
});

describe('témakör riasztás', () => {
    it('csak 71-es hírértéktől indul', () => {
        expect(temakorRiasztasE(70)).toBe(false);
        expect(temakorRiasztasE(71)).toBe(true);
    });
});

describe('kulcsszó találat', () => {
    it('a kis- és nagybetűt nem különbözteti meg, ékezetes szónál sem', () => {
        expect(kulcsszoTalalat('Emelkedik az INFLÁCIÓ', ['infláció'])).toBe('infláció');
        expect(kulcsszoTalalat('emelkedik az infláció', ['INFLÁCIÓ'])).toBe('INFLÁCIÓ');
    });

    it('nincs találat esetén null', () => {
        expect(kulcsszoTalalat('Sportesemény', ['infláció', 'kamat'])).toBeNull();
    });

    it('üres kulcsszó nem illeszkedik mindenre', () => {
        expect(kulcsszoTalalat('Bármilyen cikk', ['', '   '])).toBeNull();
    });
});

describe('fontossági rangsor', () => {
    it('kiemelt, normál és hátrasorolt szint a határértékeken', () => {
        expect(rangsorSzint({ pontszam: 71, clickbait: 0 })).toBe(0);
        expect(rangsorSzint({ pontszam: 70, clickbait: 0 })).toBe(1);
        expect(rangsorSzint({ pontszam: 31, clickbait: 70 })).toBe(1);
        expect(rangsorSzint({ pontszam: 30, clickbait: 0 })).toBe(2);
    });

    it('a clickbait a magas hírértékű hírt is hátrasorolja', () => {
        expect(rangsorSzint({ pontszam: 95, clickbait: 71 })).toBe(2);
    });

    it('hiányzó pontszám alacsony hírértéknek számít', () => {
        expect(rangsorSzint({ pontszam: null, clickbait: 0 })).toBe(2);
    });
});
