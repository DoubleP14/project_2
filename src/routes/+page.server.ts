// src/routes/+page.server.ts
import { services } from '$lib/server';
import { fail } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    const prisma = services.db;

    // 1. Elemzések lekérése
    const elemzesek = await prisma.aiElemzesek.findMany({
        orderBy: { elemzes_datuma: 'desc' },
        take: 12,
        include: {
            hir: true 
        }
    });

    // 2. Kulcsszavak lekérése
    const userId = (locals as any).user?.id || 1; 

    const kulcsszavak = await prisma.felhasznaloKulcsszavak.findMany({
        where: { felhasznalo_id: userId },
        orderBy: { hozzadas_ideje: 'asc' }
    });

    return {
        cikkek: elemzesek,
        kulcsszavak: kulcsszavak
    };
};

export const actions = {
    addKeyword: async ({ request, locals }) => {
        const prisma = services.db;
        const formData = await request.formData();
        const bevittSzo = formData.get('kulcsszo')?.toString().trim();
        const userId = (locals as any).user?.id || 1;

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

    deleteKeyword: async ({ request }) => {
        const prisma = services.db;
        const formData = await request.formData();
        const id = Number(formData.get('id'));

        try {
            await prisma.felhasznaloKulcsszavak.delete({
                where: { id: id }
            });
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Hiba a törlés során!' });
        }
    }
};