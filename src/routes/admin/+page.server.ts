// src/routes/admin/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { services } from '$lib/server/index';

export async function load({ locals }) {
    const user = locals.user;

    // 1. Biztonsági ellenőrzés
    if (!user || user.role !== 'admin') {
        throw redirect(303, '/'); 
    }

    // 2. Felhasználók lekérése
    const felhasznalok = await services.db.felhasznalok.findMany({
        orderBy: { regisztracio_datuma: 'desc' },
        include: {
            _count: { select: { hir_forrasok: true, hirek: true, ertesitesek: true } }
        }
    });

    const tisztaFelhasznalok = felhasznalok.map(f => {
        const { password_hash, api_key, youtube_api_key, ...biztonsagosAdatok } = f;
        return biztonsagosAdatok;
    });

    // --- 3. Globális Rendszer Statisztikák ---
    const statisztikak = {
        osszesForras: await services.db.hirForrasok.count(),
        osszesHir: await services.db.hirek.count(),
        aiElemzesek: await services.db.aiElemzesek.count(),
    };

    // A hibás hírforrások lekérése (Ahol a hiba_szamlalo nagyobb mint 0)
    const hibasForrasok = await services.db.hirForrasok.findMany({
        where: { hiba_szamlalo: { gt: 0 } },
        orderBy: { hiba_szamlalo: 'desc' },
        include: { felhasznalo: { select: { username: true, email: true } } }
    });

    // A legutóbbi 15 rendszerüzenet lekérése
    const naplok = await services.db.rendszerNaplo.findMany({
        take: 15,
        orderBy: { letrehozva: 'desc' }, // <-- A TE MEZŐD!
        include: { felhasznalo: { select: { username: true } } }
    });

    return {
        adminFelhasznalok: tisztaFelhasznalok,
        statisztikak: statisztikak,
        naplok: naplok, 
        hibasForrasok: hibasForrasok 
    };
}

export const actions = {
    // Ez a függvény fut le, amikor az Admin átkattintja a Toggle-t
    toggleUserStatus: async ({ request, locals }) => {
        // Biztonsági ellenőrzés ismét! (Hátha valaki API-n keresztül próbálkozik)
        if (!locals.user || locals.user.role !== 'admin') {
            return { success: false, message: 'Nincs jogosultságod ehhez a művelethez!' };
        }

        const data = await request.formData();
        const userId = parseInt(data.get('userId') as string);

        if (!userId) return { success: false, message: 'Hibás felhasználó ID' };

        // 1. Lekéri a jelenlegi állapotot
        const currentUser = await services.db.felhasznalok.findUnique({
            where: { id: userId },
            select: { aktiv: true, role: true }
        });

        if (!currentUser) return { success: false, message: 'Felhasználó nem található!' };
        
        // Extra védelem: Az Admin ne tudja letiltani saját magát véletlenül!
        if (currentUser.role === 'admin' && locals.user.id === userId) {
            return { success: false, message: 'Saját magadat nem tilthatod le!' };
        }

        // 2. Megfordítja (Toggle) és elmentjük az adatbázisba
        await services.db.felhasznalok.update({
            where: { id: userId },
            data: { aktiv: !currentUser.aktiv }
        });

        return { success: true };
    }
};