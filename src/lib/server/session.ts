// src/lib/server/session.ts
// Közös munkamenet-indítás: a jelszavas és a Google bejelentkezés is ezt használja.
import jwt from 'jsonwebtoken';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const MUNKAMENET_HOSSZ_MP = 60 * 60 * 24; // 1 nap

export function munkamenetInditasa(
    cookies: Cookies,
    user: { id: number; role: string | null; token_verzio: number }
) {
    // tv = token verzió: ha az adatbázisban megnő, ez a token azonnal érvénytelenné válik
    const token = jwt.sign(
        { userId: user.id, role: user.role, tv: user.token_verzio },
        env.JWT_SECRET as string,
        { expiresIn: MUNKAMENET_HOSSZ_MP }
    );

    cookies.set('session_token', token, {
        path: '/',
        httpOnly: true,
        // "lax": külső oldalról (Stripe fizetés, Google bejelentkezés) visszatérve is megmarad a munkamenet.
        // A "strict" ilyenkor nem küldené el a sütit, és a felhasználó kijelentkezettnek tűnne.
        // A CSRF védelmet a SvelteKit eredet-ellenőrzése adja, a "lax" süti pedig idegen oldali POST-tal nem utazik.
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: MUNKAMENET_HOSSZ_MP
    });
}
