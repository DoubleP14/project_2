import { describe, expect, it } from 'vitest';
import { jevSzurendoE } from './jevService';

const biztos = { hirertekBizalom: 0.9, clickbaitBizalom: 0.9 };

describe('Jev előszűrés szabályai', () => {
    it('kiszűri a biztosan alacsony hírértékű cikket', () => {
        expect(jevSzurendoE({ ...biztos, hirertek: 30, clickbait: 0 })).toBe(true);
    });

    it('megtartja a közepes hírértékű, tényszerű cikket', () => {
        expect(jevSzurendoE({ ...biztos, hirertek: 31, clickbait: 70 })).toBe(false);
    });

    it('kiszűri az erős clickbaitet, ha a hír nem kiemelt', () => {
        expect(jevSzurendoE({ ...biztos, hirertek: 70, clickbait: 71 })).toBe(true);
    });

    it('a kiemelt hírt clickbait címmel sem szűri ki', () => {
        expect(jevSzurendoE({ ...biztos, hirertek: 71, clickbait: 100 })).toBe(false);
    });

    it('bizonytalan értékelésnél nem szűr', () => {
        expect(jevSzurendoE({ hirertek: 0, clickbait: 100, hirertekBizalom: 0.59, clickbaitBizalom: 0.9 })).toBe(false);
        expect(jevSzurendoE({ hirertek: 0, clickbait: 100, hirertekBizalom: 0.9, clickbaitBizalom: 0.59 })).toBe(false);
    });
});
