// src/hooks.server.ts
import cron from 'node-cron';
import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';
import { modules, services } from '$lib/server/index'; 

// ==========================================
// 1. ROBOTPILÓTA (CRON JOB)
// ==========================================
if (!(globalThis as any).__robotPilotaInditva) {
    cron.schedule('0 * * * *', async () => {
        console.log('\n[CRON] Robotpilóta ébred: Hírek automatikus letöltése ÉS AI elemzése indul...');
        try {
            // 1. Lekéri az összes usert az adatbázisból
            const users = await services.db.felhasznalok.findMany();

            // 2. Minden usernek lefrissíti a forrásait a SAJÁT API kulcsaival! (BYOK)
            for (const user of users) {
                await modules.hirGyujto.osszesForrasFrissitese(user.id);
            }

            // 3. AI klaszterezés
            await modules.aiElemzo.ujHirekFeldolgozasa();
            console.log('[CRON] Automatikus frissítés és AI klaszterezés befejeződött!\n');
        } catch (error) {
            console.error('[CRON] Kritikus hiba történt:', error);
        }
    });

    (globalThis as any).__robotPilotaInditva = true;
    console.log('Robotpilóta (Cron) SIKERESEN élesítve. Óránként elemez.');
}

// ==========================================
// 2. AUTHENTIKÁCIÓ
// ==========================================
export const handle: Handle = async ({ event, resolve }) => {
    // 1. Kikeresi a sütik közül a "session_token"-t
    const token = event.cookies.get('session_token');

    if (token) {
        try {
            // 2. Kicsomagolja a JWT tokent a titkos kulccsal
            const decoded = jwt.verify(token, JWT_SECRET) as any;

            // 3. Beteszi a locals-ba, amit a főoldal +page.server.ts fájlja figyel!
            event.locals.user = { 
                id: decoded.userId, 
                role: decoded.role 
            };
        } catch (error) {
            // Ha a token lejárt vagy érvénytelen, törli a sütit, és kijelentkezve marad
            event.cookies.delete('session_token', { path: '/' });
            (event.locals as any).user = undefined;
        }
    }

    // 4. Továbbengedi a kérést a rendszerben
    return await resolve(event);
};