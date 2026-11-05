import { describe, expect, it } from 'vitest';
import { MEGEROSITES_ERVENYESSEG_MS, megerositesErvenyes, megerositesLejarata } from './fiokBiztonsag';

const most = new Date('2026-06-01T12:00:00Z');

describe('megerősítő link érvényessége', () => {
    it('a lejárat 24 órával későbbi', () => {
        expect(megerositesLejarata(most).getTime() - most.getTime()).toBe(MEGEROSITES_ERVENYESSEG_MS);
    });

    it('a lejárat előtt érvényes, pontosan a lejáratkor már nem', () => {
        expect(megerositesErvenyes(new Date(most.getTime() + 1), most)).toBe(true);
        expect(megerositesErvenyes(most, most)).toBe(false);
    });

    it('lejárati idő nélküli (régi) token nem érvényes', () => {
        expect(megerositesErvenyes(null, most)).toBe(false);
    });
});
