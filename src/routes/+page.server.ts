// src/routes/+page.server.ts
import { services } from '$lib/server';
import { fail, redirect } from '@sveltejs/kit'; // Behoztuk a redirect-et

export const load = async ({ locals }) => {
    // 1. AJTÓNÁLLÓ (GUARD)
    // Megnézi, van-e bejelentkezett user a locals-ban.
    // Ezt a hooks.server.ts-nek kell kitöltenie korábban!
    const user = (locals as any).user;

    if (!user) {
        // Ha nincs user, nincs hírnézegetés ==> bejelentkezés!
        throw redirect(303, '/login');
    }

    const prisma = services.db;
    const userId = user.id; // Itt már biztos benne, hogy van ID

    // 2. Elemzések lekérése (Csak ha be van jelentkezve)
    const elemzesek = await prisma.aiElemzesek.findMany({
        orderBy: { elemzes_datuma: 'desc' },
        take: 12,
        include: {
            hir: {
                include: {
                    forras: true 
                }
            } 
        }
    });
    
    // 3. Kulcsszavak lekérése (Kifejezetten a bejelentkezett userhez)
    const kulcsszavak = await prisma.felhasznaloKulcsszavak.findMany({
        where: { felhasznalo_id: userId },
        orderBy: { hozzadas_ideje: 'asc' }
    });

    return {
        cikkek: elemzesek,
        kulcsszavak: kulcsszavak,
        user: user 
    };
};

export const actions = {
    addKeyword: async ({ request, locals }) => {
        const user = (locals as any).user;
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
        const user = (locals as any).user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const formData = await request.formData();
        const id = Number(formData.get('id'));

        try {
            // Extra biztonság: csak akkor törölhet, ha az övé a kulcsszó!
            await prisma.felhasznaloKulcsszavak.delete({
                where: { 
                    id: id,
                    felhasznalo_id: user.id // Így más kulcsszavát nem tudja törölni az ID eltalálásával
                }
            });
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Hiba a törlés során!' });
        }
    }
};