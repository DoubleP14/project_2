// src/routes/auth/google/+server.ts
// 1. lépés: átirányítás a Google bejelentkezési oldalára
import { redirect } from '@sveltejs/kit';
import { googleAtiranyitas, googleBeallitva } from '$lib/server/googleAuth';

const IDEIGLENES_SUTI = {
    path: '/auth/google',
    httpOnly: true,
    sameSite: 'lax' as const, // a Google-ről visszatérve el kell küldeni
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10 // 10 perc a bejelentkezés befejezésére
};

export const GET = async ({ url, cookies, locals }) => {
    if (locals.user) throw redirect(302, '/dashboard');
    if (!googleBeallitva()) throw redirect(303, '/login?error=google_nincs_beallitva');

    const { url: googleUrl, state, codeVerifier } = googleAtiranyitas(url.origin);

    // A state és a PKCE verifier a visszatéréskor kerül ellenőrzésre
    cookies.set('google_oauth_state', state, IDEIGLENES_SUTI);
    cookies.set('google_oauth_verifier', codeVerifier, IDEIGLENES_SUTI);

    throw redirect(302, googleUrl);
};
