// src/lib/server/services/aiService.ts
import OpenAI from 'openai';

export function createAiService(apiKey: string) {
    
    // Groq használata
    const openai = new OpenAI({ 
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1" 
    });

    return {
        // Llama 3 modelljének használata
        hirElemzese: async (szoveg: string, modell: string = "llama-3.1-8b-instant") => {
            
            const prompt = `
            Te egy profi magyar politikai és gazdasági elemző vagy.
            Feladatod az alábbi hír objektív elemzése. Készíts egy maximum 1-2 mondatos, lényegretörő összefoglalót.

            Ezután állapítsd meg a hír hangulatát (POZITIV, NEGATIV, SEMLEGES) az alábbi szigorú szabályok alapján:
            - NEGATIV: Ha a hír balesetről, bűncselekményről, háborúról, áremelkedésről szól, VAGY ha egy ország társadalmi/gazdasági mutatójában (pl. boldogságindex, GDP, versenyképesség) romlás, visszacsúszás történik, vagy ha a hír közpénzek vélelmezett pazarlásáról, botrányos állami költekezésről szól.
            - POZITIV: Ha gazdasági növekedés, tudományos áttörés, árcsökkenés, vagy egy rangsorban való előrelépés történik, vagy ha egy korábbi negatív állapotból (pl. tőzsdei beszakadásból) történő helyreállás, visszapattanás, javulás történik.
            - SEMLEGES: Tényszerű események (pl. egy találkozó létrejötte, menetrendi változás), amiknek nincs egyértelmű jó vagy rossz társadalmi hatása.

            A választ KIZÁRÓLAG egy érvényes JSON formátumban add vissza, semmi más magyarázó szöveget ne írj a JSON-ön kívül:
            {"osszefoglalo": "...", "hangulat": "NEGATIV"}

            A hír szövege:
            ${szoveg}
            `;

            const response = await openai.chat.completions.create({
                model: modell, 
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3 
            });

            const valasz = response.choices[0].message.content || "{}";
            return JSON.parse(valasz); 
        }
    };
}