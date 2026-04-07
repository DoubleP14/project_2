// src/hooks.server.ts
import cron from 'node-cron';
import { services } from '$lib/server';
import { createHirGyujtoModule } from '$lib/server/modules/hirGyujtoModule';

const hirGyujto = createHirGyujtoModule(services);

// VÉDELEM: Megnézi, hogy a memóriában fut-e már a robotpilóta.
// Ez azért kell, hogy az 'npm run dev' mentéseinél ne induljon el többször!
if (!(globalThis as any).__robotPilotaInditva) {

    // Ez a '0 * * * *' azt jelenti, hogy minden órában lefut.
    cron.schedule('0 * * * *', async () => {
        console.log('\n[CRON] Robotpilóta ébred: Hírek automatikus letöltése indul...');
        
        try {
            await hirGyujto.osszesForrasFrissitese();
            console.log('[CRON] Automatikus frissítés befejeződött!\n');
        } catch (error) {
            console.error('[CRON] Hiba történt:', error);
        }
    });

    // Feljegyzi memóriába, hogy elindítottuk
    (globalThis as any).__robotPilotaInditva = true;
    console.log('Robotpilóta (Cron) SIKERESEN élesítve. Percenként frissít.');
}