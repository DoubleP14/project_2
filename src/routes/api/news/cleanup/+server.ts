import { json } from '@sveltejs/kit';
import { CRON_SECRET } from '$env/static/private';
import { jobs } from '$lib/server/jobs';

// Külső ütemezőből (pl. hosting cron) hívható takarító végpont
export async function GET({ request }) {
    // 1. Biztonsági ellenőrzés
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
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
