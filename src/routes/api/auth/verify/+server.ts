// src/routes/api/auth/verify/+server.ts
import { services } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/server/services/loggerService'; // Logger importálása

export const GET: RequestHandler = async ({ url }) => {
    // 1. Kiolvassa a tokent az URL-ből (?token=...)
    const token = url.searchParams.get('token');
    if (!token) throw redirect(303, '/login?error=invalid_token');

    const prisma = services.db;

    // 2. Megkeresi azt a felhasználót, akihez ez a token tartozik
    const felhasznalo = await prisma.felhasznalok.findFirst({
        where: { verification_token: token }
    });

    // Ha nincs ilyen token az adatbázisban, hibával visszadobja a loginra
    if (!felhasznalo) {
        throw redirect(303, '/login?error=invalid_token');
    }

    // 3. Aktiválja a felhasználót, és törli a tokent 
    await prisma.felhasznalok.update({
        where: { id: felhasznalo.id },
        data: {
            email_verified: true,
            verification_token: null
        }
    });

    // <--- Sikeres e-mail megerősítés naplózása --->
    await logger.info('EMAIL_VERIFIED', `E-mail cím sikeresen aktiválva`, felhasznalo.id);

    // 4. Sikeresen átirányítja a bejelentkezéshez
    throw redirect(303, '/login?verified=true');
};