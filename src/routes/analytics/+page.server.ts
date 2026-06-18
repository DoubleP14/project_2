// src/routes/statisztika/+page.server.ts
import { services } from '$lib/server';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    // Biztonsági ellenőrzés: csak bejelentkezett felhasználó láthatja
    if (!locals.user) {
        throw redirect(303, '/');
    }

    const userId = locals.user.id;
    const prisma = services.db;

    // 1. Összes eddigi AI elemzés megszámolása (CSAK A SAJÁT HÍREKRE)
    const osszesElemzes = await prisma.aiElemzesek.count({
        where: { hir: { forras: { felhasznalo_id: userId } } }
    });

    // 2. Hangulatok szerinti csoportosítás (CSAK A SAJÁT HÍREKRE)
    const hangulatok = await prisma.aiElemzesek.groupBy({
        by: ['hangulat'],
        where: { hir: { forras: { felhasznalo_id: userId } } },
        _count: { hangulat: true }
    });

    const stat = {
        POZITIV: hangulatok.find(h => h.hangulat === 'POZITIV')?._count.hangulat || 0,
        NEGATIV: hangulatok.find(h => h.hangulat === 'NEGATIV')?._count.hangulat || 0,
        SEMLEGES: hangulatok.find(h => h.hangulat === 'SEMLEGES')?._count.hangulat || 0,
    };

    // --- TRUSTSCORE STATISZTIKÁK (CSAK A SAJÁT HÍREKRE) ---
    // Globális TrustScore átlag lekérése
    const trustScoreAgregacio = await prisma.aiElemzesek.aggregate({
        where: { hir: { forras: { felhasznalo_id: userId } } },
        _avg: { pontszam: true }
    });
    const atlagosTrustScore = Math.round(trustScoreAgregacio._avg.pontszam || 0);

    // Darabszámok kategóriák szerint (0-30, 31-70, 71-100)
    const clickbaitDarab = await prisma.aiElemzesek.count({ where: { pontszam: { lte: 30 }, hir: { forras: { felhasznalo_id: userId } } } });
    const normalDarab = await prisma.aiElemzesek.count({ where: { pontszam: { gt: 30, lte: 70 }, hir: { forras: { felhasznalo_id: userId } } } });
    const kiemelkedoDarab = await prisma.aiElemzesek.count({ where: { pontszam: { gt: 70 }, hir: { forras: { felhasznalo_id: userId } } } });

    // 3. Nyers források lekérése (CSAK A SAJÁT FORRÁSOK!)
    // BELEÉRTVE A GLOBÁLIS FORRÁSOKAT IS 
    const nyersForrasok = await prisma.hirForrasok.findMany({
        where: { 
            felhasznalo_id: userId 
        },
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
            if (forras.hiba_szamlalo > letezo.hiba_szamlalo) {
                letezo.hiba_szamlalo = forras.hiba_szamlalo;
                letezo.utolso_hiba = forras.utolso_hiba;
            }
        }
    }

    const egyediForrasok = Array.from(osszevontForrasokMap.values());

    return {
        osszesElemzes,
        stat,
        forrasok: egyediForrasok,
        atlagosTrustScore,
        trustScoreMegoszlas: {
            clickbait: clickbaitDarab,
            normal: normalDarab,
            kiemelkedo: kiemelkedoDarab
        }
    };
};