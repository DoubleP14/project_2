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
            Kérlek elemezd az alábbi hírt. Készíts egy 1-2 mondatos összefoglalót, és állapítsd meg a hangulatát (POZITIV, NEGATIV, SEMLEGES).
            A választ KIZÁRÓLAG egy ilyen JSON formátumban add vissza, semmi más szöveget ne írj:
            {"osszefoglalo": "...", "hangulat": "POZITIV"}

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