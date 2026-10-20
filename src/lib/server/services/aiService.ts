// src/lib/server/services/aiService.ts
import OpenAI from 'openai';
import { z } from 'zod';

// ==========================================
// ZOD TYPE-SAFE SÉMA AZ AI VÁLASZOKHOZ
// ==========================================
const AiValaszSchema = z.object({
    osszefoglalo: z.string().catch("Nem sikerült az összefoglalót generálni."),
    hangulat: z.enum(['POZITIV', 'NEGATIV', 'SEMLEGES']).catch('SEMLEGES'),
    // A coerce átalakítja a "85" (string) értéket 85 (szám) értékre. 
    // Ha az AI betűket ír (pl. "száz"), az hibára fut, és a catch(50) lép életbe.
    pontszam: z.coerce.number().min(0).max(100).catch(50),
    clickbait: z.coerce.number().min(0).max(100).catch(0),
    kulcsszavak: z.array(z.string()).catch([])
});

export function createAiService(fallbackApiKey?: string) {

    // Sikertelen elemzés eredménye: a hiba mező jelzi a hívónak, hogy NE mentse el,
    // így a hír a következő futáskor újra elemzésre kerül.
    // A hibaUzenet a szolgáltató tényleges hibaüzenete (pl. "401 Invalid API Key"), ez kerül a rendszernaplóba.
    const hibasEredmeny = (hiba: 'QUOTA' | 'API', osszefoglalo: string, hibaUzenet: string = osszefoglalo) => ({
        osszefoglalo,
        hangulat: 'SEMLEGES' as const,
        pontszam: 0,
        clickbait: 0,
        kulcsszavak: [] as string[],
        hiba,
        hibaUzenet: hibaUzenet.replace(/\s+/g, ' ').slice(0, 200)
    });

    const extractJsonFromText = (text: string) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Nem található érvényes JSON struktúra a válaszban.");
    };

    // --- 1. NATÍV GOOGLE (GEMINI) HÍVÁS ---
    const geminiFetch = async (prompt: string, apiKey: string, model: string): Promise<string> => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

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
            const parts = data.candidates?.[0]?.content?.parts;
            // Biztonsági szűrő miatt üres válasz (pl. finishReason: SAFETY)
            if (!parts || parts.length === 0) {
                throw new Error(`A Gemini nem adott szöveges választ (${data.candidates?.[0]?.finishReason ?? 'ismeretlen ok'}).`);
            }
            return parts.map((p: { text?: string }) => p.text ?? '').join('');
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
        // Az 5-ös generációs modellek (pl. claude-haiku-5-5) nem fogadják el a temperature paramétert,
        // a gondolkodás alapból be van kapcsolva – egyszerű JSON feladathoz alacsony effort elég.
        const ujGeneracio = /^claude-(haiku|sonnet|opus|fable)-5/.test(model);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 4096,
                ...(ujGeneracio ? { output_config: { effort: 'low' } } : { temperature: 0.3 }),
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.stop_reason === 'refusal') {
                throw new Error(`A Claude visszautasította a kérést (${data.stop_details?.category ?? 'ismeretlen kategória'}).`);
            }
            // A válasz gondolkodás (thinking) blokkokat is tartalmazhat – csak a szöveges blokkokat vesszük
            return (data.content ?? [])
                .filter((b: { type: string }) => b.type === 'text')
                .map((b: { text: string }) => b.text)
                .join('');
        }

        if (response.status === 429) {
            console.warn("⚠️ Claude API Kvóta kimerült (429)!");
            return "QUOTA_EXCEEDED";
        }

        const err = await response.text();
        throw new Error(`Claude REST hiba (${response.status}): ${err}`);
    };

    // --- 3. KÖZÖS HÍVÓ: a beállított SZOLGÁLTATÓ dönt (nem a modell nevéből találgatunk) ---
    // Visszatérés: a modell szöveges válasza, vagy "QUOTA_EXCEEDED"
    const aiHivas = async (provider: string, modell: string, apiKey: string, prompt: string, jsonValasz: boolean): Promise<string> => {
        if (provider === 'GOOGLE') return geminiFetch(prompt, apiKey, modell);
        if (provider === 'ANTHROPIC') return claudeFetch(prompt, apiKey, modell);

        // OpenAI és Groq (OpenAI-kompatibilis API)
        const openai = new OpenAI({
            apiKey,
            ...(provider === 'GROQ' ? { baseURL: 'https://api.groq.com/openai/v1' } : {})
        });
        const response = await openai.chat.completions.create({
            model: modell,
            messages: [{ role: 'user', content: prompt }],
            ...(jsonValasz ? { response_format: { type: 'json_object' as const } } : {})
        });
        return response.choices[0]?.message?.content ?? '';
    };

    return {
        // --- A) HÍRELEMZŐ (HÍRÉRTÉK, CLICKBAIT ÉS KULCSSZAVAK) ---
        hirElemzese: async (cim: string, szoveg: string, provider: string, modell: string, apiKey: string) => {
            const prompt = `
            Te egy profi magyar politikai, gazdasági elemző és főszerkesztő vagy.
            Feladatod az alábbi hír objektív elemzése. Öt dolgot kell visszadnod:

            1. Készíts egy maximum 1-2 mondatos, természetes és olvasmányos összefoglalót a hír tartalmáról. NE úgy fogalmazz, hogy "A cikk arról szól...", hanem közvetlenül és tényszerűen mondd el magát a hírt!
            
            2. Határozd meg a hangulatot (POZITIV, NEGATIV, SEMLEGES) az alábbi szigorú szabályok alapján:
                - NEGATIV: Baleset, bűncselekmény, háború, áremelkedés, romlás, pazarlás, botrány, természeti katasztrófa, forgalmi dugó, csúszás/késés (pl. játékoknál, filmeknél). KÖTELEZŐ SZABÁLY 1: Bármilyen haláleset, gyász, vagy emberi sérülés automatikusan NEGATIV! KÖTELEZŐ SZABÁLY 2: Ha az alapesemény rossz (pl. egy rendezvény elmaradása), akkor az egész hír NEGATIV, függetlenül az esetleges kárpótlástól!
                - POZITIV: Gazdasági növekedés, tudományos áttörés, árcsökkenés, javulás, üzleti vagy tőzsdei siker, sportgyőzelem, új beruházás.
                - SEMLEGES: Tényszerű események, sima bejelentések, pártpolitikai viták, általános törvényjavaslatok.

            3. HÍRÉRTÉK PONTOZÁSA (0-100 között, csak egy számjegy):
                - 0-30 pont: Clickbait, pletyka, érdektelen bulvár, helyi kis balesetek/dugók, állatos és "cuki" (human interest) történetek, lottószámok, időjárás.
                - 31-70 pont: Napi szintű, normál hírek, lokális (egy várost/kerületet érintő) fejlesztések, ismert emberek halálhírei. KÖTELEZŐ SZABÁLY: Sportesemény, meccs eredménye SOHA nem kaphat 70 pontnál többet!
                - 71-100 pont: Kiemelkedő társadalmi események, országos horderejű törvényhozás (pl. új hivatalok alapítása), nagy nemzetközi konfliktusok, makrogazdasági beszakadások vagy ugrások.

            4. KULCSSZAVAK (Keywords):
                - Emelj ki 3-5 db specifikus kulcsszót a cikkből (pl. személyek, intézmények, fogalmak, cégnevek).
                - KÖTELEZŐ SZABÁLY 1 (Téma): A listába mindig, kivétel nélkül tedd bele a hír fő kategóriáját is (pl. politika, gazdaság, belföld, külföld, sport, bulvár, tech, gaming, film, kultúra)!
                - KÖTELEZŐ SZABÁLY 2 (Helyszín): A listába mindig tedd bele a földrajzi besorolást is, ami KIZÁRÓLAG "belföld" vagy "külföld" lehet!
                - Ha nincs egyértelmű kulcsszó, adj vissza egy üres listát.

            5. CLICKBAIT RADAR (0-100): Értékeld, hogy a hír címe mennyire hatásvadász, túlzó vagy félrevezető a tényleges tartalomhoz képest!
                - 0-30: Teljesen tényszerű, objektív cím.
                - 31-70: Kicsit hatásvadász, érzelemkeltő, de még fedi a valóságot.
                - 71-100: Durva clickbait, "Nem fogod elhinni", hazug vagy erősen túlzó cím.
                
            A válaszod KIZÁRÓLAG egy érvényes JSON objektum legyen, minden más szöveg nélkül!
            Formátum: {"osszefoglalo": "...", "hangulat": "POZITIV", "pontszam": 85, "clickbait": 10, "kulcsszavak": ["kulcsszó1", "kulcsszó2"]}

            Hír címe: ${cim}
            Hír szövege: 
            ${szoveg}
            `;

            try {
                let cleanText = await aiHivas(provider, modell, apiKey, prompt, true);
                if (cleanText === "QUOTA_EXCEEDED") return hibasEredmeny('QUOTA', `A(z) ${provider} API kerete kimerült.`);

                cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedData = extractJsonFromText(cleanText);
                
                // TYPE-SAFE VALIDÁCIÓ ZOD-DAL (Ha hibázott az AI, a Zod kijavítja)
                return { ...AiValaszSchema.parse(parsedData), hiba: null, hibaUzenet: null };

            } catch (error) {
                console.error(`Hiba a ${modell} válasz feldolgozásakor (vagy Zod validációkor):`, error);
                // OpenAI-kompatibilis (OpenAI / Groq) kvótahiba felismerése
                const kvotaHiba = (error as any)?.status === 429;
                return hibasEredmeny(
                    kvotaHiba ? 'QUOTA' : 'API',
                    "Nem sikerült az összefoglaló (API hiba).",
                    error instanceof Error ? error.message : String(error)
                );
            }
        },

        // --- B) KLASZTEREZŐ ---
        hírKlaszterezes: async (ujHir: any, frissHirek: any[], apiKey: string, provider: string, modell: string) => {
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
                let valasz = await aiHivas(provider, modell, apiKey, prompt, false);

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