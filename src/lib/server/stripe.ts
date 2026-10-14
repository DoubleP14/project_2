// src/lib/server/stripe.ts
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

// Közös, lustán (első használatkor) létrehozott Stripe kliens.
// A kulcsot futásidőben olvassuk a környezetből, így az nem égetődik bele a buildbe.
let stripeKliens: Stripe | null = null;

export function getStripe(): Stripe {
    if (!env.STRIPE_SECRET_KEY) {
        throw new Error('A STRIPE_SECRET_KEY nincs beállítva.');
    }
    if (!stripeKliens) {
        stripeKliens = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-05-27.dahlia' as any
        });
    }
    return stripeKliens;
}
