import { describe, expect, it } from 'vitest';
import { jevSzurendoE } from './jevService';

describe('Jev előszűrés szabályai', () => {
    it('kiszűri a biztosan alacsony hírértékű cikket', () => {
        expect(jevSzurendoE({ hirertek: 30, hirertekBizalom: 0.9 })).toBe(true);
    });

    it('a közepes hírértékű cikket megtartja', () => {
        expect(jevSzurendoE({ hirertek: 31, hirertekBizalom: 0.9 })).toBe(false);
    });

    it('bizonytalan értékelésnél nem szűr', () => {
        expect(jevSzurendoE({ hirertek: 0, hirertekBizalom: 0.59 })).toBe(false);
    });
});
