import { describe, expect, it } from 'vitest';
import { csvExportEngedelyezett, hatralevoNapok, ujLejaratSzamitasa } from './csomagok';

const NAP = 24 * 60 * 60 * 1000;
const most = new Date('2026-06-01T12:00:00Z');
const nappalKesobb = (n: number) => new Date(most.getTime() + n * NAP);

describe('új lejárat fizetés után', () => {
    it('első fizetésnél mostantól számít 30 napot', () => {
        const { lejarat, jovairtNap } = ujLejaratSzamitasa('starter', null, 'pro', most);
        expect(lejarat).toEqual(nappalKesobb(30));
        expect(jovairtNap).toBe(0);
    });

    it('azonos csomag hosszabbításakor nem vész el nap', () => {
        const { lejarat, jovairtNap } = ujLejaratSzamitasa('pro', nappalKesobb(10), 'pro', most);
        expect(lejarat).toEqual(nappalKesobb(40));
        expect(jovairtNap).toBe(10);
    });

    it('drágább csomagra váltáskor a hátralévő napok értékarányosan kevesebbet érnek', () => {
        const { lejarat, jovairtNap } = ujLejaratSzamitasa('pro', nappalKesobb(10), 'enterprise', most);
        expect(jovairtNap).toBe(2); // 10 × 2990 / 9990 = 2,99 nap
        expect(Math.abs(lejarat.getTime() - nappalKesobb(30 + (10 * 2990) / 9990).getTime())).toBeLessThan(1000);
    });

    it('olcsóbb csomagra váltáskor a hátralévő napok többet érnek', () => {
        const { jovairtNap } = ujLejaratSzamitasa('enterprise', nappalKesobb(10), 'pro', most);
        expect(jovairtNap).toBe(33); // 10 × 9990 / 2990 = 33,41 nap
    });

    it('lejárt csomag után nincs jóváírás', () => {
        const { lejarat, jovairtNap } = ujLejaratSzamitasa('pro', nappalKesobb(-1), 'pro', most);
        expect(lejarat).toEqual(nappalKesobb(30));
        expect(jovairtNap).toBe(0);
    });
});

describe('hátralévő napok', () => {
    it('felfelé kerekít, a részleges nap is számít', () => {
        expect(hatralevoNapok(new Date(most.getTime() + 1000), most)).toBe(1);
        expect(hatralevoNapok(nappalKesobb(3), most)).toBe(3);
    });

    it('lejárt vagy hiányzó dátumnál 0', () => {
        expect(hatralevoNapok(nappalKesobb(-5), most)).toBe(0);
        expect(hatralevoNapok(null, most)).toBe(0);
    });
});

describe('CSV export jogosultság', () => {
    it('csak Enterprise csomaggal vagy adminként érhető el', () => {
        expect(csvExportEngedelyezett({ subscription_tier: 'enterprise', role: 'user' })).toBe(true);
        expect(csvExportEngedelyezett({ subscription_tier: 'starter', role: 'admin' })).toBe(true);
        expect(csvExportEngedelyezett({ subscription_tier: 'pro', role: 'user' })).toBe(false);
    });
});
