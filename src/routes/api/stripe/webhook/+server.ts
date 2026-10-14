// src/routes/api/stripe/webhook/+server.ts
import { services } from '$lib/server';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { getStripe } from '$lib/server/stripe';
import { logger } from '$lib/server/services/loggerService';
import { szamlaService } from '$lib/server/services/szamlaService';

export const POST: RequestHandler = async ({ request }) => {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    let event;

    try {
        event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET ?? '');
    } catch (err: any) {
        console.error(`⚠️ Webhook aláírás hiba: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = Number(session.metadata?.userId);
        const tier = session.metadata?.tier;

        if (userId && tier) {
            console.log(`✅ Sikeres fizetés érzékelve! Felhasználó ID: ${userId}, Új csomag: ${tier}`);
            
            try {
                // 1. Felhasználó szintjének frissítése a DB-ben
                await services.db.felhasznalok.update({
                    where: { id: userId },
                    data: { subscription_tier: tier }
                });
                console.log(`✅ Adatbázis frissítve.`);

                // Sikeres csomagváltás naplózása
                await logger.info('PAYMENT_SUCCESS', `Előfizetés sikeresen frissítve erre: ${tier.toUpperCase()}`, userId);

                // 2. ─── AUTOMATIKUS SZÁMLÁZÁS INDÍTÁSA ───
                // Lekéri a felhasználó emailjét és felhasználónevét a számlához
                const user = await services.db.felhasznalok.findUnique({
                    where: { id: userId }
                });

                if (user) {
                    const bruttoAr = tier === 'pro' ? 2990 : 9990;
                    const megnevezes = tier === 'pro' ? 'Pro Analyst Csomag' : 'Enterprise Csomag';

                    try {
                        // Meghívja a számlázó szolgáltatást
                        await szamlaService.szamlaGeneralas(user.email, user.username, megnevezes, bruttoAr);
                        
                        // Sikeres számlázás naplózása a RendszerNaplo-ba!
                        await logger.info('INVOICE_SENT', `Automatikus e-számla kiállítva és elküldve (${user.email})`, userId);
                    } catch (szamlaError) {
                        console.error('❌ Számlázási hiba a webhook futásakor:', szamlaError);
                        // Ha a Számlázz.hu elszállna, azt is naplózza
                        await logger.info('INVOICE_ERROR', `Sikertelen automatikus számlagenerálás`, userId);
                    }
                }
                // ──────────────────────────────────────────────────

            } catch (dbError) {
                console.error(`❌ Adatbázis mentési hiba a webhookban:`, dbError);
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
};