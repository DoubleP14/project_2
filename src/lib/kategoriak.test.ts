import { describe, expect, it } from 'vitest';
import { illeszkedoKategoria } from './kategoriak';
import { ALAPERTELMEZETT_MODELLEK, modellValasztas } from './aiModellek';

describe('témakör illesztés', () => {
    it('csak feliratkozott témakörre illeszt', () => {
        expect(illeszkedoKategoria(['Infláció'], ['gazdasag'])).toBe('gazdasag');
        expect(illeszkedoKategoria(['Infláció'], ['sport'])).toBeNull();
    });

    it('ismeretlen témakör nem okoz hibát', () => {
        expect(illeszkedoKategoria(['Infláció'], ['nincs-ilyen'])).toBeNull();
    });
});

describe('modellválasztás', () => {
    it('egyedi modell nélkül a szolgáltató alapértelmezettje érvényes', () => {
        expect(modellValasztas('OPENAI', null)).toEqual({ szolgaltato: 'OPENAI', modell: ALAPERTELMEZETT_MODELLEK.OPENAI });
    });

    it('a felhasználó egyedi modellje elsőbbséget kap', () => {
        expect(modellValasztas('GROQ', ' openai/gpt-oss-120b ').modell).toBe('openai/gpt-oss-120b');
    });

    it('formailag hibás modellnév helyett az alapértelmezett fut', () => {
        expect(modellValasztas('OPENAI', 'rossz modell; drop').modell).toBe(ALAPERTELMEZETT_MODELLEK.OPENAI);
    });

    it('ismeretlen szolgáltató helyett Groq', () => {
        expect(modellValasztas('NINCS', null).szolgaltato).toBe('GROQ');
    });
});
