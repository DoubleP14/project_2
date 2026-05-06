// src/routes/settings/+page.server.ts
import { services } from '$lib/server';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { encrypt } from '$lib/server/crypto'; 

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

    // BIZTONSÁG: Nem küldi ki a nyers API kulcsokat a böngészőbe!
    let displayApiKey = '';
    if (felhasznalo?.api_key) {
        displayApiKey = '•••••••••••••••••••••••••••• (Titkosítva mentve)';
    }

    let displayYoutubeKey = '';
    if (felhasznalo?.youtube_api_key) {
        displayYoutubeKey = '•••••••••••••••••••••••••••• (Mentve)';
    }

    return { 
        felhasznalo: {
            ...felhasznalo,
            api_key: displayApiKey,
            youtube_api_key: displayYoutubeKey 
        },
        forrasok: forrasok 
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
        const discordWebhook = formData.get('discord_webhook')?.toString().trim() || null;
        const telegramChatId = formData.get('telegram_chat_id')?.toString().trim() || null;
        
        // Kulcsok kiolvasása
        let apiKey = formData.get('api_key')?.toString().trim() || null;
        let youtubeApiKey = formData.get('youtube_api_key')?.toString().trim() || null;

        let dataToUpdate: any = {
            ai_provider: aiProvider,
            preferalt_csatorna: preferaltCsatorna,
            discord_webhook: discordWebhook,
            telegram_chat_id: telegramChatId
        };

        // AI kulcs mentése 
        if (apiKey) {
            if (!apiKey.includes('••••')) dataToUpdate.api_key = encrypt(apiKey);
        } else {
            dataToUpdate.api_key = null; 
        }

        // YouTube kulcs mentése 
        if (youtubeApiKey) {
            if (!youtubeApiKey.includes('••••')) dataToUpdate.youtube_api_key = youtubeApiKey;
        } else {
            dataToUpdate.youtube_api_key = null; 
        }

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
        
        const tipus = (formData.get('tipus')?.toString() || 'RSS') as "RSS" | "YOUTUBE" | "TWITTER";

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
                    tipus: tipus 
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
                where: { 
                    id: id,
                    felhasznalo_id: user.id 
                }
            });
            return { success: true, message: 'Hírforrás törölve!' };
        } catch (error) {
            console.error('Hiba forrás törlésekor:', error);
            return fail(500, { message: 'Hiba a törlés során.' });
        }
    }
};