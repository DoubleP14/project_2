// src/routes/api/logout/+server.ts
import { json } from '@sveltejs/kit';

export const POST = async ({ cookies, locals }) => {
    try {
        // 1. Törli a sütit! A path nagyon fontos, ugyanannak kell lennie, mint a létrehozásnál.
        cookies.delete('session_token', { path: '/' });
        
        // 2. Tisztítja a memóriát is
        (locals as any).user = undefined;

        // 3. Visszaszól a Frontendnek, hogy sikerült
        return json({ message: 'Sikeres kijelentkezés!' }, { status: 200 });
    } catch (error) {
        console.error('Hiba a kijelentkezés során:', error);
        return json({ error: 'Belső szerverhiba történt.' }, { status: 500 });
    }
};