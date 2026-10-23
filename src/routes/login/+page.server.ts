// src/routes/login/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { googleBeallitva } from '$lib/server/googleAuth';

export const load: PageServerLoad = async ({ locals }) => {
    // Ha a locals.user létezik, akkor a felhasználó be van jelentkezve
    if (locals.user) {
        throw redirect(302, '/dashboard'); 
    }
    
    return { googleBeallitva: googleBeallitva() };
};