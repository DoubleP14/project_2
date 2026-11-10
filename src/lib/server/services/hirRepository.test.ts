// Hírek mentése: címváltozáskor az elavult elemzés törlődik, így a hír újra elemzésre kerül.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHirRepository } from './hirRepository';

const prisma = {
    hirek: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    aiElemzesek: { deleteMany: vi.fn() },
    $transaction: vi.fn()
};
const repo = createHirRepository(prisma as never);
const adat = { cim: 'Hatra nőtt a halálos áldozatok száma', url: 'https://example.org/1', tartalom: 'Új bevezető', felhasznalo_id: 1, jelentoz: false };

beforeEach(() => {
    vi.clearAllMocks();
    prisma.hirek.update.mockImplementation(async (a: { data: object }) => ({ id: 5, ...a.data }));
    prisma.aiElemzesek.deleteMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(async (muveletek: Promise<unknown>[]) => Promise.all(muveletek));
});

describe('hír mentése', () => {
    it('új hírt létrehoz', async () => {
        prisma.hirek.findFirst.mockResolvedValue(null);
        await repo.hirMenteseHaUj(adat);
        expect(prisma.hirek.create).toHaveBeenCalledOnce();
        expect(prisma.aiElemzesek.deleteMany).not.toHaveBeenCalled();
    });

    it('változatlan címnél megtartja az elemzést', async () => {
        prisma.hirek.findFirst.mockResolvedValue({ id: 5, cim: adat.cim });
        await repo.hirMenteseHaUj(adat);
        expect(prisma.aiElemzesek.deleteMany).not.toHaveBeenCalled();
        expect(prisma.hirek.update.mock.calls[0][0].data).toEqual({ jelentoz: false });
    });

    it('megváltozott címnél törli az elavult elemzést, és frissíti a címet és a bevezetőt egy tranzakcióban', async () => {
        prisma.hirek.findFirst.mockResolvedValue({ id: 5, cim: 'Ötre nőtt a halálos áldozatok száma' });
        const eredmeny = await repo.hirMenteseHaUj(adat);
        expect(prisma.$transaction).toHaveBeenCalledOnce();
        expect(prisma.aiElemzesek.deleteMany).toHaveBeenCalledWith({ where: { hir_id: 5 } });
        expect(prisma.hirek.update.mock.calls[0][0].data).toEqual({ cim: adat.cim, tartalom: 'Új bevezető', jelentoz: false });
        expect(eredmeny).toMatchObject({ id: 5, cim: adat.cim });
    });
});
