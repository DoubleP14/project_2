// src/lib/server/modules/aiModule.ts
import type { Services } from '../index';
import { decrypt } from '../crypto'; 

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Egy futás alatt felhasználónként legfeljebb ennyi hír kerül elemzésre
const ELEMZESI_LIMIT = 10;

export function createAiModule(services: Services) {
    return {
        ujHirekFeldolgozasa: async (userId: number) => {

            // --- 1. KULCS VISSZAFEJTÉSE (Szigorú BYOK: csak a felhasználó saját kulcsa használható) ---
            const user = await services.db.felhasznalok.findUnique({ where: { id: userId } });

            if (!user || !user.api_key) {
                console.log(`A(z) ${userId}. felhasználónak nincs saját AI API kulcsa. AI elemzés kihagyva.`);
                return;
            }

            const apiKey = decrypt(user.api_key);
            if (!apiKey) {
                console.log(`A(z) ${userId}. felhasználó API kulcsa nem fejthető vissza. AI elemzés kihagyva.`);
                return;
            }

            // 4 AI szolgáltató kezelése (Alapértelmezett a GROQ)
            const provider = user.ai_provider || 'GROQ';
            let valasztottModell = 'llama-3.1-8b-instant'; // Alapértelmezett

            if (provider === 'GOOGLE') valasztottModell = 'gemini-2.0-flash';
            else if (provider === 'OPENAI') valasztottModell = 'gpt-4o-mini';
            else if (provider === 'ANTHROPIC') valasztottModell = 'claude-3-haiku-20240307';

            // --- 2. ÚJ HÍREK LEKÉRÉSE ---
            const hirek = await services.hirRepo.getFeldolgozatlanHirek(ELEMZESI_LIMIT, userId);

            if (hirek.length === 0) return;
            console.log(`\n${hirek.length} db friss hír AI elemzése és klaszterezése indul... (Modell: ${valasztottModell})`);

            // --- 3. REFERENCIA HÍREK LEKÉRÉSE ---
            const tegnap = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const frissKeszHirek = await services.db.hirek.findMany({
                where: { 
                    cluster_id: { not: null }, 
                    datum: { gte: tegnap }, 
                    archivalt: false,
                    forras: { felhasznalo_id: userId }
                }
            });

            // --- FELHASZNÁLÓI KULCSSZAVAK LEKÉRÉSE A RIASZTÁSHOZ ---
            const userKulcsszavak = await services.db.felhasznaloKulcsszavak.findMany({
                where: { felhasznalo_id: userId }
            });

            // Gap analízis csak akkor értelmes, ha a felhasználónak van saját forrása
            const vanSajatForras = (await services.db.hirForrasok.count({
                where: { felhasznalo_id: userId, is_own_source: true }
            })) > 0;

            // --- 4. FELDOLGOZÁS ---
            for (const hir of hirek) {  
                try {
                    // --- 1. VÉDELMI VONAL (Race Condition ellen) ---
                    const marFeldolgozva = await services.db.aiElemzesek.findFirst({ where: { hir_id: hir.id } });
                    if (marFeldolgozva) {
                        console.log(`[Duplikáció Védelem] A '${hir.cim}' már kielemezve. Átugrás...`);
                        continue; 
                    }

                    console.log(`- Elemzés alatt: ${hir.cim}`);
                    const szoveg = hir.tartalom || hir.cim;
                    
                    // A) AI Elemzés és B) Klaszterezés (ITT ADTUK ÁT PLUSZBAN A hir.cim-et!)
                    const aiEredmeny = await services.ai.hirElemzese(hir.cim, szoveg, valasztottModell, apiKey);

                    // Sikertelen elemzést NEM mentünk el, így a hír a következő futáskor újra sorra kerül
                    if (aiEredmeny.hiba === 'QUOTA') {
                        console.warn('[AI] Kvóta kimerült, a ciklus leáll. A maradék hírek a következő futáskor kerülnek sorra.');
                        break;
                    }
                    if (aiEredmeny.hiba) {
                        throw new Error('Az AI szolgáltató nem adott értékelhető választ.');
                    }

                    const clusterId = await services.ai.hírKlaszterezes(hir, frissKeszHirek, apiKey, provider);

                    // C) Elemzés mentése és D) Klaszter összekötés (ITT ADJUK ÁT A CLICKBAIT ÉRTÉKET!)
                    await services.hirRepo.saveAiElemzes(
                        hir.id, 
                        aiEredmeny.osszefoglalo || "Nem sikerült összefoglalni.", 
                        aiEredmeny.hangulat || "SEMLEGES",
                        valasztottModell,
                        aiEredmeny.pontszam,
                        aiEredmeny.clickbait,
                        aiEredmeny.kulcsszavak
                    );

                    await services.db.hirek.update({
                        where: { id: hir.id },
                        data: { cluster_id: clusterId }
                    });

                    frissKeszHirek.push({ ...hir, cluster_id: clusterId } as any);

                    // --- E) PROFI ÉRTESÍTÉSI LOGIKA ---
                    let riasztasOka = "";
                    let ertesitesCimPrefix = "";

                    const klaszterCikkek = frissKeszHirek.filter((h: any) => h.cluster_id === clusterId);
                    if (klaszterCikkek.length >= 3) {
                        riasztasOka = "Bombahír (Több forrás lehozta)";
                        ertesitesCimPrefix = "🔥 BOMBAHÍR:";
                    }

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

                    if (!riasztasOka && vanSajatForras && hir.forras_id) {
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

                    // --- 2. VÉDELMI VONAL SPAM SZŰRŐ ---
                    let marKuldtunk = false;
                    if (riasztasOka !== "") {
                        const klaszterHirIdk = klaszterCikkek.map((h: any) => h.id);
                        const korabbiErtesites = await services.db.ertesitesek.findFirst({
                            where: {
                                felhasznalo_id: userId,
                                sikeres: true,
                                OR: [
                                    { hir_id: { in: klaszterHirIdk } }, 
                                    { hir: { cim: hir.cim } }          
                                ]
                            }
                        });

                        if (korabbiErtesites) {
                            marKuldtunk = true;
                            console.log(`[Spam Szűrő] Ehhez a témához (Klaszter: ${clusterId} vagy Cím) már küldtünk értesítést. Blokk.`);
                        }
                    }

                    if (riasztasOka !== "" && !marKuldtunk) {
                        console.log(`[Riasztás] Ok: ${riasztasOka} -> Értesítés küldése a kiválasztott csatornára...`);
                        await services.notify.ertesitesKuldese(userId, hir.id, {
                            cim: `${ertesitesCimPrefix} ${hir.cim}`,
                            osszefoglalo: aiEredmeny.osszefoglalo,
                            hangulat: aiEredmeny.hangulat,
                            url: hir.url,
                            pontszam: aiEredmeny.pontszam 
                        });

                        // Értesítés sikeresen elküldve a felhasználónak
                        await services.db.rendszerNaplo.create({
                            data: { 
                                felhasznalo_id: userId, 
                                esemeny_tipus: 'NOTIFICATION_SENT', 
                                leiras: `Riasztás elküldve (${riasztasOka}): ${hir.cim.substring(0, 50)}...` 
                            }
                        });
                    }
                    
                } catch (error) {
                    console.error(`Hiba a '${hir.cim}' hír elemzésekor:`, error);
                    
                    // AI Elemzési hiba
                    await services.db.rendszerNaplo.create({
                        data: { 
                            felhasznalo_id: userId, 
                            esemeny_tipus: 'AI_ERROR', 
                            leiras: `Hiba a hír AI elemzésekor: ${hir.cim.substring(0, 50)}...` 
                        }
                    });
                }
                
                // 4 másodperc szünet az API kvóták kímélése érdekében
                await sleep(4000);
            }
            console.log("AI elemzési és klaszterezési ciklus befejeződött!\n");
        }
    };
}