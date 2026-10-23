// src/routes/auth/google/callback/+server.ts
// 2-4. lépés: visszatérés a Google-től, felhasználó azonosítása / létrehozása, munkamenet indítása
import { redirect, isRedirect } from '@sveltejs/kit';
import { services } from '$lib/server';
import { googleProfilLekerese } from '$lib/server/googleAuth';
import { munkamenetInditasa } from '$lib/server/session';
import { logger } from '$lib/server/services/loggerService';

// Egyedi felhasználónév a Google névből vagy az e-mail címből (pl. "Kovács Anna" -> "kovacsanna", ütközésnél "kovacsanna2")
async function egyediFelhasznalonev(nev: string | null, email: string) {
    const alap = (nev || email.split('@')[0])
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // ékezetek eltávolítása
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 20) || 'felhasznalo';

    let jelolt = alap;
    for (let i = 2; await services.db.felhasznalok.findUnique({ where: { username: jelolt } }); i++) {
        jelolt = `${alap}${i}`;
    }
    return jelolt;
}

export const GET = async ({ url, cookies }) => {
    const mentettState = cookies.get('google_oauth_state');
    const codeVerifier = cookies.get('google_oauth_verifier');
    cookies.delete('google_oauth_state', { path: '/auth/google' });
    cookies.delete('google_oauth_verifier', { path: '/auth/google' });

    // A felhasználó a Google oldalán megszakította a bejelentkezést
    if (url.searchParams.get('error')) throw redirect(303, '/login?error=google_megszakitva');

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // CSRF védelem: a visszakapott state-nek egyeznie kell az általunk kiadottal
    if (!code || !state || !mentettState || !codeVerifier || state !== mentettState) {
        throw redirect(303, '/login?error=google');
    }

    try {
        const profil = await googleProfilLekerese(code, codeVerifier, url.origin);
        if (!profil.emailVerified) throw redirect(303, '/login?error=google_email');

        const prisma = services.db;

        // 1. Már összekapcsolt Google fiók, 2. azonos e-mail címmel regisztrált fiók, 3. új fiók
        let user = await prisma.felhasznalok.findUnique({ where: { google_id: profil.sub } });

        if (!user) {
            const emailesFiok = await prisma.felhasznalok.findFirst({
                where: { email: { equals: profil.email, mode: 'insensitive' } }
            });

            if (emailesFiok) {
                // A Google igazolta az e-mail cím birtoklását, így a meglévő fiók biztonságosan összekapcsolható
                user = await prisma.felhasznalok.update({
                    where: { id: emailesFiok.id },
                    data: { google_id: profil.sub, email_verified: true, verification_token: null }
                });
                await logger.info('GOOGLE_LINK', 'Google fiók összekapcsolva a meglévő fiókkal', user.id);
            } else {
                user = await prisma.felhasznalok.create({
                    data: {
                        username: await egyediFelhasznalonev(profil.nev, profil.email),
                        email: profil.email,
                        google_id: profil.sub,
                        password_hash: null,        // csak Google bejelentkezés (jelszó később az "Elfelejtett jelszó"-val adható)
                        email_verified: true        // a Google már igazolta
                    }
                });
                await logger.info('REGISTER_GOOGLE', 'Új fiók regisztrálva Google-lel', user.id);
            }
        }

        if (!user.aktiv) throw redirect(303, '/login?error=letiltva');

        munkamenetInditasa(cookies, user);
        await logger.info('LOGIN', 'Sikeres bejelentkezés Google-lel', user.id);
    } catch (error) {
        if (isRedirect(error)) throw error;
        console.error('Hiba a Google bejelentkezés során:', error);
        throw redirect(303, '/login?error=google');
    }

    throw redirect(303, '/dashboard');
};
