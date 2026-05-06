// src/routes/statisztika/+page.server.ts
import { services } from '$lib/server';

export const load = async () => {
    const prisma = services.db;

    // 1. Összes eddigi AI elemzés megszámolása
    const osszesElemzes = await prisma.aiElemzesek.count();

    // 2. Hangulatok szerinti csoportosítás
    const hangulatok = await prisma.aiElemzesek.groupBy({
        by: ['hangulat'],
        _count: { hangulat: true }
    });

    const stat = {
        POZITIV: hangulatok.find(h => h.hangulat === 'POZITIV')?._count.hangulat || 0,
        NEGATIV: hangulatok.find(h => h.hangulat === 'NEGATIV')?._count.hangulat || 0,
        SEMLEGES: hangulatok.find(h => h.hangulat === 'SEMLEGES')?._count.hangulat || 0,
    };

    // 3. Nyers források lekérése (mindenkitől)
    const nyersForrasok = await prisma.hirForrasok.findMany({
        include: {
            _count: { select: { hirek: true } }
        }
    });

    // 4. DUPLIKÁCIÓK SZŰRÉSE: URL alapú összevonás
    const osszevontForrasokMap = new Map();

    for (const forras of nyersForrasok) {
        const url = forras.forras_url;
        
        if (!osszevontForrasokMap.has(url)) {
            osszevontForrasokMap.set(url, { ...forras });
        } else {
            const letezo = osszevontForrasokMap.get(url);
            if (forras._count.hirek > letezo._count.hirek) {
                letezo._count.hirek = forras._count.hirek;
            }
        }
    }

    const egyediForrasok = Array.from(osszevontForrasokMap.values());

    return {
        osszesElemzes,
        stat,
        forrasok: egyediForrasok 
    };
};