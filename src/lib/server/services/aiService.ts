// src/lib/server/services/aiService.ts
import OpenAI from 'openai';

export function createAiService(fallbackApiKey?: string) {
    
    const extractJsonFromText = (text: string) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Nem található érvényes JSON struktúra a válaszban.");
    };

    // --- 2. NATÍV GOOGLE HÍVÁS ---
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

        // HA ELÉRTE A NAPI/PERCES KVÓTÁT (Nem vár, azonnal megszakítja!)
        if (response.status === 429) {
            console.warn("⚠️ Google API Kvóta kimerült (429)! A rendszer biztonsági módba kapcsol.");
            return "GOOGLE_QUOTA_EXCEEDED";
        }

        const err = await response.text();
        throw new Error(`Google REST hiba (${response.status}): ${err}`);
    };


    return {
        // --- A) HÍRELEMZŐ ---
        hirElemzese: async (szoveg: string, modell: string, apiKey: string) => {
            const prompt = `
            Te egy profi magyar politikai és gazdasági elemző vagy.
            Feladatod az alábbi hír objektív elemzése. Készíts egy maximum 1-2 mondatos összefoglalót és határozd meg a hangulatot (POZITIV, NEGATIV, SEMLEGES) az alábbi szigorú szabályok alapján:
            - NEGATIV: Baleset, bűncselekmény, háború, áremelkedés, romlás, pazarlás.
            - POZITIV: Gazdasági növekedés, tudományos áttörés, árcsökkenés, javulás.
            - SEMLEGES: Tényszerű események (pl. egy találkozó).
            
            A válaszod KIZÁRÓLAG egy érvényes JSON objektum legyen!
            Formátum: {"osszefoglalo": "...", "hangulat": "POZITIV/NEGATIV/SEMLEGES"}

            Hír szövege: 
            ${szoveg}
            `;

            if (modell.includes('gemini')) {
                try {
                    const text = await geminiFetch(prompt, apiKey);
                    
                    // Ha kifogyott a limitből, üzenetet tesz a kártyára!
                    if (text === "GOOGLE_QUOTA_EXCEEDED") {
                        return { osszefoglalo: "A Google API ingyenes kerete átmenetileg kimerült.", hangulat: "SEMLEGES" };
                    }

                    console.log(`DEBUG Gemini Nyers Válasz:`, text); 
                    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    return extractJsonFromText(cleanText);
                } catch (error) {
                    console.error("Hiba a Gemini válasz feldolgozásakor:", error);
                    return { osszefoglalo: "Nem sikerült az összefoglalót elkészíteni (Hálózati hiba).", hangulat: "SEMLEGES" };
                }
            } else {
                const openai = new OpenAI({ apiKey: apiKey, baseURL: "https://api.groq.com/openai/v1" });
                try {
                    const response = await openai.chat.completions.create({
                        model: modell,
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" }
                    });
                    return extractJsonFromText(response.choices[0].message.content || "{}");
                } catch (error) {
                    return { osszefoglalo: "Nem sikerült az összefoglalót elkészíteni (Groq hiba).", hangulat: "SEMLEGES" };
                }
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
            Ha az Új hír egy teljesen új téma, és nincs párja a listában, válaszolj pontosan ezt a szót: UJ_TEMA.
            Semmi mást ne írj, ne indokolj!
            `;

            try {
                if (provider === 'GOOGLE') {
                    const text = await geminiFetch(prompt, apiKey);
                    
                    // Ha limiten van, automatikusan új klaszterbe rakja, nem fagy le!
                    if (text === "GOOGLE_QUOTA_EXCEEDED") return fallbackClusterId;

                    const valasz = text.trim().replace(/[^a-zA-Z0-9_]/g, '');
                    if (valasz.includes('UJ_TEMA') || isNaN(Number(valasz))) {
                        return fallbackClusterId;
                    } else {
                        const egyezoId = Number(valasz);
                        const egyezoHir = frissHirek.find(h => h.id === egyezoId);
                        return egyezoHir?.cluster_id || fallbackClusterId;
                    }
                } else {
                    const openai = new OpenAI({ apiKey: apiKey, baseURL: "https://api.groq.com/openai/v1" });
                    const response = await openai.chat.completions.create({
                        model: "llama-3.1-8b-instant",
                        messages: [{ role: "user", content: prompt }]
                    });
                    const valasz = (response.choices[0].message.content || "").trim();
                    
                    if (valasz.includes('UJ_TEMA') || isNaN(Number(valasz))) return fallbackClusterId;
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