// src/routes/api/stripe/webhook/+server.ts
import { services } from '$lib/server';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { getStripe } from '$lib/server/stripe';
import { logger } from '$lib/server/services/loggerService';
import { szamlaService } from '$lib/server/services/szamlaService';
import { FIZETOS_CSOMAGOK, fizetosCsomagE, ujLejaratSzamitasa } from '$lib/csomagok';

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

        if (userId && fizetosCsomagE(tier)) {
            console.log(`✅ Sikeres fizetés érzékelve! Felhasználó ID: ${userId}, Új csomag: ${tier}`);

            try {
                const user = await services.db.felhasznalok.findUnique({ where: { id: userId } });
                if (!user) return new Response(JSON.stringify({ received: true }), { status: 200 });

                // IDEMPOTENCIA: a Stripe ugyanazt az eseményt többször is kézbesítheti – egy fizetést csak egyszer írunk jóvá
                if (user.utolso_fizetes_session === session.id) {
                    console.log(`ℹ️ A(z) ${session.id} fizetés már feldolgozva, ismételt kézbesítés kihagyva.`);
                    return new Response(JSON.stringify({ received: true }), { status: 200 });
                }

                // 1. Előre fizetett időszak: +30 nap (aktív csomag mellett a hátralévő napok jóváírásával)
                const { lejarat, jovairtNap } = ujLejaratSzamitasa(user.subscription_tier, user.elofizetes_lejarat, tier);
                await services.db.felhasznalok.update({
                    where: { id: userId },
                    data: { subscription_tier: tier, elofizetes_lejarat: lejarat, utolso_fizetes_session: session.id }
                });

                // Sikeres csomagváltás naplózása
                await logger.info(
                    'PAYMENT_SUCCESS',
                    `Előfizetés: ${tier.toUpperCase()}, lejárat: ${lejarat.toISOString().slice(0, 10)}` + (jovairtNap > 0 ? ` (${jovairtNap} nap jóváírva)` : ''),
                    userId
                );

                // 2. ─── AUTOMATIKUS SZÁMLÁZÁS INDÍTÁSA ───
                {
                    const bruttoAr = FIZETOS_CSOMAGOK[tier].ar;
                    const megnevezes = FIZETOS_CSOMAGOK[tier].nev;

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