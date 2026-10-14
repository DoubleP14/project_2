// src/routes/api/auth/resend-verification/+server.ts
import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import { services } from '$lib/server';
import { emailService } from '$lib/server/services/emailService';

// Spam védelem: e-mail címenként legfeljebb 2 percenként küldünk új levelet
const UJRAKULDES_VARAKOZAS_MS = 2 * 60 * 1000;
const utolsoKuldesek = new Map<string, number>();

export const POST = async ({ request, url }) => {
    const { email } = await request.json().catch(() => ({ email: null }));
    if (!email || typeof email !== 'string') {
        return json({ error: 'Add meg az e-mail címedet!' }, { status: 400 });
    }

    const kulcs = email.trim().toLowerCase();
    const utolso = utolsoKuldesek.get(kulcs) ?? 0;
    if (Date.now() - utolso < UJRAKULDES_VARAKOZAS_MS) {
        return json({ error: 'Nemrég már küldtünk levelet. Kérlek, várj 2 percet az újabb kérés előtt.' }, { status: 429 });
    }
    // A korlát létező és nem létező címre egyformán érvényes, így a válaszból nem derül ki, létezik-e a fiók
    utolsoKuldesek.set(kulcs, Date.now());

    // Mindig ugyanazt válaszoljuk, hogy ne lehessen kideríteni, mely e-mail címek regisztráltak
    const valasz = json({ message: 'Ha ehhez az e-mail címhez tartozik megerősítésre váró fiók, újraküldtük a megerősítő levelet.' });

    const user = await services.db.felhasznalok.findUnique({ where: { email: email.trim() } });
    if (!user || user.email_verified) return valasz;

    // Új token: a korábbi link ezzel érvénytelenné válik
    const token = crypto.randomUUID();
    await services.db.felhasznalok.update({
        where: { id: user.id },
        data: { verification_token: token }
    });

    try {
        await emailService.sendVerificationEmail(user.email, token, url.origin);
    } catch (error) {
        console.error('Nem sikerült újraküldeni a megerősítő e-mailt:', error);
        return json({ error: 'Nem sikerült elküldeni az e-mailt. Kérlek, próbáld újra később.' }, { status: 500 });
    }

    return valasz;
};
