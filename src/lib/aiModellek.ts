// src/lib/aiModellek.ts
// Szolgáltatónkénti alapértelmezett AI modellek. A szolgáltatók gyakran vezetnek ki modelleket
// (pl. a Groq 2026 augusztusában a llama-3.1-8b-instant-ot), ezért a felhasználó a Beállításokban
// saját modellt is megadhat – ha nem ad meg, ezek az értékek érvényesek.
export const AI_SZOLGALTATOK = ['GROQ', 'OPENAI', 'GOOGLE', 'ANTHROPIC'] as const;
export type AiSzolgaltato = (typeof AI_SZOLGALTATOK)[number];

export const ALAPERTELMEZETT_MODELLEK: Record<AiSzolgaltato, string> = {
    GROQ: 'openai/gpt-oss-20b',
    OPENAI: 'gpt-4o-mini',
    GOOGLE: 'gemini-flash-lite-latest',
    ANTHROPIC: 'claude-haiku-5-5'
};

// Modellazonosító formai ellenőrzése (betű, szám, pont, kötőjel, aláhúzás, perjel, kettőspont)
export const ervenyesModellNev = (modell: string) => /^[A-Za-z0-9._\-/:]{1,100}$/.test(modell);

export const modellValasztas = (provider: string | null | undefined, sajatModell: string | null | undefined) => {
    const szolgaltato = (AI_SZOLGALTATOK as readonly string[]).includes(provider ?? '') ? (provider as AiSzolgaltato) : 'GROQ';
    const egyedi = sajatModell?.trim();
    return { szolgaltato, modell: egyedi && ervenyesModellNev(egyedi) ? egyedi : ALAPERTELMEZETT_MODELLEK[szolgaltato] };
};
