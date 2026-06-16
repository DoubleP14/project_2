// src/routes/checkout/+page.server.ts
import { services } from '$lib/server';
import { redirect, isRedirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import Stripe from 'stripe';

import { STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia' as any
});

export const load: PageServerLoad = async ({ url, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const tier = url.searchParams.get('tier') || 'pro';
    if (tier !== 'pro' && tier !== 'enterprise') {
        throw redirect(303, '/settings');
    }

    const prisma = services.db;
    const teljesFelhasznalo = await prisma.felhasznalok.findUnique({
        where: { id: user.id }
    });

    const packageDetails = {
        tier: tier,
        name: tier === 'pro' ? 'Pro Analyst Csomag' : 'Enterprise Csomag',
        price: tier === 'pro' ? 2990 : 9990, 
        email: teljesFelhasznalo?.email || ''
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
        if (tier !== 'pro' && tier !== 'enterprise') {
            tier = 'pro';
        }

        const price = tier === 'pro' ? 2990 : 9990;
        const name = tier === 'pro' ? 'Pro Analyst Csomag' : 'Enterprise Csomag';

        const prisma = services.db;
        const teljesFelhasznalo = await prisma.felhasznalok.findUnique({
            where: { id: user.id }
        });

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                customer_email: teljesFelhasznalo?.email || undefined,
                line_items: [
                    {
                        price_data: {
                            currency: 'huf',
                            product_data: {
                                name: name,
                                description: 'Hírfigyelő AI - Premium hozzáférés'
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