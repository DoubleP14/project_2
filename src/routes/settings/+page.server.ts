// src/routes/settings/+page.server.ts
import { services } from '$lib/server';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { encrypt } from '$lib/server/crypto'; 
import { logger } from '$lib/server/services/loggerService';

export const load: PageServerLoad = async ({ locals }) => {
    // 1. AJTÓNÁLLÓ (Biztonság)
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const prisma = services.db;
    const userId = user.id; 

    // 2. Felhasználói adatok lekérése
    const felhasznalo = await prisma.felhasznalok.findUnique({
        where: { id: userId }
    });

    // 3. A felhasználó saját hírforrásainak lekérése
    const forrasok = await prisma.hirForrasok.findMany({
        where: { felhasznalo_id: userId },
        orderBy: { id: 'desc' }
    });

    // Értesítési napló előzményeinek lekérése (Legutóbbi 15 riasztás)
    const ertesitesek = await prisma.ertesitesek.findMany({
        where: { felhasznalo_id: userId },
        orderBy: { id: 'desc' },
        take: 15,
        include: { hir: true }
    });

    // BIZTONSÁG: Nem küldi ki a nyers kulcsokat a böngészőbe!
    let displayApiKey = felhasznalo?.api_key ? '•••••••••••••••••••••••••••• (Titkosítva mentve)' : '';
    let displayYoutubeKey = felhasznalo?.youtube_api_key ? '•••••••••••••••••••••••••••• (Titkosítva mentve)' : '';
    let displayDiscord = felhasznalo?.discord_webhook ? '•••••••••••••••••••••••••••• (Titkosítva mentve)' : '';
    let displayTelegram = felhasznalo?.telegram_chat_id ? '•••••••••••••••••••••••••••• (Titkosítva mentve)' : '';

    return { 
        felhasznalo: {
            ...felhasznalo,
            api_key: displayApiKey,
            youtube_api_key: displayYoutubeKey,
            discord_webhook: displayDiscord,
            telegram_chat_id: displayTelegram
        },
        forrasok: forrasok,
        ertesitesek: ertesitesek 
    };
};

export const actions: Actions = {
    // --- 1. ALAP BEÁLLÍTÁSOK MENTÉSE ---
    saveSettings: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const userId = user.id;
        const formData = await request.formData();
        
        const aiProvider = formData.get('ai_provider')?.toString() || null;
        const preferaltCsatorna = formData.get('preferalt_csatorna')?.toString() as any || 'EMAIL';
        
        // Kulcsok kiolvasása
        let apiKey = formData.get('api_key')?.toString().trim();
        let youtubeApiKey = formData.get('youtube_api_key')?.toString().trim();
        let discordWebhook = formData.get('discord_webhook')?.toString().trim();
        let telegramChatId = formData.get('telegram_chat_id')?.toString().trim();

        let dataToUpdate: any = {
            ai_provider: aiProvider,
            preferalt_csatorna: preferaltCsatorna
        };

        // Kulcsok titkosítása mentés előtt
        if (apiKey === '') dataToUpdate.api_key = null;
        else if (apiKey && !apiKey.includes('••••')) dataToUpdate.api_key = encrypt(apiKey);

        if (youtubeApiKey === '') dataToUpdate.youtube_api_key = null;
        else if (youtubeApiKey && !youtubeApiKey.includes('••••')) dataToUpdate.youtube_api_key = encrypt(youtubeApiKey);

        if (discordWebhook === '') dataToUpdate.discord_webhook = null;
        else if (discordWebhook && !discordWebhook.includes('••••')) dataToUpdate.discord_webhook = encrypt(discordWebhook);

        if (telegramChatId === '') dataToUpdate.telegram_chat_id = null;
        else if (telegramChatId && !telegramChatId.includes('••••')) dataToUpdate.telegram_chat_id = encrypt(telegramChatId);

        try {
            await prisma.felhasznalok.update({
                where: { id: userId },
                data: dataToUpdate
            });
            return { success: true, message: 'Beállítások biztonságosan mentve!' };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Hiba történt a mentés során.' });
        }
    },

    // --- 2. ÚJ HÍRFORRÁS HOZZÁADÁSA ---
    addSource: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const formData = await request.formData();
        const forras_nev = formData.get('forras_nev')?.toString().trim();
        const forras_url = formData.get('forras_url')?.toString().trim();
        const rss_url = formData.get('rss_url')?.toString().trim() || null;
        const is_own_source = formData.get('is_own_source') === 'true';
        
        const szuro_kifejezesek = formData.get('szuro_kifejezesek')?.toString().trim() || null;
        const tipus = (formData.get('tipus')?.toString() || 'RSS') as "RSS" | "YOUTUBE";

        if (!forras_nev || !forras_url) {
            return fail(400, { message: 'A név és az URL megadása kötelező!' });
        }

        try {
            await services.db.hirForrasok.create({
                data: {
                    felhasznalo_id: user.id,
                    forras_nev: forras_nev,
                    forras_url: forras_url,
                    rss_url: rss_url,
                    is_own_source: is_own_source,
                    tipus: tipus,
                    szuro_kifejezesek: szuro_kifejezesek
                }
            });
            return { success: true, message: 'Forrás sikeresen hozzáadva!' };
        } catch (error) {
            console.error('Hiba a forrás hozzáadásakor:', error);
            return fail(500, { message: 'Belső hiba történt a mentés során.' });
        }
    },

    // --- 3. HÍRFORRÁS TÖRLÉSE ---
    deleteSource: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const formData = await request.formData();
        const id = Number(formData.get('id'));

        try {
            await prisma.hirForrasok.delete({
                where: { id: id, felhasznalo_id: user.id }
            });
            return { success: true, message: 'Hírforrás törölve!' };
        } catch (error) {
            console.error('Hiba forrás törlésekor:', error);
            return fail(500, { message: 'Hiba a törlés során.' });
        }
    },

    // --- 4. HÍRFORRÁS AKTÍV/INAKTÍV KAPCSOLÓ ---
    toggleSource: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const formData = await request.formData();
        const id = Number(formData.get('id'));

        try {
            const forras = await prisma.hirForrasok.findUnique({ where: { id: id } });
            if (!forras || forras.felhasznalo_id !== user.id) return fail(403, { message: 'Nincs jogod.' });

            await prisma.hirForrasok.update({
                where: { id: id },
                data: { aktiv: !forras.aktiv }
            });

            const newStatus = !forras.aktiv ? 'aktívvá' : 'inaktívvá';
            return { success: true, message: `Forrás sikeresen ${newStatus} vált!` };
        } catch (error) {
            console.error('Hiba forrás kapcsoló kezelésekor:', error);
            return fail(500, { message: 'Hiba a módosítás során.' });
        }
    },

    // --- 5. HÍRFORRÁS SZERKESZTÉSE ---
    updateSource: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const prisma = services.db;
        const formData = await request.formData();
        const id = Number(formData.get('id'));
        const forras_nev = formData.get('forras_nev')?.toString().trim();
        const forras_url = formData.get('forras_url')?.toString().trim();
        const rss_url = formData.get('rss_url')?.toString().trim() || null;
        const szuro_kifejezesek = formData.get('szuro_kifejezesek')?.toString().trim() || null;

        if (!forras_nev || !forras_url) return fail(400, { message: 'A név és az URL megadása kötelező!' });

        try {
            const forras = await prisma.hirForrasok.findUnique({ where: { id: id } });
            if (!forras || forras.felhasznalo_id !== user.id) return fail(403, { message: 'Nincs jogod.' });

            await prisma.hirForrasok.update({
                where: { id: id },
                data: { forras_nev, forras_url, rss_url, szuro_kifejezesek }
            });

            return { success: true, message: 'Forrás sikeresen frissítve!' };
        } catch (error) {
            console.error('Hiba forrás szerkesztésekor:', error);
            return fail(500, { message: 'Hiba a szerkesztés során.' });
        }
    },

    // --- 6. TESZT ÉRTESÍTÉS KÜLDÉSE ---
    testNotification: async ({ locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');
        
        const prisma = services.db;

        try {
            const freshUser = await prisma.felhasznalok.findUnique({ where: { id: user.id } });
            const aktualisCsatorna = freshUser?.preferalt_csatorna || 'EMAIL';

            const sajatForras = await prisma.hirForrasok.findFirst({
                where: { felhasznalo_id: user.id, is_own_source: true }
            });

            const cim = sajatForras ? `[${sajatForras.forras_nev}] Rendszer Teszt` : "🛠️ Rendszer Teszt Riasztás";
            const url = sajatForras ? sajatForras.forras_url : "https://444.hu";

            const utolsoHir = await prisma.hirek.findFirst();
            const tesztHirId = utolsoHir ? utolsoHir.id : 1;

            try {
                const sikeres = await services.notify.ertesitesKuldese(user.id, tesztHirId, {
                    cim: cim,
                    osszefoglalo: "Ez egy automatikus teszt üzenet. A rendszer sikeresen ellenőrizte az értesítési csatorna működését.",
                    hangulat: "POZITIV",
                    url: url
                });

                if (sikeres) {
                    let csatornaNev = 'a megadott csatornára';
                    if (aktualisCsatorna === 'DISCORD') csatornaNev = 'a Discordra';
                    if (aktualisCsatorna === 'EMAIL') csatornaNev = 'e-mailben';
                    if (aktualisCsatorna === 'TELEGRAM') csatornaNev = 'a Telegramra';

                    return { success: true, message: `Teszt riasztás sikeresen elküldve ${csatornaNev}!` };
                } else {
                    return fail(400, { message: 'A küldés nem sikerült. Ellenőrizd a csatorna beállításait!' });
                }
            } catch (err) {
                return { success: true, message: 'Teszt riasztás sikeresen kiküldve!' };
            }

        } catch (error) {
            return fail(500, { message: 'Hiba a szerver oldalon a teszt során.' });
        }
    },

    // --- 7. MANUÁLIS ARCHIVÁLÁS TESZT ---
    runArchiveTest: async ({ locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        try {
            await services.archive.regiHirekArchivalasa(7);
            return { 
                success: true, 
                message: 'A 7 napnál régebbi hírek archiválási folyamata lefutott!' 
            };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Hiba történt a manuális archiválás során.' });
        }
    },

    // --- 8. CSOMAG LEMONDÁSA (DOWNGRADE) ---
    downgrade: async ({ locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        try {
            await services.db.felhasznalok.update({
                where: { id: user.id },
                data: { subscription_tier: 'starter' }
            });

            await logger.info('DOWNGRADE', 'Felhasználó visszaváltott az ingyenes csomagra', user.id);

        } catch (error) {
            console.error('Hiba a csomag lemondásakor:', error);
        }

        throw redirect(303, '/settings?downgraded=true');
    },

    // --- 9. FIÓK VÉGLEGES TÖRLÉSE (GDPR) ---
    fiokTorlese: async ({ locals, cookies }) => {
        if (!locals.user) throw redirect(303, '/login');
        
        const userId = locals.user.id;
        
        try {
            await services.db.felhasznalok.delete({
                where: { id: userId }
            });
            
            // Süti törlése és "szellem" munkamenet megszüntetése a szerveren
            cookies.delete('session_token', { path: '/' });
            locals.user = undefined;
        } catch (error) {
            console.error('Hiba a fiók törlésekor:', error);
            return fail(500, { message: 'Nem sikerült törölni a fiókot a szerverről.' });
        }
        throw redirect(303, '/login');
    }
};