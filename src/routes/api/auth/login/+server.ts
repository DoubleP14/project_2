import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { services } from '$lib/server';
import { munkamenetInditasa } from '$lib/server/session';
import { logger } from '$lib/server/services/loggerService'; 

export const POST = async ({ request, cookies }) => {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return json({ error: 'Email és jelszó megadása kötelező!' }, { status: 400 });
        }

        const prisma = services.db;

        // 1. Megkeresi a felhasználót az adatbázisban email alapján
        const user = await prisma.felhasznalok.findUnique({
            where: { email: email }
        });

        // Google-lal regisztrált fióknak nincs jelszava – az üzenet erre is utal, de nem árulja el, létezik-e a fiók
        if (!user || !user.password_hash) {
            return json({ error: 'Hibás email cím vagy jelszó! Ha Google-fiókkal regisztráltál, használd a „Folytatás Google-fiókkal” gombot.' }, { status: 401 });
        }

        // 2. Összehasonlítja a beírt jelszót az adatbázisban lévő hash-sel
        const jelszoHelyes = await bcrypt.compare(password, user.password_hash);

        if (!jelszoHelyes) {
            return json({ error: 'Hibás email cím vagy jelszó! Ha Google-fiókkal regisztráltál, használd a „Folytatás Google-fiókkal” gombot.' }, { status: 401 });
        }

        // ─── E-MAIL MEGERŐSÍTÉS ELLENŐRZÉSE ───
        if (!user.email_verified) {
            return json({
                error: 'A fiókod még nincs aktiválva! Kérlek, kattints a regisztrációkor kapott e-mailben lévő linkre.',
                code: 'EMAIL_NOT_VERIFIED'
            }, { status: 403 });
        }
        // ──────────────────────────────────────────

        // ─── ADMIN ÁLTAL LETILTOTT FIÓK ───
        if (!user.aktiv) {
            return json({ error: 'A fiókodat egy adminisztrátor letiltotta.' }, { status: 403 });
        }

        // 3-4. JWT token gyártás és munkamenet süti beállítása
        munkamenetInditasa(cookies, user);

        await logger.info('LOGIN', `Sikeres bejelentkezés (${user.email})`, user.id);

        // 5. Visszaszól a a Frontendnek, hogy jöhet befelé!
        return json({ 
            message: 'Sikeres bejelentkezés!',
            user: { username: user.username, email: user.email }
        }, { status: 200 });

    } catch (error) {
        console.error('Hiba bejelentkezéskor:', error);
        return json({ error: 'Belső szerverhiba történt.' }, { status: 500 });
    }
};