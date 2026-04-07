// src/routes/statisztika/+page.server.ts
import { services } from '$lib/server';

export const load = async () => {
    const prisma = services.db;

    // 1. Összes eddigi AI elemzés megszámolása
    const osszesElemzes = await prisma.aiElemzesek.count();

    // 2. Hangulatok szerinti csoportosítás (Hány Pozitív, Negatív, Semleges van?)
    const hangulatok = await prisma.aiElemzesek.groupBy({
        by: ['hangulat'],
        _count: { hangulat: true }
    });

    const stat = {
        POZITIV: hangulatok.find(h => h.hangulat === 'POZITIV')?._count.hangulat || 0,
        NEGATIV: hangulatok.find(h => h.hangulat === 'NEGATIV')?._count.hangulat || 0,
        SEMLEGES: hangulatok.find(h => h.hangulat === 'SEMLEGES')?._count.hangulat || 0,
    };

    // 3. Források aktivitása 
    const forrasok = await prisma.hirForrasok.findMany({
        include: {
            _count: { select: { hirek: true } }
        }
    });

    return {
        osszesElemzes,
        stat,
        forrasok
    };
};