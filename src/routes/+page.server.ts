import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    // Ha a felhasználó már be van jelentkezve, egyből a szoftverbe (Dashboard) küldjük
    if (locals.user) {
        throw redirect(303, '/dashboard');
    }
    
    // Ha vendég (nincs bejelentkezve), akkor megengedjük, hogy betöltődjön a Landing Page
    return {};
};