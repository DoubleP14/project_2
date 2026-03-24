// src/lib/server/modules/aiModule.ts
import type { Services } from '../index';

export function createAiModule(services: Services) {
    return {
        ujHirekFeldolgozasa: async () => {
            // 1. Lekéri a még nem elemzett híreket (max 3 darabot egyszerre)
            const hirek = await services.hirRepo.getFeldolgozatlanHirek(3);
            
            if (hirek.length === 0) {
                console.log("Nincs új feldolgozandó hír az AI számára.");
                return;
            }

            console.log(`${hirek.length} db friss hír AI elemzése indul...`);

            // Később az adatbázisból/felhasználótól kell lekérni!
            const valasztottModell = "llama-3.1-8b-instant";

            for (const hir of hirek) {  
                try {
                    console.log(`- Elemzés alatt: ${hir.cim}`);
                    const szoveg = hir.tartalom || hir.cim;
                    
                    // 2. AI-nak küldés a választott modellel
                    const aiEredmeny = await services.ai.hirElemzese(szoveg, valasztottModell);

                    // 3. Eredmény mentése
                    await services.hirRepo.saveAiElemzes(
                        hir.id, 
                        aiEredmeny.osszefoglalo || "Nem sikerült összefoglalni.", 
                        aiEredmeny.hangulat || "SEMLEGES",
                        valasztottModell // Modell nevét menti el
                    );
                    
                } catch (error) {
                    console.error(`Hiba a '${hir.cim}' hír elemzésekor:`, error);
                }
            }
            console.log("AI elemzési ciklus sikeresen befejeződött!");
        }
    };
}