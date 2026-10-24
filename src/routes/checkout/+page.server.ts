// src/routes/checkout/+page.server.ts
import { services } from '$lib/server';
import { redirect, isRedirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getStripe } from '$lib/server/stripe';
import { FIZETOS_CSOMAGOK, fizetosCsomagE, ujLejaratSzamitasa, ELOFIZETESI_IDOSZAK_NAP } from '$lib/csomagok';

export const load: PageServerLoad = async ({ url, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const tier = url.searchParams.get('tier') || 'pro';
    if (!fizetosCsomagE(tier)) {
        throw redirect(303, '/settings');
    }

    const prisma = services.db;
    const teljesFelhasznalo = await prisma.felhasznalok.findUnique({
        where: { id: user.id }
    });

    // Előnézet: meddig lesz érvényes a csomag a fizetés után (ugyanaz a számítás, mint a webhookban)
    const { lejarat, jovairtNap } = ujLejaratSzamitasa(teljesFelhasznalo?.subscription_tier, teljesFelhasznalo?.elofizetes_lejarat, tier);

    const packageDetails = {
        tier: tier,
        name: FIZETOS_CSOMAGOK[tier].nev,
        price: FIZETOS_CSOMAGOK[tier].ar,
        email: teljesFelhasznalo?.email || '',
        idoszakNap: ELOFIZETESI_IDOSZAK_NAP,
        jelenlegiTier: teljesFelhasznalo?.subscription_tier ?? null,
        jelenlegiLejarat: teljesFelhasznalo?.elofizetes_lejarat ?? null,
        ujLejarat: lejarat,
        jovairtNap
    };

    return { packageDetails };
};

export const actions: Actions = {
    // request PARAMÉTER A FORM OLVASÁSÁHOZ
    processPayment: async ({ request, url, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        // 1. KIOLVASSA A CSOMAGOT A FORM-BÓL (Ha nincs, csak akkor nézi az URL-t)
        const formData = await request.formData();
        let tier = formData.get('tier')?.toString() || url.searchParams.get('tier');
        
        // Biztonsági védelem: ha valaki átírná a HTML-t valami másra
        if (!fizetosCsomagE(tier)) {
            tier = 'pro';
        }

        const price = FIZETOS_CSOMAGOK[tier as keyof typeof FIZETOS_CSOMAGOK].ar;
        const name = FIZETOS_CSOMAGOK[tier as keyof typeof FIZETOS_CSOMAGOK].nev;

        const prisma = services.db;
        const teljesFelhasznalo = await prisma.felhasznalok.findUnique({
            where: { id: user.id }
        });

        try {
            const session = await getStripe().checkout.sessions.create({
                payment_method_types: ['card'],
                customer_email: teljesFelhasznalo?.email || undefined,
                line_items: [
                    {
                        price_data: {
                            currency: 'huf',
                            product_data: {
                                name: name,
                                description: 'News Trends – 30 napos előre fizetett hozzáférés (nincs automatikus megújítás)'
                            },
                            unit_amount: price * 100, 
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${url.origin}/settings?success=true`,
                cancel_url: `${url.origin}/checkout?tier=${tier}&canceled=true`,
                metadata: {
                    userId: user.id.toString(),
                    tier: tier 
                }
            });

            if (session.url) {
                throw redirect(303, session.url);
            }
        } catch (error) {
            if (isRedirect(error)) throw error; 
            console.error('🚨 Stripe API hiba:', error);
            throw redirect(303, `/checkout?tier=${tier}&error=stripe`);
        }

        throw redirect(303, '/settings');
    }
};