// src/lib/server/modules/aiModule.ts
import type { Services } from '../index';
import { decrypt } from '../crypto';
import { KATEGORIA_SZOTAR, illeszkedoKategoria } from '$lib/kategoriak';
import { modellValasztas } from '$lib/aiModellek';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Egy futás alatt felhasználónként legfeljebb ennyi hír kerül elemzésre
const ELEMZESI_LIMIT = 10;

// Témakör alapú riasztás csak ennél a hírértéknél (vagy felette) indul
const TEMAKOR_RIASZTASI_KUSZOB = 71;

// Ennyi egymást követő hiba után leáll az adott felhasználó elemzése (pl. hibás kulcsnál felesleges tovább próbálkozni)
const MAX_EGYMAS_UTANI_HIBA = 3;

// Szünet a cikkek között az API sebességkorlátok kímélésére (sikeres hívás után hosszabb)
const SZUNET_SIKER_MS = 4000;
const SZUNET_HIBA_MS = 1000;

export type ElemzesStatisztika = { sikeres: number; hibas: number; kihagyva: boolean };

// A szolgáltatók kulcsainak jellemző előtagja – a leggyakoribb hiba, hogy a kulcs nem a kiválasztott szolgáltatóhoz tartozik
const KULCS_ELOTAGOK: Record<string, string[]> = {
    GROQ: ['gsk_'],
    OPENAI: ['sk-'],
    ANTHROPIC: ['sk-ant-'],
    GOOGLE: ['AIza']
};
const kulcsSzolgaltatoTipp = (provider: string, apiKey: string): string => {
    const elvart = KULCS_ELOTAGOK[provider];
    // Az Anthropic kulcs is "sk-"-val kezdődik, ezért az OpenAI-nál külön kizárjuk
    const illeszkedik = elvart?.some(e => apiKey.startsWith(e)) && !(provider === 'OPENAI' && apiKey.startsWith('sk-ant-'));
    if (!elvart || illeszkedik) return '';
    const valoszinu = Object.entries(KULCS_ELOTAGOK).find(([p, e]) => p !== provider && e.some(x => apiKey.startsWith(x)))?.[0];
    return valoszinu
        ? ` Tipp: a megadott kulcs ${valoszinu} kulcsnak tűnik, de a beállított szolgáltató ${provider}.`
        : ` Tipp: a kulcs formátuma nem jellemző a(z) ${provider} szolgáltatóra – ellenőrizd a Beállításokban.`;
};

export function createAiModule(services: Services) {
    return {
        ujHirekFeldolgozasa: async (userId: number): Promise<ElemzesStatisztika> => {
            const stat: ElemzesStatisztika = { sikeres: 0, hibas: 0, kihagyva: false };

            // --- 1. KULCS VISSZAFEJTÉSE (Szigorú BYOK: csak a felhasználó saját kulcsa használható) ---
            const user = await services.db.felhasznalok.findUnique({ where: { id: userId } });

            if (!user || !user.api_key) {
                console.log(`A(z) ${userId}. felhasználónak nincs saját AI API kulcsa. AI elemzés kihagyva.`);
                return { ...stat, kihagyva: true };
            }

            const apiKey = decrypt(user.api_key);
            if (!apiKey) {
                console.log(`A(z) ${userId}. felhasználó API kulcsa nem fejthető vissza. AI elemzés kihagyva.`);
                await services.db.rendszerNaplo.create({
                    data: { felhasznalo_id: userId, esemeny_tipus: 'AI_ERROR', leiras: 'Az AI API kulcs nem fejthető vissza (megváltozott az ENCRYPTION_KEY?) – a kulcsot újra meg kell adni a Beállításokban.' }
                });
                return { ...stat, kihagyva: true };
            }

            // 4 AI szolgáltató kezelése: a felhasználó egyedi modellje, vagy a szolgáltató alapértelmezettje
            const { szolgaltato: provider, modell: valasztottModell } = modellValasztas(user.ai_provider, user.ai_modell);

            // --- 2. ÚJ HÍREK LEKÉRÉSE ---
            const hirek = await services.hirRepo.getFeldolgozatlanHirek(ELEMZESI_LIMIT, userId);

            if (hirek.length === 0) return stat;
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
            let egymasUtaniHibak = 0;
            let utolsoHibaUzenet = '';

            for (const [index, hir] of hirek.entries()) {
                let sikerult = false;
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
                    const aiEredmeny = await services.ai.hirElemzese(hir.cim, szoveg, provider, valasztottModell, apiKey);

                    // Sikertelen elemzést NEM mentünk el, így a hír a következő futáskor újra sorra kerül
                    if (aiEredmeny.hiba === 'QUOTA') {
                        console.warn('[AI] Kvóta kimerült, a ciklus leáll. A maradék hírek a következő futáskor kerülnek sorra.');
                        await services.db.rendszerNaplo.create({
                            data: { felhasznalo_id: userId, esemeny_tipus: 'AI_QUOTA', leiras: `Az AI szolgáltató kerete kimerült (${provider}), a maradék hírek a következő futáskor kerülnek sorra. ${aiEredmeny.hibaUzenet ?? ''}`.trim() }
                        });
                        break;
                    }
                    if (aiEredmeny.hiba) {
                        throw new Error(aiEredmeny.hibaUzenet || 'Az AI szolgáltató nem adott értékelhető választ.');
                    }

                    const clusterId = await services.ai.hírKlaszterezes(hir, frissKeszHirek, apiKey, provider, valasztottModell);

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

                    // Feliratkozott témakör: csak kiemelt hírértékű (71+) hírnél, hogy ne legyen spam
                    if (!riasztasOka && aiEredmeny.pontszam >= TEMAKOR_RIASZTASI_KUSZOB) {
                        const katId = illeszkedoKategoria(aiEredmeny.kulcsszavak, user.feliratkozott_kategoriak);
                        if (katId) {
                            riasztasOka = `Feliratkozott témakör (${KATEGORIA_SZOTAR[katId].nev})`;
                            ertesitesCimPrefix = "📌 KIEMELT TÉMA:";
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
                    
                    sikerult = true;
                } catch (error) {
                    console.error(`Hiba a '${hir.cim}' hír elemzésekor:`, error);
                    utolsoHibaUzenet = error instanceof Error ? error.message : String(error);

                    // AI elemzési hiba – a pontos okkal, hogy az Admin felületen is látható legyen
                    await services.db.rendszerNaplo.create({
                        data: {
                            felhasznalo_id: userId,
                            esemeny_tipus: 'AI_ERROR',
                            leiras: `Hiba a hír AI elemzésekor („${hir.cim.substring(0, 40)}…”): ${utolsoHibaUzenet.substring(0, 200)}`
                        }
                    });
                }

                if (sikerult) {
                    stat.sikeres++;
                    egymasUtaniHibak = 0;
                } else {
                    stat.hibas++;
                    egymasUtaniHibak++;

                    // Több egymást követő hiba: valószínűleg rendszerszintű ok (rossz kulcs, kivezetett modell) – leállunk
                    if (egymasUtaniHibak >= MAX_EGYMAS_UTANI_HIBA) {
                        const tipp = kulcsSzolgaltatoTipp(provider, apiKey);
                        console.warn(`[AI] ${MAX_EGYMAS_UTANI_HIBA} egymás utáni hiba, a(z) ${userId}. felhasználó elemzése leáll.`);
                        await services.db.rendszerNaplo.create({
                            data: {
                                felhasznalo_id: userId,
                                esemeny_tipus: 'AI_ABORT',
                                leiras: `${MAX_EGYMAS_UTANI_HIBA} egymás utáni hiba miatt az elemzés leállt (${provider}, ${valasztottModell}). Utolsó hiba: ${utolsoHibaUzenet.substring(0, 150)}.${tipp}`
                            }
                        });
                        break;
                    }
                }

                // Szünet az API kvóták kímélése érdekében (az utolsó cikk után nem várunk)
                if (index < hirek.length - 1) {
                    await sleep(sikerult ? SZUNET_SIKER_MS : SZUNET_HIBA_MS);
                }
            }
            console.log(`AI elemzési ciklus befejeződött: ${stat.sikeres} sikeres, ${stat.hibas} hibás.\n`);
            return stat;
        }
    };
}