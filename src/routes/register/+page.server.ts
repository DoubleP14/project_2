// src/routes/register/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // Nem engedi regisztrálni azt, aki már be van lépve
    if (locals.user) {
        throw redirect(302, '/hirek'); 
    }
    
    return {};
};