// src/hooks.server.ts
import cron from 'node-cron';
import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';
import { services } from '$lib/server/index';
import { jobs } from '$lib/server/jobs';

// ==========================================
// 1. ROBOTPILÓTA (CRON JOB)
// ==========================================
if (!(globalThis as any).__robotPilotaInditva) {
    
    // HÍRGYŰJTŐ ÉS ELEMZŐ (Fut minden órában)
    cron.schedule('0 * * * *', async () => {
        await jobs.teljesFrissites('CRON');
    });

    // VÉGLEGES TAKARÍTÓ (Fut minden hajnal 3:00-kor)
    cron.schedule('0 3 * * *', async () => {
        console.log('\n[CRON] Éjszakai adatbázis takarítás (Hard Delete) indul...');
        try {
            await jobs.regiHirekTorlese('CRON');
        } catch (error) {
            console.error('[CRON] Hiba a végleges törlés során:', error);
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
                    role: true,
                    aktiv: true
                }
            });

            // 4. Beteszi a locals-ba a TÉNYLEGES adatokat (letiltott fiók azonnal kijelentkezik)
            if (dbUser && dbUser.aktiv) {
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