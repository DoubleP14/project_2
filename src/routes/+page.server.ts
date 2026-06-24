// src/routes/+page.server.ts
import { services } from '$lib/server';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
    // 1. AJTÓNÁLLÓ (GUARD)
    const user = locals.user; 

    if (!user) {
        throw redirect(303, '/login');
    }

    const prisma = services.db;
    const userId = user.id;

   // 2. URL Paraméterek beolvasása (Kategória és Szabad szavas keresés)
    const aktivKategoria = url.searchParams.get('kategoria') || 'osszes';
    const keresoKifejezes = url.searchParams.get('q') || '';

    // Okos Szinonimaszótár
    const kategoriaSzotar: Record<string, string[]> = {
        'politika': ['politika', 'belföld', 'belfold', 'kormány', 'választás', 'parlament', 'ellenzék', 'törvény'],
        'gazdasag': ['gazdaság', 'gazdasag', 'pénzügy', 'üzlet', 'infláció', 'adó', 'beruházás', 'kamat'],
        'kulfold': ['külföld', 'kulfold', 'nemzetközi', 'háború', 'világ', 'eu', 'amerika'],
        'tech': ['tech', 'technológia', 'gaming', 'tudomány', 'szoftver', 'mesterséges intelligencia', 'ai', 'űrkutatás'],
        'sport': ['sport', 'foci', 'olimpia', 'bajnokság', 'mérkőzés', 'válogatott', 'forma-1']
    };

    let keresendoSzavak: string[] = [];
    
    if (aktivKategoria !== 'osszes' && kategoriaSzotar[aktivKategoria]) {
        keresendoSzavak = [...kategoriaSzotar[aktivKategoria]];
    }

    if (keresoKifejezes) {
        keresendoSzavak.push(keresoKifejezes);
    }

    // 3. KERESÉS FELÉPÍTÉSE
    let aiElemzesFeltetel: any = {
        hir: {
            forras: { felhasznalo_id: userId },
            archivalt: false
        }
    };

    if (keresendoSzavak.length > 0) {
        aiElemzesFeltetel.OR = keresendoSzavak.flatMap(szo => [
            { hir: { cim: { contains: szo, mode: 'insensitive' } } },
            { hir: { tartalom: { contains: szo, mode: 'insensitive' } } },
            { osszefoglalo: { contains: szo, mode: 'insensitive' } },
            { kulcsszavak: { hasSome: [szo, szo.toLowerCase(), szo.toUpperCase()] } }
        ]);
    }

    // 4. ELEMZÉSEK LEKÉRÉSE
    const elemzesek = await prisma.aiElemzesek.findMany({
        where: aiElemzesFeltetel,
        orderBy: { elemzes_datuma: 'desc' },
        take: 50,
        include: {
            hir: { include: { forras: true } } 
        }
    });

    return {
        cikkek: elemzesek,
        aktivKategoria: aktivKategoria,
        keresoKifejezes: keresoKifejezes 
    };
};