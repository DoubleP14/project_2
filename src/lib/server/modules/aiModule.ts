// src/lib/server/modules/aiModule.ts
import type { Services } from '../index';
import { decrypt } from '../crypto'; 

export function createAiModule(services: Services) {
    return {
        ujHirekFeldolgozasa: async (userId: number = 1) => {
            
            // --- 1. KULCS VISSZAFEJTÉSE AZ ADOTT USERHEZ ---
            let aktivUser = await services.db.felhasznalok.findUnique({ where: { id: userId } });
            
            if (!aktivUser || !aktivUser.api_key) {
                console.log(`A(z) ${userId}. felhasználónak nincs API kulcsa. Visszaállás az Admin (1) kulcsára...`);
                aktivUser = await services.db.felhasznalok.findUnique({ where: { id: 1 } });
            }

            if (!aktivUser || !aktivUser.api_key) {
                console.log("Nincs API kulcs beállítva. AI elemzés leáll.");
                return;
            }

            const apiKey = decrypt(aktivUser.api_key);
            const provider = aktivUser.ai_provider || 'GOOGLE';
            const valasztottModell = provider === 'GOOGLE' ? 'gemini-2.0-flash' : 'llama-3.1-8b-instant';

            // --- 2. ÚJ HÍREK LEKÉRÉSE ---
            const hirek = await services.hirRepo.getFeldolgozatlanHirek(3);
            
            if (hirek.length === 0) return;
            console.log(`\n${hirek.length} db friss hír AI elemzése és klaszterezése indul...`);

            // --- 3. REFERENCIA HÍREK LEKÉRÉSE ---
            const tegnap = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const frissKeszHirek = await services.db.hirek.findMany({
                where: { cluster_id: { not: null }, datum: { gte: tegnap }, archivalt: false }
            });

            // --- FELHASZNÁLÓI KULCSSZAVAK LEKÉRÉSE A RIASZTÁSHOZ ---
            const userKulcsszavak = await services.db.felhasznaloKulcsszavak.findMany({
                where: { felhasznalo_id: aktivUser.id }
            });

            // --- 4. FELDOLGOZÁS ---
            for (const hir of hirek) {  
                try {
                    console.log(`- Elemzés alatt: ${hir.cim}`);
                    const szoveg = hir.tartalom || hir.cim;
                    
                    // A) AI Elemzés és B) Klaszterezés
                    const aiEredmeny = await services.ai.hirElemzese(szoveg, valasztottModell, apiKey);
                    const clusterId = await services.ai.hírKlaszterezes(hir, frissKeszHirek, apiKey, provider);

                    // C) Elemzés mentése és D) Klaszter összekötés
                    await services.hirRepo.saveAiElemzes(
                        hir.id, 
                        aiEredmeny.osszefoglalo || "Nem sikerült összefoglalni.", 
                        aiEredmeny.hangulat || "SEMLEGES",
                        valasztottModell 
                    );

                    await services.db.hirek.update({
                        where: { id: hir.id },
                        data: { cluster_id: clusterId }
                    });

                    frissKeszHirek.push({ ...hir, cluster_id: clusterId } as any);

                    // --- E) PROFI ÉRTESÍTÉSI LOGIKA (Bombahír, Kulcsszó, Gap Analízis) ---
                    let riasztasOka = "";
                    let ertesitesCimPrefix = "";

                    // 1. Szabály: BOMBAHÍR (Ugyanabban a klaszterben van már legalább 3 cikk)
                    const klaszterCikkek = frissKeszHirek.filter(h => h.cluster_id === clusterId);
                    if (klaszterCikkek.length >= 3) {
                        riasztasOka = "Bombahír (Több forrás lehozta)";
                        ertesitesCimPrefix = "🔥 BOMBAHÍR:";
                    }

                    // 2. Szabály: KULCSSZÓ TALÁLAT
                    if (!riasztasOka) {
                        const textToSearch = (hir.cim + " " + (aiEredmeny.osszefoglalo || "")).toLowerCase();
                        for (const k of userKulcsszavak) {
                            if (textToSearch.includes(k.kulcsszo.toLowerCase())) {
                                riasztasOka = `Kulcsszó találat (${k.kulcsszo})`;
                                ertesitesCimPrefix = "🎯 RELEVÁNS TÉMA:";
                                break;
                            }
                        }
                    }

                    // 3. Szabály: GAP ANALÍZIS (A konkurencia lehozta)
                    if (!riasztasOka && hir.forras_id) {
                        const aktualisForras = await services.db.hirForrasok.findUnique({ where: { id: hir.forras_id } });
                        
                        if (aktualisForras && !aktualisForras.is_own_source) {
                            const vanSajat = await services.db.hirek.findFirst({
                                where: { cluster_id: clusterId, forras: { is_own_source: true } }
                            });
                            if (!vanSajat) {
                                riasztasOka = "Hiányzó hír (Gap Analízis)";
                                ertesitesCimPrefix = "🚨 KONKURENCIA ÍRT RÓLA:";
                            }
                        }
                    }

                    // --- SPAM SZŰRŐ (Deduplikáció) ---
                    let marKuldtunk = false;
                    if (riasztasOka !== "") {
                        // Kigyűjti az összes hír ID-t, ami ebbe a klaszterbe tartozik
                        const klaszterHirIdk = klaszterCikkek.map(h => h.id);
                        
                        // Megnézi, van-e a naplóban sikeres küldés ezen hír ID-k valamelyikére
                        const korabbiErtesites = await services.db.ertesitesek.findFirst({
                            where: {
                                felhasznalo_id: aktivUser.id,
                                hir_id: { in: klaszterHirIdk },
                                sikeres: true
                            }
                        });

                        if (korabbiErtesites) {
                            marKuldtunk = true;
                            console.log(`[Spam Szűrő] Ehhez a témához (Klaszter: ${clusterId}) már küldtünk Discord üzenetet. Riasztás blokkolva.`);
                        }
                    }

                    // Ha a szabályok alapján riasztani kell és még nem küldött róla üzenetet:
                    if (riasztasOka !== "" && !marKuldtunk) {
                        console.log(`[Riasztás] Ok: ${riasztasOka} -> Küldés a Discordra...`);
                        
                        await services.notify.ertesitesKuldese(aktivUser.id, hir.id, {
                            cim: `${ertesitesCimPrefix} ${hir.cim}`,
                            osszefoglalo: aiEredmeny.osszefoglalo,
                            hangulat: aiEredmeny.hangulat,
                            url: hir.url
                        });
                    }
                    
                } catch (error) {
                    console.error(`Hiba a '${hir.cim}' hír elemzésekor:`, error);
                }
            }
            console.log("AI elemzési és klaszterezési ciklus befejeződött!\n");
        }
    };
}