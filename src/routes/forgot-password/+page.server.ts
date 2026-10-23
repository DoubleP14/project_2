// src/routes/forgot-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { services } from '$lib/server';
import { jelszoResetLinkKuldese } from '$lib/server/jelszoReset';

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

        try {
            await jelszoResetLinkKuldese(user, url.origin);
        } catch (error) {
            console.error('Nem sikerült elküldeni a jelszó-visszaállító e-mailt:', error);
            return fail(500, { message: 'Nem sikerült elküldeni az e-mailt. Kérlek, próbáld újra később.' });
        }

        return valasz;
    }
};
