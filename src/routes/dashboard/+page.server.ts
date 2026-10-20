// src/routes/dashboard/+page.server.ts
import { services } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import { KATEGORIA_SZOTAR } from '$lib/kategoriak';

// --- FONTOSSÁGI RANGSOR ---
// 0 = Kiemelt (magas hírérték, nem clickbait), 1 = Normál, 2 = Hátrasorolt (clickbait vagy alacsony hírérték)
const rangsorSzint = (e: { pontszam: number | null; clickbait: number }) => {
    const pontszam = e.pontszam ?? 0;
    if (e.clickbait >= 71 || pontszam <= 30) return 2;
    if (pontszam > 70) return 0;
    return 1;
};

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
    const rendezes = url.searchParams.get('rendezes') === 'friss' ? 'friss' : 'fontossag';

    // Egy szólista illeszkedési feltétele (cím, tartalom, összefoglaló vagy AI kulcsszó)
    const szavakFeltetel = (szavak: string[]) => ({
        OR: szavak.flatMap(szo => [
            { hir: { cim: { contains: szo, mode: 'insensitive' } } },
            { hir: { tartalom: { contains: szo, mode: 'insensitive' } } },
            { osszefoglalo: { contains: szo, mode: 'insensitive' } },
            { kulcsszavak: { hasSome: [szo, szo.toLowerCase()] } }
        ])
    });

    // 3. KERESÉS FELÉPÍTÉSE (kategória ÉS kulcsszó együtt szűkít)
    const szurok: any[] = [];
    if (aktivKategoria !== 'osszes' && KATEGORIA_SZOTAR[aktivKategoria]) {
        szurok.push(szavakFeltetel(KATEGORIA_SZOTAR[aktivKategoria].szinonimak));
    }
    if (keresoKifejezes) {
        szurok.push(szavakFeltetel([keresoKifejezes]));
    }

    const aiElemzesFeltetel: any = {
        hir: {
            forras: { felhasznalo_id: userId },
            archivalt: false
        },
        ...(szurok.length > 0 ? { AND: szurok } : {})
    };

    // 4. ELEMZÉSEK LEKÉRÉSE (a legfrissebb 50)
    const elemzesek = await prisma.aiElemzesek.findMany({
        where: aiElemzesFeltetel,
        orderBy: { elemzes_datuma: 'desc' },
        take: 50,
        include: {
            hir: { include: { forras: true } }
        }
    });

    // Fontossági rendezés: a clickbait és alacsony hírértékű tartalmak hátra kerülnek,
    // a kiemelt (makrogazdasági, országos horderejű) hírek előre. Szinten belül az időrend marad.
    // (A sort stabil, így az elemzes_datuma szerinti sorrend megmarad.)
    if (rendezes === 'fontossag') {
        elemzesek.sort((a: typeof elemzesek[number], b: typeof elemzesek[number]) => rangsorSzint(a) - rangsorSzint(b));
    }

    // 5. BYOK ellenőrzés: saját AI kulcs nélkül nincs elemzés
    const kulcsok = await services.hirRepo.getFelhasznaloKulcsok(userId);

    // 6. Gap analízis ("Hiányzó hír") csak akkor értelmes, ha van legalább egy saját forrás
    const vanSajatForras = (await prisma.hirForrasok.count({
        where: { felhasznalo_id: userId, is_own_source: true }
    })) > 0;

    return {
        vanApiKulcs: !!kulcsok?.api_key,
        vanSajatForras,
        cikkek: elemzesek,
        aktivKategoria: aktivKategoria,
        keresoKifejezes: keresoKifejezes,
        rendezes: rendezes
    };
};