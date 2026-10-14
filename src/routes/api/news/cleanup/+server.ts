import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { jobs } from '$lib/server/jobs';

// Külső ütemezőből (pl. hosting cron) hívható takarító végpont
export async function GET({ request }) {
    // 1. Biztonsági ellenőrzés
    const authHeader = request.headers.get('authorization');
    // Ha nincs beállítva CRON_SECRET, a végpont le van tiltva (különben 'Bearer undefined' is átmenne)
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
    }

    try {
        // 2. Végleges törlés (Hard Delete) - ugyanaz a logika, mint az éjszakai cronban
        const torolt = await jobs.regiHirekTorlese('CRON');

        return json({
            success: true,
            message: `Sikeres takarítás: ${torolt} db régi hír véglegesen törölve.`
        });

    } catch (error) {
        console.error('Hiba a hard delete során:', error);
        return json({ error: 'Belső szerverhiba a törlés során' }, { status: 500 });
    }
}
