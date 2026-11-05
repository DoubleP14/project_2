import { describe, expect, it } from 'vitest';
import { CSV_BOM, csvCella, csvDokumentum, csvSor } from './csv';

describe('CSV cella', () => {
    it('a pontosvesszőt, idézőjelet és sortörést helyesen zárja idézőjelbe', () => {
        expect(csvCella('a;b')).toBe('"a;b"');
        expect(csvCella('mondta "ezt"')).toBe('"mondta ""ezt"""');
        expect(csvCella('két\nsor')).toBe('"két\nsor"');
    });

    it.each(['=HYPERLINK("http://tamado.hu")', '+1+1', '-1+1', '@SUM(A1)', '\tx', '\rx'])('képletnek látszó szöveget semlegesít: %j', (ertek) => {
        expect(csvCella(ertek).replace(/^"/, '')).toMatch(/^'/);
    });

    it('a számot és a hiányzó értéket kezeli', () => {
        expect(csvCella(-5)).toBe('-5');
        expect(csvCella(null)).toBe('');
        expect(csvCella(undefined)).toBe('');
    });
});

describe('CSV dokumentum', () => {
    it('pontosvesszővel tagol', () => {
        expect(csvSor(['a', 1, null])).toBe('a;1;');
    });

    it('BOM-mal kezdődik, és CRLF sorvégeket használ', () => {
        expect(csvDokumentum([['a'], ['b']])).toBe(`${CSV_BOM}a\r\nb\r\n`);
    });
});
