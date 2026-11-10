// src/routes/fiok-torlese/+page.server.ts
// Az e-mailben kapott link ide vezet. A megnyitás (GET) még nem töröl: a levelezőprogramok linkellenőrzői is
// megnyithatják a linket. A törlés csak az oldalon lévő gomb megnyomásával (POST) történik meg.
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { felhasznaloTorlesTokennel, fiokVeglegesTorlese, reszlegesEmail } from '$lib/server/fiokTorles';
import { emailService } from '$lib/server/services/emailService';

export const load: PageServerLoad = async ({ url }) => {
    const token = url.searchParams.get('token');
    const user = await felhasznaloTorlesTokennel(token);
    return { token, ervenyes: !!user, email: user ? reszlegesEmail(user.email) : null };
};

export const actions: Actions = {
    default: async ({ request, locals, cookies }) => {
        const token = (await request.formData()).get('token')?.toString() ?? null;
        const user = await felhasznaloTorlesTokennel(token);
        if (!user) return fail(400, { message: 'A link érvénytelen, lejárt vagy már felhasználták. Kérj új megerősítő levelet a Beállításokban.' });

        try {
            await fiokVeglegesTorlese(user.id);
        } catch (error) {
            console.error('Hiba a fiók törlésekor:', error);
            return fail(500, { message: 'Nem sikerült törölni a fiókot. Kérlek, próbáld újra később.' });
        }

        // A visszaigazoló levél hibája már nem vonhatja vissza a megtörtént törlést
        try {
            await emailService.sendAccountDeletedEmail(user.email);
        } catch (error) {
            console.error('Nem sikerült elküldeni a törlés visszaigazolását:', error);
        }

        // Ha ugyanebben a böngészőben be volt jelentkezve, a munkamenet is megszűnik
        if (locals.user?.id === user.id) {
            cookies.delete('session_token', { path: '/' });
            locals.user = undefined;
        }
        throw redirect(303, '/login?fiok_torolve=true');
    }
};
