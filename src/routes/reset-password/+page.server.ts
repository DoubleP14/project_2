// src/routes/reset-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { Actions, PageServerLoad } from './$types';
import { services } from '$lib/server';
import { logger } from '$lib/server/services/loggerService';

const MIN_JELSZO_HOSSZ = 8;

// Érvényes (nem lejárt) tokenhez tartozó felhasználó megkeresése
const felhasznaloTokenAlapjan = async (token: string | null) => {
    if (!token) return null;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return services.db.felhasznalok.findFirst({
        where: { jelszo_reset_token: tokenHash, jelszo_reset_lejarat: { gt: new Date() } }
    });
};

export const load: PageServerLoad = async ({ url, locals }) => {
    if (locals.user) throw redirect(302, '/dashboard');

    const token = url.searchParams.get('token');
    const user = await felhasznaloTokenAlapjan(token);

    return { token, ervenyes: !!user };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const token = formData.get('token')?.toString() ?? null;
        const jelszo = formData.get('password')?.toString() ?? '';
        const jelszoUjra = formData.get('password_confirm')?.toString() ?? '';

        const user = await felhasznaloTokenAlapjan(token);
        if (!user) return fail(400, { message: 'A link érvénytelen vagy lejárt. Kérj új jelszó-visszaállító linket!' });

        if (jelszo.length < MIN_JELSZO_HOSSZ) {
            return fail(400, { message: `A jelszónak legalább ${MIN_JELSZO_HOSSZ} karakter hosszúnak kell lennie.` });
        }
        if (jelszo !== jelszoUjra) {
            return fail(400, { message: 'A két jelszó nem egyezik.' });
        }

        await services.db.felhasznalok.update({
            where: { id: user.id },
            data: {
                password_hash: await bcrypt.hash(jelszo, 10),
                // A token egyszer használatos
                jelszo_reset_token: null,
                jelszo_reset_lejarat: null,
                // Az e-mailben kapott link igazolja az e-mail cím birtoklását
                email_verified: true,
                verification_token: null,
                // Minden korábbi munkamenet (pl. egy illetéktelen által nyitott is) azonnal megszűnik
                token_verzio: { increment: 1 }
            }
        });

        await logger.info('PASSWORD_RESET', 'Jelszó sikeresen visszaállítva', user.id);

        throw redirect(303, '/login?reset=true');
    }
};
