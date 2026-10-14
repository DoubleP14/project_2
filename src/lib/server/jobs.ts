// src/lib/server/jobs.ts
// Rendszerszintű háttérfeladatok: ezeket hívja a cron ÉS az Admin felület is,
// így a két belépési pont pontosan ugyanazt a logikát futtatja.
import { modules, services } from './index';

// Globális lakat: egyszerre csak egy teljes frissítés futhat (cron vagy admin indítás)
let frissitesFolyamatban = false;

export const jobs = {
    isFrissitesFolyamatban: () => frissitesFolyamatban,

    // HÍRGYŰJTÉS + AI ELEMZÉS minden aktív felhasználónak
    teljesFrissites: async (inditoja: 'CRON' | 'ADMIN') => {
        if (frissitesFolyamatban) {
            console.log(`[${inditoja}] A teljes frissítés már folyamatban van, kihagyva.`);
            return false;
        }
        frissitesFolyamatban = true;

        console.log(`\n[${inditoja}] Hírek automatikus letöltése ÉS AI elemzése indul...`);
        await services.db.rendszerNaplo.create({
            data: { esemeny_tipus: 'CRON_START', leiras: `Hírgyűjtő és AI elemző elindult (indította: ${inditoja}).` }
        });

        try {
            const users = await services.db.felhasznalok.findMany({ where: { aktiv: true } });

            for (const user of users) {
                console.log(`\n[${inditoja}] Feldolgozás a(z) ${user.id}. felhasználónak...`);
                await modules.hirGyujto.osszesForrasFrissitese(user.id);
                await modules.aiElemzo.ujHirekFeldolgozasa(user.id);
            }

            await services.db.rendszerNaplo.create({
                data: { esemeny_tipus: 'CRON_SUCCESS', leiras: `Sikeres lefutás (${inditoja}). ${users.length} aktív felhasználó hírei feldolgozva.` }
            });
            console.log(`\n[${inditoja}] Frissítés és AI klaszterezés befejeződött!\n`);
            return true;

        } catch (error) {
            console.error(`[${inditoja}] Kritikus hiba történt:`, error);
            await services.db.rendszerNaplo.create({
                data: { esemeny_tipus: 'CRON_ERROR', leiras: `Kritikus hiba a frissítéskor (${inditoja}): ${error instanceof Error ? error.message : 'Ismeretlen'}` }
            });
            return false;
        } finally {
            frissitesFolyamatban = false;
        }
    },

    // VÉGLEGES TÖRLÉS: a 7 napnál régebbi hírek fizikai törlése (Hard Delete)
    regiHirekTorlese: async (inditoja: 'CRON' | 'ADMIN', napokKuszobe: number = 7) => {
        const torolt = await services.archive.regiHirekArchivalasa(napokKuszobe);

        await services.db.rendszerNaplo.create({
            data: {
                esemeny_tipus: 'SYSTEM_CLEANUP',
                leiras: `Takarítás lefutott (${inditoja}). ${torolt} db ${napokKuszobe} napnál régebbi hír VÉGLEGESEN törölve.`
            }
        });
        return torolt;
    }
};
