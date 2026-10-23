// src/lib/server/googleAuth.ts
// Google bejelentkezés – OAuth 2.0 Authorization Code folyamat PKCE-vel, külső könyvtár nélkül.
// Lépések: 1) átirányítás a Google-höz (state + PKCE), 2) visszatérés kóddal, 3) kód cseréje tokenre,
// 4) az ID token adataiból (sub, email, név) a felhasználó azonosítása.
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const googleBeallitva = () => !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;

export const visszateresiUrl = (origin: string) => `${origin}/auth/google/callback`;

const base64url = (buf: Buffer) => buf.toString('base64url');

// 1. lépés: a Google bejelentkezési oldal URL-je + a később ellenőrzendő titkok
export function googleAtiranyitas(origin: string) {
    const state = base64url(crypto.randomBytes(32));          // CSRF védelem a visszatéréskor
    const codeVerifier = base64url(crypto.randomBytes(32));   // PKCE: a kódcseréhez kell majd
    const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());

    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID as string,
        redirect_uri: visszateresiUrl(origin),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account'
    });

    return { url: `${AUTH_URL}?${params}`, state, codeVerifier };
}

export type GoogleProfil = { sub: string; email: string; emailVerified: boolean; nev: string | null };

// 3-4. lépés: a kód cseréje tokenre, majd az ID token adatainak kiolvasása és ellenőrzése
export async function googleProfilLekerese(code: string, codeVerifier: string, origin: string): Promise<GoogleProfil> {
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID as string,
            client_secret: env.GOOGLE_CLIENT_SECRET as string,
            redirect_uri: visszateresiUrl(origin),
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
        })
    });

    if (!response.ok) {
        throw new Error(`Google token csere sikertelen (${response.status}): ${await response.text()}`);
    }

    const { id_token: idToken } = await response.json();
    if (!idToken) throw new Error('A Google válasza nem tartalmazott ID tokent.');

    // Az ID tokent közvetlenül a Google token végpontjától, TLS-en, a kliens titokkal hitelesítve kaptuk,
    // így a Google dokumentációja szerint az aláírás külön ellenőrzése nélkül is megbízható.
    // A tartalmi mezőket (kibocsátó, címzett, lejárat) ettől függetlenül ellenőrizzük.
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));

    if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) {
        throw new Error('Érvénytelen ID token kibocsátó.');
    }
    if (payload.aud !== env.GOOGLE_CLIENT_ID) throw new Error('Az ID token nem ennek az alkalmazásnak szól.');
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) throw new Error('Az ID token lejárt.');
    if (!payload.sub || !payload.email) throw new Error('Az ID token nem tartalmaz azonosítót vagy e-mail címet.');

    return {
        sub: String(payload.sub),
        email: String(payload.email).toLowerCase(),
        emailVerified: payload.email_verified === true || payload.email_verified === 'true',
        nev: payload.name ? String(payload.name) : null
    };
}
