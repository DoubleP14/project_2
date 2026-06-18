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
    
    // HÍRGYŰJTŐ ÉS ELEMZŐ (Fut minden órában)
    cron.schedule('0 * * * *', async () => {
        console.log('\n[CRON] Robotpilóta ébred: Hírek automatikus letöltése ÉS AI elemzése indul...');
        
        // NAPLÓZÁS: Indulás
        await services.db.rendszerNaplo.create({
            data: { esemeny_tipus: 'CRON_START', leiras: 'Hírgyűjtő és AI elemző robotpilóta elindult.' }
        });

        try {
            const users = await services.db.felhasznalok.findMany({ where: { aktiv: true } });

            for (const user of users) {
                console.log(`\n[CRON] Feldolgozás a(z) ${user.id}. felhasználónak...`);
                await modules.hirGyujto.osszesForrasFrissitese(user.id);
                await modules.aiElemzo.ujHirekFeldolgozasa(user.id); 
            }

            // NAPLÓZÁS: Siker
            await services.db.rendszerNaplo.create({
                data: { esemeny_tipus: 'CRON_SUCCESS', leiras: `Sikeres lefutás. ${users.length} aktív felhasználó hírei feldolgozva.` }
            });
            console.log('\n[CRON] Automatikus frissítés és AI klaszterezés befejeződött!\n');

        } catch (error) {
            console.error('[CRON] Kritikus hiba történt:', error);
            // NAPLÓZÁS: Hiba
            await services.db.rendszerNaplo.create({
                data: { esemeny_tipus: 'CRON_ERROR', leiras: `Kritikus hiba a cron futásakor: ${error instanceof Error ? error.message : 'Ismeretlen'}` }
            });
        }
    });

    // ARCHIVÁLÓ TAKARÍTÓ (Fut minden hajnal 3:00-kor)
    cron.schedule('0 3 * * *', async () => {
        console.log('\n[CRON] Éjszakai adatbázis takarítás (Soft Delete) indul...');
        try {
            await services.archive.regiHirekArchivalasa(7);
            
            // NAPLÓZÁS: Éjszakai takarítás
            await services.db.rendszerNaplo.create({
                data: { esemeny_tipus: 'SYSTEM_CLEANUP', leiras: 'Éjszakai adatbázis takarítás (7 napnál régebbi hírek) sikeresen lefutott.' }
            });
        } catch (error) {
            console.error('[CRON] Hiba az archiválás során:', error);
        }
    });

    (globalThis as any).__robotPilotaInditva = true;
    console.log('Robotpilóta (Cron) SIKERESEN élesítve. Óránként elemez, hajnalban takarít.');
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

            // 3. Lekéri a teljes felhasználót az adatbázisból!
            const dbUser = await services.db.felhasznalok.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    subscription_tier: true,
                    role: true
                }
            });

            // 4. Beteszi a locals-ba a TÉNYLEGES adatokat
            if (dbUser) {
                event.locals.user = {
                    id: dbUser.id,
                    email: dbUser.email,
                    username: dbUser.username,
                    subscription_tier: dbUser.subscription_tier,
                    role: dbUser.role || 'USER'
                };
            } else {
                event.cookies.delete('session_token', { path: '/' });
                (event.locals as any).user = undefined;
            }

        } catch (error) {
            // Ha a token lejárt vagy érvénytelen, törli a sütit, és kijelentkezve marad
            event.cookies.delete('session_token', { path: '/' });
            (event.locals as any).user = undefined;
        }
    }

    // 5. Továbbengedi a kérést a rendszerben
    return await resolve(event);
};