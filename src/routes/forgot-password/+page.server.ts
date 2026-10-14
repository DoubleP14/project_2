// src/routes/forgot-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'crypto';
import type { Actions, PageServerLoad } from './$types';
import { services } from '$lib/server';
import { emailService } from '$lib/server/services/emailService';
import { logger } from '$lib/server/services/loggerService';

const ERVENYESSEG_PERC = 60;
// Ugyanarra a fiókra legfeljebb ennyi időnként küldünk új levelet (spam védelem)
const UJRAKULDES_VARAKOZAS_MS = 2 * 60 * 1000;

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) throw redirect(302, '/dashboard');
    return {};
};

export const actions: Actions = {
    default: async ({ request, url }) => {
        const formData = await request.formData();
        const email = formData.get('email')?.toString().trim().toLowerCase();

        if (!email) return fail(400, { message: 'Add meg az e-mail címedet!' });

        // Mindig ugyanazt válaszoljuk, hogy ne lehessen kideríteni, mely e-mail címek regisztráltak
        const valasz = { success: true, message: 'Ha ehhez az e-mail címhez tartozik aktív fiók, elküldtük a jelszó-visszaállító linket.' };

        const user = await services.db.felhasznalok.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
        });
        if (!user || !user.aktiv || !user.email_verified) return valasz;

        // Ha nemrég már küldtünk linket, nem küldünk újat
        const korabbiKeresIdeje = user.jelszo_reset_lejarat
            ? user.jelszo_reset_lejarat.getTime() - ERVENYESSEG_PERC * 60 * 1000
            : 0;
        if (Date.now() - korabbiKeresIdeje < UJRAKULDES_VARAKOZAS_MS) return valasz;

        // A nyers token csak az e-mailbe kerül, az adatbázisba a hash-e
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        await services.db.felhasznalok.update({
            where: { id: user.id },
            data: {
                jelszo_reset_token: tokenHash,
                jelszo_reset_lejarat: new Date(Date.now() + ERVENYESSEG_PERC * 60 * 1000)
            }
        });

        try {
            await emailService.sendPasswordResetEmail(user.email, token, url.origin, ERVENYESSEG_PERC);
            await logger.info('PASSWORD_RESET_REQUEST', 'Jelszó-visszaállító link kiküldve', user.id);
        } catch (error) {
            console.error('Nem sikerült elküldeni a jelszó-visszaállító e-mailt:', error);
            return fail(500, { message: 'Nem sikerült elküldeni az e-mailt. Kérlek, próbáld újra később.' });
        }

        return valasz;
    }
};
