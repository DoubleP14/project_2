import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { services } from '$lib/server';
import { munkamenetInditasa } from '$lib/server/session';
import { logger } from '$lib/server/services/loggerService'; 
import { korlatTullepve, probaRogzitese, korlatTorlese, ugyfelIp } from '$lib/server/rateLimit';
import { BCRYPT_KOLTSEG } from '$lib/server/fiokBiztonsag';

// Próbálkozási korlát: 15 percenként fiókonként 10, IP-címenként 30 sikertelen belépés
const ABLAK_MS = 15 * 60 * 1000;
const MAX_FIOK = 10;
const MAX_IP = 30;

// Nem létező fióknál is lefut egy jelszó-összehasonlítás, így a válaszidőből sem derül ki, létezik-e a fiók
const ALHASH = bcrypt.hashSync('nem-letezo-fiok-alhash', BCRYPT_KOLTSEG);
const HIBAS_BELEPES = 'Hibás email cím vagy jelszó! Ha Google-fiókkal regisztráltál, használd a „Folytatás Google-fiókkal” gombot.';

export const POST = async ({ request, cookies, getClientAddress }) => {
    try {
        const { email, password } = await request.json();

        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return json({ error: 'Email és jelszó megadása kötelező!' }, { status: 400 });
        }

        const fiokKulcs = `login:fiok:${email.trim().toLowerCase()}`;
        const ipKulcs = `login:ip:${ugyfelIp({ request, getClientAddress })}`;
        if (korlatTullepve(fiokKulcs, MAX_FIOK) || korlatTullepve(ipKulcs, MAX_IP)) {
            return json({ error: 'Túl sok sikertelen próbálkozás. Kérlek, várj 15 percet, vagy használd az „Elfelejtett jelszó” funkciót.' }, { status: 429 });
        }

        const prisma = services.db;

        // 1. Megkeresi a felhasználót az adatbázisban email alapján
        const user = await prisma.felhasznalok.findFirst({
            where: { email: { equals: email.trim(), mode: 'insensitive' } }
        });

        // Google-lal regisztrált fióknak nincs jelszava – az üzenet erre is utal, de nem árulja el, létezik-e a fiók
        // 2. Összehasonlítja a beírt jelszót az adatbázisban lévő hash-sel
        const jelszoHelyes = await bcrypt.compare(password, user?.password_hash ?? ALHASH);

        if (!user || !user.password_hash || !jelszoHelyes) {
            probaRogzitese(fiokKulcs, ABLAK_MS);
            probaRogzitese(ipKulcs, ABLAK_MS);
            return json({ error: HIBAS_BELEPES }, { status: 401 });
        }
        korlatTorlese(fiokKulcs);

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

        // A régebbi, gyengébb költségű hash-t sikeres belépéskor frissítjük (ilyenkor ismerjük a jelszót).
        // Ha ez nem sikerül, a belépés akkor is érvényes, a következő alkalommal újra megpróbáljuk.
        if (bcrypt.getRounds(user.password_hash) < BCRYPT_KOLTSEG) {
            try {
                await prisma.felhasznalok.update({
                    where: { id: user.id },
                    data: { password_hash: await bcrypt.hash(password, BCRYPT_KOLTSEG) }
                });
            } catch (frissitesiHiba) {
                console.error('Nem sikerült frissíteni a jelszó-hash-t:', frissitesiHiba);
            }
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