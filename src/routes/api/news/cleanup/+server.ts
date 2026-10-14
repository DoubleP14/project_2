import { json } from '@sveltejs/kit';
import { CRON_SECRET } from '$env/static/private';
import { PrismaClient } from '@prisma/client';

// Helyben létrehozzuk a kapcsolatot
const prisma = new PrismaClient();

export async function GET({ request }) {
    // 1. Biztonsági ellenőrzés
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
    }

    try {
        // 2. Dátum kiszámítása (7 nappal ezelőtt)
        const hetNappalEzelott = new Date();
        hetNappalEzelott.setDate(hetNappalEzelott.getDate() - 7);

        // 3. Végleges törlés (Hard Delete)
        const torlesEredmeny = await prisma.hirek.deleteMany({
            where: {
                datum: { 
                    lt: hetNappalEzelott 
                }
            }
        });

        return json({
            success: true,
            message: `Sikeres takarítás: ${torlesEredmeny.count} db régi hír véglegesen törölve.`
        });

    } catch (error) {
        console.error('Hiba a hard delete során:', error);
        return json({ error: 'Belső szerverhiba a törlés során' }, { status: 500 });
    }
}