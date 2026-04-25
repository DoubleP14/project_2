// src/routes/settings/+page.server.ts
import { services } from '$lib/server';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { encrypt } from '$lib/server/crypto'; // <--- Behozzuk a titkosítót!

export const load: PageServerLoad = async ({ locals }) => {
    const prisma = services.db;
    const userId = (locals as any).user?.id || 1; 

    const felhasznalo = await prisma.felhasznalok.findUnique({
        where: { id: userId }
    });

    // BIZTONSÁG: Nem küldi ki a nyers API kulcsot a böngészőbe!
    // Csak azt mondja meg, hogy VAN-E mentve kulcs.
    let displayApiKey = '';
    if (felhasznalo?.api_key) {
        displayApiKey = '•••••••••••••••••••••••••••• (Titkosítva mentve)';
    }

    return { 
        felhasznalo: {
            ...felhasznalo,
            api_key: displayApiKey // Felülírja a csillagokkal
        } 
    };
};

export const actions: Actions = {
    saveSettings: async ({ request, locals }) => {
        const prisma = services.db;
        const userId = (locals as any).user?.id || 1;
        const formData = await request.formData();
        
        const aiProvider = formData.get('ai_provider')?.toString() || null;
        let apiKey = formData.get('api_key')?.toString().trim() || null;

        // Értesítési adatok
        const preferaltCsatorna = formData.get('preferalt_csatorna')?.toString() as any || 'EMAIL';
        const discordWebhook = formData.get('discord_webhook')?.toString().trim() || null;
        const telegramChatId = formData.get('telegram_chat_id')?.toString().trim() || null;

        // Csak akkor frissíti és TITKOSÍTJUK az API kulcsot, ha újat írt be!
        // (Ha csak a csillagokat küldi vissza, nem nyúl hozzá)
        let dataToUpdate: any = {
            ai_provider: aiProvider,
            preferalt_csatorna: preferaltCsatorna,
            discord_webhook: discordWebhook,
            telegram_chat_id: telegramChatId
        };

        if (apiKey && !apiKey.includes('••••')) {
            dataToUpdate.api_key = encrypt(apiKey);
        }

        try {
            await prisma.felhasznalok.update({
                where: { id: userId },
                data: dataToUpdate
            });

            return { success: true, message: 'Beállítások biztonságosan titkosítva és mentve!' };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Hiba történt a mentés során.' });
        }
    }
};