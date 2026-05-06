// src/routes/+page.server.ts
import { services } from '$lib/server';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    // 1. AJTÓNÁLLÓ (GUARD)
    const user = locals.user; 

    if (!user) {
        throw redirect(303, '/login');
    }

    const prisma = services.db;
    const userId = user.id;

    // 2. KULCSSZAVAK LEKÉRÉSE A SZŰRÉSHEZ
    const kulcsszavakDB = await prisma.felhasznaloKulcsszavak.findMany({
        where: { felhasznalo_id: userId },
        orderBy: { hozzadas_ideje: 'asc' }
    });
    
    // Kicsomagolja a szavakat egy sima tömbbe (pl. ['politika', 'gta'])
    const userKulcsszavak = kulcsszavakDB.map(k => k.kulcsszo);

    // 3. Keresés kiterjesztése
    let aiElemzesFeltetel: any = {
        hir: {
            forras: { felhasznalo_id: userId }
        }
    };

    // Ha vett fel kulcsszavakat, akkor szűr azokra is, mindenhol!
    if (userKulcsszavak.length > 0) {
        aiElemzesFeltetel.OR = userKulcsszavak.flatMap(szo => [
            // Keresés az eredeti hír címében
            { hir: { cim: { contains: szo, mode: 'insensitive' } } },
            // Keresés az eredeti hír tartalmában
            { hir: { tartalom: { contains: szo, mode: 'insensitive' } } },
            // ÚJ: Keresés az AI által írt összefoglalóban (Itt már sokkal nagyobb az esély a találatra!)
            { osszefoglalo: { contains: szo, mode: 'insensitive' } }
        ]);
    }

    // 4. ELEMZÉSEK LEKÉRÉSE SZŰRŐVEL
    const elemzesek = await prisma.aiElemzesek.findMany({
        where: aiElemzesFeltetel,
        orderBy: { elemzes_datuma: 'desc' },
        take: 50,
        include: {
            hir: {
                include: {
                    forras: true 
                }
            } 
        }
    });

    return {
        cikkek: elemzesek,
        kulcsszavak: kulcsszavakDB
    };
};

export const actions = {
    addKeyword: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const formData = await request.formData();
        const bevittSzo = formData.get('kulcsszo')?.toString().trim();
        const userId = user.id;

        if (!bevittSzo || bevittSzo.length < 2) {
            return fail(400, { message: 'Túl rövid kulcsszó!' });
        }

        try {
            await prisma.felhasznaloKulcsszavak.create({
                data: {
                    kulcsszo: bevittSzo.toLowerCase(), 
                    felhasznalo_id: userId
                }
            });
            return { success: true };
        } catch (error) {
            return fail(400, { message: 'Ez a kulcsszó már szerepel a listádon!' });
        }
    },

    deleteKeyword: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const formData = await request.formData();
        const id = Number(formData.get('id'));

        try {
            await prisma.felhasznaloKulcsszavak.delete({
                where: { 
                    id: id,
                    felhasznalo_id: user.id
                }
            });
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Hiba a törlés során!' });
        }
    }
};