// src/lib/server/services/aiService.ts
import OpenAI from 'openai';

export function createAiService(fallbackApiKey?: string) {
    
    const extractJsonFromText = (text: string) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Nem található érvényes JSON struktúra a válaszban.");
    };

    // --- 1. NATÍV GOOGLE (GEMINI) HÍVÁS ---
    const geminiFetch = async (prompt: string, apiKey: string): Promise<string> => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: { temperature: 0.3 }
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) return "UJ_TEMA"; 
            return data.candidates[0].content.parts[0].text;
        }

        if (response.status === 429) {
            console.warn("⚠️ Google API Kvóta kimerült (429)!");
            return "QUOTA_EXCEEDED";
        }

        const err = await response.text();
        throw new Error(`Google REST hiba (${response.status}): ${err}`);
    };

    // --- 2. NATÍV ANTHROPIC (CLAUDE) HÍVÁS ---
    const claudeFetch = async (prompt: string, apiKey: string, model: string): Promise<string> => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 1024,
                temperature: 0.3,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.content[0].text;
        }

        if (response.status === 429) {
            console.warn("⚠️ Claude API Kvóta kimerült (429)!");
            return "QUOTA_EXCEEDED";
        }

        const err = await response.text();
        throw new Error(`Claude REST hiba (${response.status}): ${err}`);
    };

    return {
        // --- A) HÍRELEMZŐ (TRUSTSCORE ÉS KULCSSZAVAK) ---
        hirElemzese: async (szoveg: string, modell: string, apiKey: string) => {
            const prompt = `
            Te egy profi magyar politikai, gazdasági elemző és főszerkesztő vagy.
            Feladatod az alábbi hír objektív elemzése. Négy dolgot kell visszadnod:

            1. Készíts egy maximum 1-2 mondatos, természetes és olvasmányos összefoglalót a hír tartalmáról. NE úgy fogalmazz, hogy "A cikk arról szól...", hanem közvetlenül és tényszerűen mondd el magát a hírt!
            
            2. Határozd meg a hangulatot (POZITIV, NEGATIV, SEMLEGES) az alábbi szigorú szabályok alapján:
                - NEGATIV: Baleset, bűncselekmény, háború, áremelkedés, romlás, pazarlás, botrány, természeti katasztrófa, forgalmi dugó, csúszás/késés (pl. játékoknál, filmeknél). KÖTELEZŐ SZABÁLY 1: Bármilyen haláleset, gyász, vagy emberi sérülés automatikusan NEGATIV! KÖTELEZŐ SZABÁLY 2: Ha az alapesemény rossz (pl. egy rendezvény elmaradása), akkor az egész hír NEGATIV, függetlenül az esetleges kárpótlástól!
                - POZITIV: Gazdasági növekedés, tudományos áttörés, árcsökkenés, javulás, üzleti vagy tőzsdei siker, sportgyőzelem, új beruházás.
                - SEMLEGES: Tényszerű események, sima bejelentések, pártpolitikai viták, általános törvényjavaslatok.

            3. HÍRÉRTÉK PONTOZÁSA (TrustScore: 0-100 között, csak egy számjegy):
                - 0-30 pont: Clickbait, pletyka, érdektelen bulvár, helyi kis balesetek/dugók, állatos és "cuki" (human interest) történetek, lottószámok, időjárás.
                - 31-70 pont: Napi szintű, normál hírek, lokális (egy várost/kerületet érintő) fejlesztések, ismert emberek halálhírei. KÖTELEZŐ SZABÁLY: Sportesemény, meccs eredménye SOHA nem kaphat 70 pontnál többet!
                - 71-100 pont: Kiemelkedő társadalmi események, országos horderejű törvényhozás (pl. új hivatalok alapítása), nagy nemzetközi konfliktusok, makrogazdasági beszakadások vagy ugrások.

            4. KULCSSZAVAK (Keywords):
                - Emelj ki 3-5 db specifikus kulcsszót a cikkből (pl. személyek, intézmények, fogalmak, cégnevek).
                - KÖTELEZŐ SZABÁLY 1 (Téma): A listába mindig, kivétel nélkül tedd bele a hír fő kategóriáját is (pl. politika, gazdaság, belföld, külföld, sport, bulvár, tech, gaming, film, kultúra)!
                - KÖTELEZŐ SZABÁLY 2 (Helyszín): A listába mindig tedd bele a földrajzi besorolást is, ami KIZÁRÓLAG "belföld" vagy "külföld" lehet!
                - Ha nincs egyértelmű kulcsszó, adj vissza egy üres listát.
                
            A válaszod KIZÁRÓLAG egy érvényes JSON objektum legyen, minden más szöveg nélkül!
            Formátum: {"osszefoglalo": "...", "hangulat": "POZITIV", "pontszam": 85, "kulcsszavak": ["kulcsszó1", "kulcsszó2"]}

            Hír szövege: 
            ${szoveg}
            `;

            const parseResponse = (parsedData: any) => {
                const biztosKulcsszavak = Array.isArray(parsedData.kulcsszavak) ? parsedData.kulcsszavak : [];
                return {
                    osszefoglalo: parsedData.osszefoglalo || "Nem sikerült az összefoglalót generálni.",
                    hangulat: parsedData.hangulat || "SEMLEGES",
                    pontszam: isNaN(Number(parsedData.pontszam)) ? 50 : Number(parsedData.pontszam),
                    kulcsszavak: biztosKulcsszavak
                };
            };

            try {
                let cleanText = "";

                if (modell.includes('gemini')) {
                    const text = await geminiFetch(prompt, apiKey);
                    if (text === "QUOTA_EXCEEDED") return { osszefoglalo: "A Google API ingyenes kerete kimerült.", hangulat: "SEMLEGES", pontszam: 0, kulcsszavak: [] };
                    cleanText = text;
                } else if (modell.includes('claude')) {
                    const text = await claudeFetch(prompt, apiKey, modell);
                    if (text === "QUOTA_EXCEEDED") return { osszefoglalo: "A Claude API kerete kimerült.", hangulat: "SEMLEGES", pontszam: 0, kulcsszavak: [] };
                    cleanText = text;
                } else {
                    const isGroq = modell.includes('llama');
                    const clientConfig: any = { apiKey: apiKey };
                    if (isGroq) clientConfig.baseURL = "https://api.groq.com/openai/v1";
                    
                    const openai = new OpenAI(clientConfig);
                    const response = await openai.chat.completions.create({
                        model: modell,
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" }
                    });
                    
                    cleanText = response.choices[0].message.content || "{}";
                }

                cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedData = extractJsonFromText(cleanText);
                return parseResponse(parsedData);

            } catch (error) {
                console.error(`Hiba a ${modell} válasz feldolgozásakor:`, error);
                return { osszefoglalo: "Nem sikerült az összefoglaló (API hiba).", hangulat: "SEMLEGES", pontszam: 0, kulcsszavak: [] };
            }
        },

        // --- B) KLASZTEREZŐ ---
        hírKlaszterezes: async (ujHir: any, frissHirek: any[], apiKey: string, provider: string) => {
            const fallbackClusterId = `cluster_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            if (frissHirek.length === 0) return fallbackClusterId;

            const hirekLista = frissHirek.map(h => `[ID: ${h.id}] Cím: ${h.cim}`).join('\n');
            const prompt = `
            Te egy profi főszerkesztő vagy. A feladatod, hogy megállapítsd, egy beérkező új hír ugyanarról az ESEMÉNYRŐL vagy TÉMÁRÓL szól-e, mint az alábbi listában szereplő friss hírek bármelyike.
            Nem a szavakat kell egyeztetned, hanem a JELENTÉST! (Pl. a "Csúszik a GTA 6" és a "Késik a Rockstar játéka" UGYANAZ a hír).

            Korábbi hírek:
            ${hirekLista}

            Új, beérkező hír címe:
            "${ujHir.cim}"

            VÁLASZADÁSI SZABÁLY:
            Ha az Új hír UGYANARRÓL szól, mint valamelyik a listából, írd le PONTOSAN ÉS CSAK annak a hírnek az ID számát (pl. 2904). 
            FONTOS: NE írd oda, hogy "ID:" vagy bármilyen más szöveget! Csak a puszta számot!
            Ha az Új hír egy teljesen új téma, és nincs párja a listában, válaszolj pontosan ezt a szót: UJ_TEMA.
            Semmi mást ne írj, ne indokolj!
            `;

            try {
                let valasz = "";

                if (provider === 'GOOGLE') {
                    valasz = await geminiFetch(prompt, apiKey);
                } else if (provider === 'ANTHROPIC') {
                    valasz = await claudeFetch(prompt, apiKey, 'claude-3-haiku-20240307');
                } else {
                    const isGroq = provider === 'GROQ';
                    const clientConfig: any = { apiKey: apiKey };
                    if (isGroq) clientConfig.baseURL = "https://api.groq.com/openai/v1";
                    
                    const openai = new OpenAI(clientConfig);
                    const modell = isGroq ? "llama-3.1-8b-instant" : "gpt-4o-mini";

                    const response = await openai.chat.completions.create({
                        model: modell,
                        messages: [{ role: "user", content: prompt }]
                    });
                    valasz = response.choices[0].message.content || "";
                }

                if (valasz === "QUOTA_EXCEEDED") return fallbackClusterId;

                valasz = valasz.trim().replace(/[^a-zA-Z0-9_]/g, '');
                
                if (valasz.includes('UJ_TEMA') || isNaN(Number(valasz))) {
                    return fallbackClusterId;
                } else {
                    const egyezoId = Number(valasz);
                    const egyezoHir = frissHirek.find(h => h.id === egyezoId);
                    return egyezoHir?.cluster_id || fallbackClusterId;
                }
            } catch (error) {
                return fallbackClusterId;
            }
        }
    };
}