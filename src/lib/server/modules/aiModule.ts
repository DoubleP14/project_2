// src/lib/server/modules/aiModule.ts
import type { Services } from '../index';
import { decrypt } from '../crypto'; 

export function createAiModule(services: Services) {
    return {
        // Fogadja a userId-t (alapértelmezetten 1, ha a Cron hívja)
        ujHirekFeldolgozasa: async (userId: number = 1) => {
            
            // --- 1. KULCS VISSZAFEJTÉSE AZ ADOTT USERHEZ ---
            let aktivUser = await services.db.felhasznalok.findUnique({ where: { id: userId } });
            
            // Ha a gombnyomónak nincs kulcsa, használja a "Közös/Admin" kulcsot (1)
            if (!aktivUser || !aktivUser.api_key) {
                console.log(`A(z) ${userId}. felhasználónak nincs API kulcsa. Visszaállás az Admin (1) kulcsára...`);
                aktivUser = await services.db.felhasznalok.findUnique({ where: { id: 1 } });
            }

            if (!aktivUser || !aktivUser.api_key) {
                console.log("Nincs API kulcs beállítva az Adminnál sem. AI elemzés leáll.");
                return;
            }

            const apiKey = decrypt(aktivUser.api_key);
            const provider = aktivUser.ai_provider || 'GOOGLE';
            
            const valasztottModell = provider === 'GOOGLE' ? 'gemini-2.0-flash' : 'llama-3.1-8b-instant';

            console.log(`AI Provider: ${provider} (Modell: ${valasztottModell}, User ID: ${aktivUser.id})`);

            // --- 2. ÚJ HÍREK LEKÉRÉSE ---
            const hirek = await services.hirRepo.getFeldolgozatlanHirek(3);
            
            if (hirek.length === 0) {
                console.log("Nincs új feldolgozandó hír az AI számára.");
                return;
            }

            console.log(`\n${hirek.length} db friss hír AI elemzése és klaszterezése indul...`);

            // --- 3. REFERENCIA HÍREK LEKÉRÉSE A RADARHOZ ---
            const tegnap = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const frissKeszHirek = await services.db.hirek.findMany({
                where: { 
                    cluster_id: { not: null },
                    datum: { gte: tegnap }
                }
            });

            // --- 4. FELDOLGOZÁS ---
            for (const hir of hirek) {  
                try {
                    console.log(`- Elemzés alatt: ${hir.cim}`);
                    const szoveg = hir.tartalom || hir.cim;
                    
                    // A) AI Elemzés
                    const aiEredmeny = await services.ai.hirElemzese(szoveg, valasztottModell, apiKey);

                    // B) Szemantikai Klaszterezés 
                    const clusterId = await services.ai.hírKlaszterezes(hir, frissKeszHirek, apiKey, provider);

                    // C) Elemzés mentése
                    await services.hirRepo.saveAiElemzes(
                        hir.id, 
                        aiEredmeny.osszefoglalo || "Nem sikerült összefoglalni.", 
                        aiEredmeny.hangulat || "SEMLEGES",
                        valasztottModell 
                    );

                    // D) A hír összekötése a klaszterrel
                    await services.db.hirek.update({
                        where: { id: hir.id },
                        data: { cluster_id: clusterId }
                    });

                    console.log(`Összekötve ezzel a klaszterrel: ${clusterId}`);

                    frissKeszHirek.push({ ...hir, cluster_id: clusterId } as any);
                    
                } catch (error) {
                    console.error(`Hiba a '${hir.cim}' hír elemzésekor:`, error);
                }
            }
            console.log("AI elemzési és klaszterezési ciklus befejeződött!\n");
        }
    };
}